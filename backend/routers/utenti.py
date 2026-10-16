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
    invia_email_gia_registrato,
    invia_email_registrazione,
    invia_email_reset_password,
)
from services.rate_limit_service import limiter

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/utenti", tags=["Visitatori"])


MESSAGGIO_GIA_REGISTRATO = (
    "Utente già registrato: esiste già un account con questa email. Accedi oppure reimposta la password."
)


def _sessione(utente: models.Utente) -> dict:
    return {"access_token": crea_token(utente.email, ruolo="utente", utente_id=utente.id), "utente": utente}


# API POST REGISTRAZIONE (dopo la registrazione il visitatore è già collegato)
@router.post("/registrazione", response_model=schemas.SessioneUtenteResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def registrazione(
    request: Request,
    dati: schemas.RegistrazioneRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    esistente = db.query(models.Utente).filter(models.Utente.email == dati.email).first()
    if esistente:
        # una sola registrazione per email: errore a video + email di avviso al titolare dell'account
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
            password_hash=hash_password(dati.password),
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


# API POST LOGIN VISITATORE
@router.post("/login", response_model=schemas.SessioneUtenteResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login_utente(request: Request, dati: schemas.LoginRequest, db: Session = Depends(get_db)):
    email = dati.email.strip().lower()
    utente = db.query(models.Utente).filter(models.Utente.email == email).first()
    # stesso messaggio per email inesistente e password sbagliata: non si rivela quali email sono registrate
    if utente is None or not verifica_password(dati.password, utente.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o password errate.")
    return _sessione(utente)


def _indirizzo_frontend(request: Request) -> str:
    # il link punta allo stesso sito da cui è partita la richiesta, se è tra quelli autorizzati
    origine = (request.headers.get("origin") or "").rstrip("/")
    return origine if origine in settings.CORS_ORIGINS else settings.FRONTEND_URL


MESSAGGIO_RESET = "Se l'email è registrata riceverai a breve un link per reimpostare la password."


# API POST PASSWORD DIMENTICATA
@router.post("/password-dimenticata")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def password_dimenticata(
    request: Request,
    dati: schemas.PasswordDimenticataRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    utente = db.query(models.Utente).filter(models.Utente.email == dati.email).first()
    if utente is not None:
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


# API POST REIMPOSTA PASSWORD
@router.post("/reimposta-password")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def reimposta_password(request: Request, dati: schemas.ReimpostaPasswordRequest, db: Session = Depends(get_db)):
    utente = leggi_token_reset(dati.token, db)
    if utente is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Il link non è valido o è scaduto. Richiedi un nuovo link.",
        )
    utente.password_hash = hash_password(dati.password)
    db.commit()
    return {"message": "Password aggiornata. Ora puoi accedere con la nuova password."}


# API GET PROFILO
@router.get("/me", response_model=schemas.UtenteResponse)
def profilo(utente: models.Utente = Depends(richiedi_utente)):
    return utente


# API GET LE MIE PRENOTAZIONI
@router.get("/me/prenotazioni", response_model=list[schemas.MiaPrenotazioneResponse])
def mie_prenotazioni(utente: models.Utente = Depends(richiedi_utente), db: Session = Depends(get_db)):
    prenotazioni = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.utente_id == utente.id)
        .order_by(models.Prenotazione.creata_il.desc())
        .all()
    )
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


# API GET I MIEI FEEDBACK (serve al frontend per nascondere il form dove ho già recensito)
@router.get("/me/feedback", response_model=list[schemas.FeedbackResponse])
def miei_feedback(utente: models.Utente = Depends(richiedi_utente), db: Session = Depends(get_db)):
    return (
        db.query(models.Feedback)
        .filter(models.Feedback.utente_id == utente.id)
        .order_by(models.Feedback.creato_il.desc())
        .all()
    )
