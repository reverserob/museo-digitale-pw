from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from services.error_service import errore_validazione
from services.seed_service import inserisci_dati_iniziali

import models
import settings
from database import engine
from routers import login, mostre, prenotazioni

# Create default tables and seeding
models.Base.metadata.create_all(bind=engine)
inserisci_dati_iniziali()

# FastAPI declaration
app = FastAPI(title="Museo Civico Digitale - API")

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
