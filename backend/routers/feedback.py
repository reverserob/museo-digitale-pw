import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import richiedi_admin, richiedi_utente
from database import get_db
from services.mostre_service import trova_mostra

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


# API POST FEEDBACK
@router.post("", response_model=schemas.FeedbackResponse, status_code=status.HTTP_201_CREATED)
def crea_feedback(
    dati: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    utente: models.Utente = Depends(richiedi_utente),
):
    mostra = trova_mostra(db, dati.mostra_id)

    # si può recensire solo una mostra già aperta al pubblico
    if mostra.data_inizio > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La mostra non è ancora iniziata: potrai lasciare un feedback dopo la visita.",
        )

    # un solo feedback per visitatore su ogni mostra
    gia_presente = (
        db.query(models.Feedback)
        .filter(models.Feedback.mostra_id == mostra.id, models.Feedback.utente_id == utente.id)
        .first()
    )
    if gia_presente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Hai già lasciato un feedback su questa mostra."
        )

    try:
        feedback = models.Feedback(
            mostra_id=mostra.id,
            utente_id=utente.id,
            nome=f"{utente.nome} {utente.cognome[0].upper()}.",
            voto=dati.voto,
            commento=dati.commento,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante il salvataggio del feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile salvare il feedback."
        ) from e


# API GET FEEDBACK (pubblica: i commenti sono visibili nella pagina della mostra)
@router.get("", response_model=list[schemas.FeedbackResponse])
def leggi_feedback(mostra_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Feedback)
    if mostra_id is not None:
        query = query.filter(models.Feedback.mostra_id == mostra_id)
    return query.order_by(models.Feedback.creato_il.desc()).all()


# API DELETE FEEDBACK (moderazione da parte dell'admin)
@router.delete("/{feedback_id}")
def elimina_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    feedback = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if feedback is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback non trovato")
    db.delete(feedback)
    db.commit()
    return {"message": "Feedback eliminato"}
