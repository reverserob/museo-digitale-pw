"""API delle prenotazioni: creazione da parte dei visitatori ed elenco per l'amministratore."""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import richiedi_admin, richiedi_utente
from database import get_db
from services.email_service import invia_email_background
from services.mostre_service import trova_mostra

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api", tags=["Prenotazioni"])


# POST /api/prenota (solo visitatori registrati)
@router.post("/prenota", status_code=status.HTTP_201_CREATED)
def crea_prenotazione(
    dati: schemas.PrenotazioneCreate,
    # FastAPI fornisce una coda di attività da eseguire dopo aver inviato la risposta
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    # il visitatore viene ricavato dal token: non può prenotare a nome di altri
    utente: models.Utente = Depends(richiedi_utente),
):
    """Salva la prenotazione con i dati dell'account e invia l'email di conferma in background."""
    mostra = trova_mostra(db, dati.mostra_id)

    # non si può prenotare una mostra già conclusa
    if mostra.data_fine < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra è già conclusa: non è più possibile prenotare."
        )

    # ogni visitatore può prenotarsi una sola volta a ciascuna mostra
    gia_prenotato = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.mostra_id == mostra.id, models.Prenotazione.utente_id == utente.id)
        .first()
    )
    if gia_prenotato:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ti sei già prenotato a questa mostra.")

    try:
        # nome, cognome ed email vengono copiati dall'account; il telefono può essere diverso
        prenotazione = models.Prenotazione(
            mostra_id=mostra.id,
            utente_id=utente.id,
            nome=utente.nome,
            cognome=utente.cognome,
            email=utente.email,
            telefono=dati.telefono or utente.telefono,
        )
        db.add(prenotazione)
        db.commit()
        db.refresh(prenotazione)
    except Exception as e:
        db.rollback()
        logger.error(f"Errore critico durante la prenotazione: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore interno durante l'elaborazione della prenotazione.",
        ) from e

    # l'email parte DOPO la risposta 201: l'utente non aspetta i tempi del servizio di posta,
    # e se l'invio fallisce la prenotazione resta comunque salvata
    background_tasks.add_task(
        invia_email_background,
        destinatario=utente.email,
        nome=utente.nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine,
    )
    return {"message": "Prenotazione effettuata con successo!", "id": prenotazione.id}


# GET /api/prenotazioni (solo amministratore)
@router.get("/prenotazioni", response_model=list[schemas.PrenotazioneResponse])
def leggi_prenotazioni(
    mostra_id: Optional[int] = None,  # parametro facoltativo nell'URL: ?mostra_id=3
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """Elenco delle prenotazioni, dalla più recente; filtrabile per mostra."""
    query = db.query(models.Prenotazione)
    if mostra_id is not None:
        query = query.filter(models.Prenotazione.mostra_id == mostra_id)
    return query.order_by(models.Prenotazione.creata_il.desc()).all()
