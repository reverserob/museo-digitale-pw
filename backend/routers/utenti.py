"""API dei visitatori: registrazione, accesso, recupero password, profilo e prenotazioni personali."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

import models
import schemas
import settings
from auth import (
    crea_token,
    crea_token_reset,
    hash_password,
    impronta_password,
    leggi_token_reset,
    richiedi_admin,
    richiedi_utente,
    verifica_password,
)
from database import get_db
from services.email_service import (
    invia_email_account_eliminato,
    invia_email_annullamento,
    invia_email_gia_registrato,
    invia_email_registrazione,
    invia_email_reset_password,
)
from services.rate_limit_service import limiter
from services.utenti_service import aggiorna_profilo, elimina_account, riepilogo

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/utenti", tags=["Visitatori"])


# messaggio mostrato a chi prova a registrarsi con un'email già presente
MESSAGGIO_GIA_REGISTRATO = (
    "Utente già registrato: esiste già un account con questa email. Accedi oppure reimposta la password."
)


def _sessione(utente: models.Utente) -> dict:
    """Risposta di accesso: token con ruolo "utente" e dati del profilo (usata da registrazione e login)."""
    return {
        "access_token": crea_token(
            utente.email, ruolo="utente", utente_id=utente.id, impronta=impronta_password(utente)
        ),
        "utente": utente,
    }


# POST /api/utenti/registrazione (dopo la registrazione il visitatore è già collegato)
# Limite ai tentativi come per il login, per scoraggiare registrazioni automatiche a raffica.
@router.post("/registrazione", response_model=schemas.SessioneUtenteResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def registrazione(
    request: Request,
    dati: schemas.RegistrazioneRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """`POST /api/utenti/registrazione` · Crea l'account del visitatore (email unica) e invia l'email di benvenuto.

    Raises:
        HTTPException: 409 se l'email è già registrata (e il titolare riceve un avviso);
            422 per dati non validi; 429 oltre il limite di tentativi.
    """
    # l'email è già normalizzata (minuscolo, senza spazi) dal validatore dello schema
    esistente = db.query(models.Utente).filter(models.Utente.email == dati.email).first()
    if esistente:
        # una sola registrazione per email: errore a video + email di avviso al titolare dell'account.
        # Si usa JSONResponse (e non HTTPException) perché permette di allegare un'attività
        # in background che parte dopo l'invio della risposta 409.
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": MESSAGGIO_GIA_REGISTRATO},
            background=BackgroundTask(invia_email_gia_registrato, destinatario=esistente.email, nome=esistente.nome),
        )
    try:
        utente = models.Utente(
            nome=dati.nome,
            cognome=dati.cognome,
            email=dati.email,
            telefono=dati.telefono,
            password_hash=hash_password(dati.password),  # mai la password in chiaro, solo l'hash
        )
        db.add(utente)
        db.commit()
        db.refresh(utente)
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante la registrazione: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile completare la registrazione."
        ) from e
    # email di avvenuta registrazione, inviata dopo la risposta per non rallentarla
    background_tasks.add_task(invia_email_registrazione, destinatario=utente.email, nome=utente.nome)
    return _sessione(utente)


# POST /api/utenti/login
@router.post("/login", response_model=schemas.SessioneUtenteResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login_utente(request: Request, dati: schemas.LoginRequest, db: Session = Depends(get_db)):
    """`POST /api/utenti/login` · Accesso del visitatore con email e password.

    Raises:
        HTTPException: 401 se email o password sono errate (stesso messaggio in entrambi i casi).
    """
    email = dati.email.strip().lower()
    utente = db.query(models.Utente).filter(models.Utente.email == email).first()
    # stesso messaggio per email inesistente e password sbagliata: non si rivela quali email sono registrate
    if utente is None or not verifica_password(dati.password, utente.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o password errate.")
    return _sessione(utente)


def _indirizzo_frontend(request: Request) -> str:
    """Indirizzo del sito da usare nel link di reimpostazione della password."""
    # il link punta allo stesso sito da cui è partita la richiesta, se è tra quelli autorizzati
    origine = (request.headers.get("origin") or "").rstrip("/")
    return origine if origine in settings.CORS_ORIGINS else settings.FRONTEND_URL


# risposta identica in ogni caso, per non rivelare quali email sono registrate
MESSAGGIO_RESET = "Se l'email è registrata riceverai a breve un link per reimpostare la password."


# POST /api/utenti/password-dimenticata
@router.post("/password-dimenticata")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def password_dimenticata(
    request: Request,
    dati: schemas.PasswordDimenticataRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """`POST /api/utenti/password-dimenticata` · Se l'email è registrata invia un link (valido pochi minuti, monouso) per scegliere una nuova password."""
    utente = db.query(models.Utente).filter(models.Utente.email == dati.email).first()
    if utente is not None:
        # il token firmato viaggia come parametro dell'URL della pagina di reimpostazione
        link = f"{_indirizzo_frontend(request)}/reimposta-password?token={crea_token_reset(utente)}"
        background_tasks.add_task(
            invia_email_reset_password,
            destinatario=utente.email,
            nome=utente.nome,
            link=link,
            minuti=settings.RESET_PASSWORD_MINUTI,
        )
    # stessa risposta anche se l'email non esiste: non si rivela chi è registrato
    return {"message": MESSAGGIO_RESET}


# POST /api/utenti/reimposta-password
@router.post("/reimposta-password")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def reimposta_password(request: Request, dati: schemas.ReimpostaPasswordRequest, db: Session = Depends(get_db)):
    """`POST /api/utenti/reimposta-password` · Imposta la nuova password se il token è valido, non scaduto e non già usato.

    Raises:
        HTTPException: 400 se il link non è valido o è scaduto; 422 se la password non rispetta le regole.
    """
    # leggi_token_reset restituisce None se il token è falsificato, scaduto o già usato
    utente = leggi_token_reset(dati.token, db)
    if utente is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Il link non è valido o è scaduto. Richiedi un nuovo link.",
        )
    # cambiando l'hash cambia anche l'impronta contenuta nel token: lo stesso link non funziona più
    utente.password_hash = hash_password(dati.password)
    db.commit()
    return {"message": "Password aggiornata. Ora puoi accedere con la nuova password."}


# GET /api/utenti/me
@router.get("/me", response_model=schemas.UtenteResponse)
def profilo(utente: models.Utente = Depends(richiedi_utente)):
    """`GET /api/utenti/me` · Dati del visitatore collegato (ricavato dal token)."""
    return utente


# PUT /api/utenti/me
@router.put("/me", response_model=schemas.UtenteResponse)
def modifica_profilo(
    dati: schemas.ProfiloUpdateRequest,
    utente: models.Utente = Depends(richiedi_utente),
    db: Session = Depends(get_db),
):
    """`PUT /api/utenti/me` · Il visitatore collegato modifica nome, cognome e telefono (l'email resta invariata).

    Raises:
        HTTPException: 401 senza token valido; 422 se i dati non rispettano le regole della registrazione.
    """
    return aggiorna_profilo(db, utente, dati)


# DELETE /api/utenti/me (diritto alla cancellazione: serve la password per conferma)
@router.delete("/me")
def elimina_mio_account(
    dati: schemas.EliminaAccountRequest,
    background_tasks: BackgroundTasks,
    utente: models.Utente = Depends(richiedi_utente),
    db: Session = Depends(get_db),
):
    """`DELETE /api/utenti/me` · Il visitatore elimina il proprio account dopo aver confermato la password.

    Le prenotazioni non ancora usate vengono annullate; quelle già usate per l'ingresso restano anonime.
    Dopo la risposta parte l'email di conferma dell'eliminazione.

    Raises:
        HTTPException: 400 se la password non è corretta (non 401, che chiuderebbe la sessione nel front-end).
    """
    if not verifica_password(dati.password, utente.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password errata.")
    # email e nome vanno letti prima: dopo l'eliminazione l'account non esiste più
    email, nome = utente.email, utente.nome
    esito = elimina_account(db, utente)
    background_tasks.add_task(
        invia_email_account_eliminato,
        destinatario=email,
        nome=nome,
        prenotazioni_annullate=esito["prenotazioni_annullate"],
    )
    return {"message": "Account eliminato. Riceverai a breve un'email di conferma.", **esito}


# GET /api/utenti/me/prenotazioni
@router.get("/me/prenotazioni", response_model=list[schemas.MiaPrenotazioneResponse])
def mie_prenotazioni(utente: models.Utente = Depends(richiedi_utente), db: Session = Depends(get_db)):
    """`GET /api/utenti/me/prenotazioni` · Prenotazioni del visitatore collegato, dalla più recente, con titolo e date della mostra."""
    prenotazioni = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.utente_id == utente.id)
        .order_by(models.Prenotazione.creata_il.desc())
        .all()
    )
    # per ogni prenotazione aggiungo i dati della mostra (letti tramite la relazione p.mostra)
    return [
        {
            "id": p.id,
            "mostra_id": p.mostra_id,
            "titolo_mostra": p.mostra.titolo,
            "data_inizio": p.mostra.data_inizio,
            "data_fine": p.mostra.data_fine,
            "creata_il": p.creata_il,
            "codice": p.codice,
            "ingresso_il": p.ingresso_il,
        }
        for p in prenotazioni
    ]


# GET /api/utenti/me/feedback (serve al frontend per nascondere il form dove ho già recensito)
@router.get("/me/feedback", response_model=list[schemas.FeedbackResponse])
def miei_feedback(utente: models.Utente = Depends(richiedi_utente), db: Session = Depends(get_db)):
    """`GET /api/utenti/me/feedback` · Feedback lasciati dal visitatore collegato."""
    return (
        db.query(models.Feedback)
        .filter(models.Feedback.utente_id == utente.id)
        .order_by(models.Feedback.creato_il.desc())
        .all()
    )


# DELETE /api/utenti/me/prenotazioni/{id} (con email di conferma dell'annullamento)
@router.delete("/me/prenotazioni/{prenotazione_id}")
def annulla_prenotazione(
    prenotazione_id: int,
    background_tasks: BackgroundTasks,
    utente: models.Utente = Depends(richiedi_utente),
    db: Session = Depends(get_db),
):
    """`DELETE /api/utenti/me/prenotazioni/{prenotazione_id}` · Annulla una prenotazione del visitatore collegato; dopo l'annullamento può prenotare di nuovo.

    Raises:
        HTTPException: 404 se la prenotazione non esiste o appartiene a un altro visitatore;
            409 se è già stata usata per l'ingresso.
    """
    # il filtro su utente_id garantisce che si possano annullare solo le proprie prenotazioni
    prenotazione = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.id == prenotazione_id, models.Prenotazione.utente_id == utente.id)
        .first()
    )
    # anche la prenotazione di un altro visitatore risulta "non trovata": non si rivela che esiste
    if prenotazione is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenotazione non trovata.")
    # una prenotazione già usata per entrare al museo resta nello storico
    if prenotazione.ingresso_il is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La prenotazione è già stata usata per l'ingresso e non può essere annullata.",
        )
    # salvo la mostra prima di eliminare la prenotazione: servono titolo e date per l'email
    mostra = prenotazione.mostra
    db.delete(prenotazione)
    db.commit()
    background_tasks.add_task(
        invia_email_annullamento,
        destinatario=utente.email,
        nome=utente.nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine,
    )
    return {"message": "Prenotazione annullata. Riceverai a breve un'email di conferma."}


# --- Gestione degli account dall'area riservata (solo amministratore) ---
# I percorsi usano {utente_id:int}: così "/api/utenti/me" non viene mai scambiato per un id.


def _trova_utente(db: Session, utente_id: int) -> models.Utente:
    """Account con l'id indicato, oppure errore 404."""
    utente = db.get(models.Utente, utente_id)
    if utente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utente non trovato.")
    return utente


# GET /api/utenti
@router.get("", response_model=list[schemas.UtenteAdminResponse], tags=["Area riservata"])
def elenco_utenti(_admin: str = Depends(richiedi_admin), db: Session = Depends(get_db)):
    """`GET /api/utenti` · Elenco degli account registrati, dal più recente, con numero di prenotazioni e feedback."""
    utenti = db.query(models.Utente).order_by(models.Utente.creato_il.desc()).all()
    return [riepilogo(u) for u in utenti]


# GET /api/utenti/{id}
@router.get("/{utente_id:int}", response_model=schemas.UtenteAdminResponse, tags=["Area riservata"])
def dettaglio_utente(utente_id: int, _admin: str = Depends(richiedi_admin), db: Session = Depends(get_db)):
    """`GET /api/utenti/{utente_id}` · Dati di un singolo account.

    Raises:
        HTTPException: 404 se l'account non esiste.
    """
    return riepilogo(_trova_utente(db, utente_id))


# PUT /api/utenti/{id}
@router.put("/{utente_id:int}", response_model=schemas.UtenteAdminResponse, tags=["Area riservata"])
def modifica_utente(
    utente_id: int,
    dati: schemas.ProfiloUpdateRequest,
    _admin: str = Depends(richiedi_admin),
    db: Session = Depends(get_db),
):
    """`PUT /api/utenti/{utente_id}` · L'amministratore corregge nome, cognome o telefono di un account.

    Raises:
        HTTPException: 404 se l'account non esiste; 422 per dati non validi.
    """
    utente = aggiorna_profilo(db, _trova_utente(db, utente_id), dati)
    return riepilogo(utente)


# DELETE /api/utenti/{id}
@router.delete("/{utente_id:int}", tags=["Area riservata"])
def elimina_utente(
    utente_id: int,
    background_tasks: BackgroundTasks,
    _admin: str = Depends(richiedi_admin),
    db: Session = Depends(get_db),
):
    """`DELETE /api/utenti/{utente_id}` · L'amministratore elimina un account (stesse regole dell'eliminazione dal profilo).

    Il titolare riceve l'email di conferma dell'eliminazione.

    Raises:
        HTTPException: 404 se l'account non esiste.
    """
    utente = _trova_utente(db, utente_id)
    email, nome = utente.email, utente.nome
    esito = elimina_account(db, utente)
    background_tasks.add_task(
        invia_email_account_eliminato,
        destinatario=email,
        nome=nome,
        prenotazioni_annullate=esito["prenotazioni_annullate"],
        da_amministratore=True,
    )
    return {"message": "Account eliminato.", **esito}
