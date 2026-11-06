"""API delle prenotazioni
Creazione prenotazione per il visitatore ed elenco e verifica all'ingresso per l'amministratore."""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
import settings
from auth import richiedi_admin, richiedi_utente
from database import get_db
from services.email_service import invia_email_background
from services.mostre_service import trova_mostra
from services.orario_service import adesso_utc, oggi
from services.prenotazioni_service import (
    genera_codice,
    genera_qr_png,
    normalizza_codice,
    stato_ingresso,
    trova_per_codice_o_id,
)

logger = logging.getLogger("uvicorn.error")

MESSAGGIO_GIA_ENTRATO = "L'ingresso è già stato registrato."

router = APIRouter(prefix="/api", tags=["Prenotazioni"])


# POST /api/prenota Accessibile solo ai visitatori registrati
@router.post("/prenota", status_code=status.HTTP_201_CREATED)
def crea_prenotazione(
    dati: schemas.PrenotazioneCreate,
    request: Request,
    # FastAPI fornisce una coda di attività da eseguire dopo aver inviato la risposta
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    # il visitatore viene ricavato dal token: non può prenotare a nome di altri
    utente: models.Utente = Depends(richiedi_utente),
):
    """`POST /api/prenota` · Salva la prenotazione con un codice di riferimento e invia l'email di conferma con il QR code.

    ERRO HTTPException:
        - 400 in caso di mostra terminata
        - 401 in caso di assenza del token visitatore
        - 404 in caso di mostra non trovata
        - 409 nel caso in cui il visitatore si sia già prenotato
    """
    mostra = trova_mostra(db, dati.mostra_id)

    # non si può prenotare una mostra terminata
    if mostra.data_fine < oggi():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra è già conclusa: non è più possibile prenotare."
        )

    # ogni visitatore può prenotare la mostra una sola volta
    gia_prenotato = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.mostra_id == mostra.id, models.Prenotazione.utente_id == utente.id)
        .first()
    )
    if gia_prenotato:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ti sei già prenotato a questa mostra.")

    try:
        # nome, cognome ed email vengono recuperati dall'account; il telefono può essere cambiato
        prenotazione = models.Prenotazione(
            mostra_id=mostra.id,
            utente_id=utente.id,
            nome=utente.nome,
            cognome=utente.cognome,
            email=utente.email,
            telefono=dati.telefono or utente.telefono,
            # codice casuale e unico da mostrare all'ingresso sotto forma di QR code
            codice=genera_codice(db),
        )
        db.add(prenotazione)
        db.commit()
        db.refresh(prenotazione)
    except IntegrityError as e:
        # In caso di due richieste contemporanee:
        # il controllo agisce su entrambe le richieste perche hanno un indice unico
        # uq_prenotazioni_utente_mostra del database accetta solo la prima prenotazione
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ti sei già prenotato a questa mostra.") from e
    except Exception as e:
        db.rollback()
        logger.error(f"Errore critico durante la prenotazione: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore interno durante l'elaborazione della prenotazione.",
        ) from e

    # l'email parte dopo la risposta 201 in backgroung
    # l'utente non aspetta i tempi del servizio di posta,
    # e se l'invio fallisce la prenotazione resta comunque salvata
    background_tasks.add_task(
        invia_email_background,
        destinatario=utente.email,
        nome=utente.nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine,
        codice=prenotazione.codice,
        # indirizzo del backend per l'immagine del QR code nell'email
        url_backend=settings.BACKEND_URL or str(request.base_url),
    )
    return {"message": "Prenotazione effettuata con successo!", "id": prenotazione.id, "codice": prenotazione.codice}


# GET /api/prenotazioni Accessibile solo lato area riservata admin
@router.get("/prenotazioni", response_model=list[schemas.PrenotazioneResponse])
def leggi_prenotazioni(
    mostra_id: Optional[int] = None,  # parametro facoltativo nell'URL: ?mostra_id=3
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """`GET /api/prenotazioni` Elenco delle prenotazioni, dalla più recente e filtrabile per mostra."""
    query = db.query(models.Prenotazione)
    if mostra_id is not None:
        query = query.filter(models.Prenotazione.mostra_id == mostra_id)
    return query.order_by(models.Prenotazione.creata_il.desc()).all()


# GET /api/prenotazioni/qr/{codice}
# L'immagine del QrCode viene inserita nell'email e nell'area personale dell'utenete registrato
@router.get(
    "/prenotazioni/qr/{codice}",
    response_class=Response,
    responses={200: {"content": {"image/png": {}}, "description": "Immagine PNG del QR code"}},
)
def qr_prenotazione(codice: str, db: Session = Depends(get_db)):
    """`GET /api/prenotazioni/qr/{codice}` Immagine PNG del QR code di una prenotazione

    Il QR code contiene solo l'indirizzo della pagina di verifica dell'area riservata, non contiene nessun dato personale;
    il codice generato è casuale.

    ERROR HTTPException
        - 404 se il codice viene trovato e non appartiene ad alcuna prenotazione
    """
    normalizzato = normalizza_codice(codice)
    trovata = (
        normalizzato is not None
        and db.query(models.Prenotazione.id).filter(models.Prenotazione.codice == normalizzato).first() is not None
    )
    if not trovata:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenotazione non trovata.")
    # il QR di un codice non cambia, il browser e i programmi di posta lo tengono in cache
    return Response(
        content=genera_qr_png(normalizzato),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


def _risultato_verifica(prenotazione: models.Prenotazione) -> dict:
    """Dati mostrati al personale: prenotazione, mostra e stato dell'ingresso."""
    mostra = prenotazione.mostra
    return {
        "id": prenotazione.id,
        "mostra_id": prenotazione.mostra_id,
        "nome": prenotazione.nome,
        "cognome": prenotazione.cognome,
        "email": prenotazione.email,
        "telefono": prenotazione.telefono,
        "creata_il": prenotazione.creata_il,
        "codice": prenotazione.codice,
        "ingresso_il": prenotazione.ingresso_il,
        "titolo_mostra": mostra.titolo,
        "data_inizio": mostra.data_inizio,
        "data_fine": mostra.data_fine,
        "stato": stato_ingresso(prenotazione, oggi()),
    }


def _trova_o_404(db: Session, riferimento: str) -> models.Prenotazione:
    """Prenotazione dal codice o dal numero;
    Restituito ERRORE 404 se non esiste la prenotazione"""
    prenotazione = trova_per_codice_o_id(db, riferimento)
    if prenotazione is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nessuna prenotazione trovata con questo codice.",
        )
    return prenotazione


# GET /api/prenotazioni/verifica/{riferimento} Disponibile solo per l'admin amministratore
@router.get("/prenotazioni/verifica/{riferimento}", response_model=schemas.VerificaPrenotazioneResponse)
def verifica_prenotazione(
    riferimento: str,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """`GET /api/prenotazioni/verifica/{riferimento}` Verifica una prenotazione all'ingresso del museo.

    Il riferimento della prenotazione può essere il codice univoco es. `MCD-7K3F-9QXA`
    oppure il numero della prenotazione.

    ERROR HTTPException:
        - 401 senza token admin
        - 404 se la prenotazione non viene trovata o non esiste
    """
    return _risultato_verifica(_trova_o_404(db, riferimento))


# POST /api/prenotazioni/verifica/{riferimento}/ingresso Disponibile solo per l'admin amministratore
@router.post("/prenotazioni/verifica/{riferimento}/ingresso", response_model=schemas.VerificaPrenotazioneResponse)
def registra_ingresso(
    riferimento: str,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """`POST /api/prenotazioni/verifica/{riferimento}/ingresso` · Registra l'ingresso del visitatore.

    Ogni prenotazione vale per un solo ingresso, e solo mentre la mostra è aperta. La registrazione è
    un UPDATE condizionato (`ingresso_il IS NULL`): anche con verifiche simultanee riesce una volta sola.

    ERROR HTTPException:
        - 400 se la mostra non è ancora iniziata o terminata
        - 401 in caso di assenza token admin
        - 404 se la prenotazione non esiste
        - 409 se l'ingresso è già stato registrato
    """
    prenotazione = _trova_o_404(db, riferimento)
    stato = stato_ingresso(prenotazione, oggi())
    if stato == "gia_entrato":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=MESSAGGIO_GIA_ENTRATO)
    if stato == "non_iniziata":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra non è ancora iniziata.")
    if stato == "conclusa":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra è già conclusa.")
    # Aggiornamento atomico: L'ingresso viene registrato una volta sola
    # il database scrive l'ingresso solo se è ancora vuoto
    # Se due operatori verificano lo stesso QR code nello stesso istante, entrambi leggerlo come valido
    # ma l'UPDATE si aggiorna una sola volta, chi viene registrato successivamente riceve 409
    aggiornate = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.id == prenotazione.id, models.Prenotazione.ingresso_il.is_(None))
        .update({models.Prenotazione.ingresso_il: adesso_utc()}, synchronize_session=False)
    )
    db.commit()
    if aggiornate == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=MESSAGGIO_GIA_ENTRATO)
    db.refresh(prenotazione)
    return _risultato_verifica(prenotazione)
