import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import models
import schemas
import settings
from auth import crea_token, hash_password, richiedi_utente, verifica_password
from database import get_db
from services.rate_limit_service import limiter

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/utenti", tags=["Visitatori"])


def _sessione(utente: models.Utente) -> dict:
    return {"access_token": crea_token(utente.email, ruolo="utente", utente_id=utente.id), "utente": utente}


# API POST REGISTRAZIONE (dopo la registrazione il visitatore è già collegato)
@router.post("/registrazione", response_model=schemas.SessioneUtenteResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def registrazione(request: Request, dati: schemas.RegistrazioneRequest, db: Session = Depends(get_db)):
    if db.query(models.Utente).filter(models.Utente.email == dati.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esiste già un account con questa email.")
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
