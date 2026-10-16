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


# API POST CONTATTI: la domanda del visitatore registrato arriva per email alla casella del museo
@router.post("")
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def invia_contatto(
    request: Request,
    dati: schemas.ContattoRequest,
    _utente: models.Utente = Depends(richiedi_utente),
):
    if not email_configurata():
        # in locale, senza servizio email, la richiesta viene scritta nel log per poter provare il modulo
        logger.warning(f"Email non configurata: richiesta Contatti non inviata a {settings.CONTATTI_EMAIL}: {dati}")
        return {"message": "Richiesta inviata. Ti risponderemo all'indirizzo email indicato."}
    # l'invio avviene subito (non in background) per poter avvisare l'utente se qualcosa non va
    if not invia_email_contatto(dati.model_dump()):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Al momento non è possibile inviare la richiesta. Riprova più tardi.",
        )
    return {"message": "Richiesta inviata. Ti risponderemo all'indirizzo email indicato."}
