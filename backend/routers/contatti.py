"""API del modulo Contatti: le domande dei visitatori registrati arrivano per email al museo."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

import models
import schemas
import settings
from auth import richiedi_utente
from services.email_service import email_configurata, invia_email_contatto
from services.rate_limit_service import limiter

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/contatti", tags=["Contatti"])


# POST /api/contatti: la domanda del visitatore registrato arriva per email alla casella del museo
# (indirizzo in settings.CONTATTI_EMAIL). Il limite ai tentativi evita invii a raffica.
@router.post("")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def invia_contatto(
    request: Request,
    dati: schemas.ContattoRequest,
    # solo i visitatori registrati possono scrivere: senza token valido la risposta è 401
    _utente: models.Utente = Depends(richiedi_utente),
):
    """`POST /api/contatti` · Inoltra la richiesta del visitatore alla casella del museo.

    Raises:
        HTTPException: 401 senza token visitatore; 422 per dati non validi;
            503 se il servizio email non riesce a inviarla.
    """
    if not email_configurata():
        # in locale, senza servizio email, la richiesta viene scritta nel log per poter provare il modulo
        logger.warning(f"Email non configurata: richiesta Contatti non inviata a {settings.CONTATTI_EMAIL}: {dati}")
        return {"message": "Richiesta inviata. Ti risponderemo all'indirizzo email indicato."}
    # l'invio avviene subito (non in background) per poter avvisare l'utente se qualcosa non va
    # model_dump() trasforma lo schema Pydantic in un dizionario con i campi del modulo
    if not invia_email_contatto(dati.model_dump()):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Al momento non è possibile inviare la richiesta. Riprova più tardi.",
        )
    return {"message": "Richiesta inviata. Ti risponderemo all'indirizzo email indicato."}
