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
    leggi_token_reset,
    richiedi_utente,
    verifica_password,
)
from database import get_db
from services.email_service import (
    invia_email_annullamento,
    invia_email_gia_registrato,
    invia_email_registrazione,
    invia_email_reset_password,
)
from services.rate_limit_service import limiter

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/utenti", tags=["Visitatori"])


# messaggio mostrato a chi prova a registrarsi con un'email già presente
MESSAGGIO_GIA_REGISTRATO = (
    "Utente già registrato: esiste già un account con questa email. Accedi oppure reimposta la password."
)


def _sessione(utente: models.Utente) -> dict:
    """Risposta di accesso: token con ruolo "utente" e dati del profilo (usata da registrazione e login)."""
    return {"access_token": crea_token(utente.email, ruolo="utente", utente_id=utente.id), "utente": utente}


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
    """Crea l'account del visitatore (email unica) e invia l'email di benvenuto."""
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
    """Accesso del visitatore con email e password."""
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
    """Se l'email è registrata invia un link (valido pochi minuti, monouso) per scegliere una nuova password."""
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
    """Imposta la nuova password se il token è valido, non scaduto e non già usato."""
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
    """Dati del visitatore collegato (ricavato dal token)."""
    return utente


# GET /api/utenti/me/prenotazioni
@router.get("/me/prenotazioni", response_model=list[schemas.MiaPrenotazioneResponse])
def mie_prenotazioni(utente: models.Utente = Depends(richiedi_utente), db: Session = Depends(get_db)):
    """Prenotazioni del visitatore collegato, dalla più recente, con titolo e date della mostra."""
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
        }
        for p in prenotazioni
    ]


# GET /api/utenti/me/feedback (serve al frontend per nascondere il form dove ho già recensito)
@router.get("/me/feedback", response_model=list[schemas.FeedbackResponse])
def miei_feedback(utente: models.Utente = Depends(richiedi_utente), db: Session = Depends(get_db)):
    """Feedback lasciati dal visitatore collegato."""
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
    """Annulla una prenotazione del visitatore collegato; dopo l'annullamento può prenotare di nuovo."""
    # il filtro su utente_id garantisce che si possano annullare solo le proprie prenotazioni
    prenotazione = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.id == prenotazione_id, models.Prenotazione.utente_id == utente.id)
        .first()
    )
    # anche la prenotazione di un altro visitatore risulta "non trovata": non si rivela che esiste
    if prenotazione is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prenotazione non trovata.")
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
    return {"message": "Prenotazione annullata. Ti abbiamo inviato un'email di conferma."}
