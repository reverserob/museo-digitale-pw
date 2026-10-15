from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
from auth import richiedi_admin
from database import get_db
from services.statistiche_service import calcola_statistiche

router = APIRouter(prefix="/api", tags=["Area riservata"])


# API GET STATISTICHE (indicatori della dashboard admin)
@router.get("/statistiche", response_model=schemas.StatisticheResponse)
def leggi_statistiche(db: Session = Depends(get_db), _admin: str = Depends(richiedi_admin)):
    return calcola_statistiche(db)
