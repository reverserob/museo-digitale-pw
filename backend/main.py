"""Punto di ingresso del back-end: crea l'applicazione FastAPI e ne registra i componenti.

Avvio in locale:  uvicorn main:app --reload
"""

import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

import models
import settings
from database import engine
from routers import contatti, feedback, login, mostre, prenotazioni, statistiche, utenti
from services.error_service import errore_validazione
from services.migrazioni_service import aggiorna_schema
from services.rate_limit_service import limiter, troppe_richieste
from services.seed_service import inserisci_dati_iniziali

# uso lo stesso logger di Uvicorn, così i messaggi compaiono nel terminale e nei log di Render
logger = logging.getLogger("uvicorn.error")

# --- Preparazione del database all'avvio ---
# 1. crea le tabelle che non esistono ancora
models.Base.metadata.create_all(bind=engine)
# 2. aggiunge le colonne nuove ai database creati con versioni precedenti dell'applicazione
aggiorna_schema(engine)
# 3. se il catalogo è vuoto, inserisce le mostre dimostrative di data/mostre.json
inserisci_dati_iniziali()

# --- Avvisi di sicurezza: valori predefiniti che non devono restare in produzione ---
if settings.SECRET_KEY == "dev-secret-cambiami":
    logger.warning("SECRET_KEY non impostata: imposta un valore segreto nel file .env o su Render")
if settings.ADMIN_PASSWORD == "admin2026":
    logger.warning("Stai usando la password demo dell'area riservata (admin2026)")

# l'applicazione; il titolo compare nella documentazione automatica su /docs
app = FastAPI(title="Museo Civico Digitale - API")

# --- Limite ai tentativi di login ---
# slowapi conta le richieste per indirizzo IP; oltre il limite risponde 429 con un messaggio leggibile
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, troppe_richieste)

# --- File statici: le immagini delle mostre sono servite all'indirizzo /static/... ---
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# --- CORS: il browser può chiamare le API solo dalle origini del front-end autorizzate ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,  # niente cookie: l'autenticazione usa il token nell'header
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# --- Errori di validazione: trasformati in un unico messaggio leggibile dal front-end ---
app.add_exception_handler(RequestValidationError, errore_validazione)


# --- Router: ogni area funzionale ha il proprio file nella cartella routers/ ---
app.include_router(login.router)  # login dell'amministratore
app.include_router(utenti.router)  # account dei visitatori
app.include_router(mostre.router)  # catalogo delle mostre
app.include_router(prenotazioni.router)  # prenotazioni
app.include_router(feedback.router)  # opinioni dei visitatori
app.include_router(statistiche.router)  # indicatori della dashboard
app.include_router(contatti.router)  # modulo Contatti
