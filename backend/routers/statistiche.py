"""API degli indicatori mostrati nella dashboard dell'amministratore."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
from auth import richiedi_admin
from database import get_db
from services.statistiche_service import calcola_statistiche

router = APIRouter(prefix="/api", tags=["Area riservata"])


# GET /api/statistiche (solo amministratore)
@router.get("/statistiche", response_model=schemas.StatisticheResponse)
def leggi_statistiche(db: Session = Depends(get_db), _admin: str = Depends(richiedi_admin)):
    """Indicatori di sintesi su mostre, prenotazioni e feedback; il calcolo è nel servizio dedicato."""
    return calcola_statistiche(db)
