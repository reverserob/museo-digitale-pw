import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

import models
import settings
from database import engine
from routers import feedback, login, mostre, prenotazioni, statistiche
from services.error_service import errore_validazione
from services.rate_limit_service import limiter, troppe_richieste
from services.seed_service import inserisci_dati_iniziali

logger = logging.getLogger("uvicorn.error")

# Create default tables and seeding
models.Base.metadata.create_all(bind=engine)
inserisci_dati_iniziali()

# IMPORTANT LOGS
if settings.SECRET_KEY == "dev-secret-cambiami":
    logger.warning("SECRET_KEY non impostata: imposta un valore segreto nel file .env o su Render")
if settings.ADMIN_PASSWORD == "admin2026":
    logger.warning("Stai usando la password demo dell'area riservata (admin2026)")

# FastAPI declaration
app = FastAPI(title="Museo Civico Digitale - API")

# login try limit
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, troppe_richieste)

# Static Dir images
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# CORS CONFIG
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# Error Handler SERVICE
app.add_exception_handler(RequestValidationError, errore_validazione)


# Routers API SERVICES
app.include_router(login.router)
app.include_router(mostre.router)
app.include_router(prenotazioni.router)
app.include_router(feedback.router)
app.include_router(statistiche.router)
