import logging
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import richiedi_admin
from database import get_db
from routers.mostre import trova_mostra
from services.email_service import invia_email_background

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api", tags=["Prenotazioni"])


# API POST PRENOTAZIONE
@router.post("/prenota", status_code=status.HTTP_201_CREATED)
def crea_prenotazione(
    dati: schemas.PrenotazioneCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    mostra = trova_mostra(db, dati.mostra_id)

    if date.fromisoformat(mostra.data_fine) < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra è già conclusa: non è più possibile prenotare.")

    try:
        prenotazione = models.Prenotazione(
            mostra_id=mostra.id,
            nome=dati.nome,
            cognome=dati.cognome,
            email=dati.email,
            telefono=dati.telefono,
        )
        db.add(prenotazione)
        db.commit()
        db.refresh(prenotazione)
    except Exception as e:
        db.rollback()
        logger.error(f"Errore critico durante la prenotazione: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Errore interno durante l'elaborazione della prenotazione.")

    background_tasks.add_task(
        invia_email_background,
        destinatario=dati.email,
        nome=dati.nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine,
    )
    return {"message": "Prenotazione effettuata con successo!", "id": prenotazione.id}


# API GET PRENOTAZIONI
@router.get("/prenotazioni", response_model=List[schemas.PrenotazioneResponse])
def leggi_prenotazioni(
    mostra_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    query = db.query(models.Prenotazione)
    if mostra_id is not None:
        query = query.filter(models.Prenotazione.mostra_id == mostra_id)
    return query.order_by(models.Prenotazione.creata_il.desc()).all()
