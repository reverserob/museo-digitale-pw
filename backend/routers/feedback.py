"""API dei feedback: lettura pubblica, invio da parte dei visitatori prenotati, moderazione dell'amministratore."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from auth import richiedi_admin, richiedi_utente
from database import get_db
from services.mostre_service import trova_mostra
from services.orario_service import oggi

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


# POST /api/feedback (solo visitatori registrati)
@router.post("", response_model=schemas.FeedbackResponse, status_code=status.HTTP_201_CREATED)
def crea_feedback(
    dati: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    utente: models.Utente = Depends(richiedi_utente),
):
    """`POST /api/feedback` · Salva il feedback dopo aver controllato le regole del museo.

    Raises:
        HTTPException: 400 se la mostra non è ancora iniziata; 401 senza token visitatore;
            403 se il visitatore non è prenotato; 404 se la mostra non esiste;
            409 se ha già lasciato un feedback.
    """
    mostra = trova_mostra(db, dati.mostra_id)

    # si può recensire solo una mostra già aperta al pubblico
    if mostra.data_inizio > oggi():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La mostra non è ancora iniziata: potrai lasciare un feedback dopo la visita.",
        )

    # può lasciare un feedback solo chi si è prenotato a questa mostra
    prenotato = (
        db.query(models.Prenotazione)
        .filter(models.Prenotazione.mostra_id == mostra.id, models.Prenotazione.utente_id == utente.id)
        .first()
    )
    if prenotato is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Puoi lasciare un feedback solo sulle mostre a cui ti sei prenotato.",
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
            # nome pubblico: nome e iniziale del cognome (minimizzazione dei dati personali)
            nome=f"{utente.nome} {utente.cognome[0].upper()}.",
            voto=dati.voto,
            commento=dati.commento,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback
    except IntegrityError as e:
        # due invii contemporanei: l'indice unico uq_feedback_utente_mostra accetta solo il primo
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Hai già lasciato un feedback su questa mostra."
        ) from e
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante il salvataggio del feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile salvare il feedback."
        ) from e


# GET /api/feedback (pubblica: i commenti sono visibili nella pagina della mostra)
@router.get("", response_model=list[schemas.FeedbackResponse])
def leggi_feedback(mostra_id: Optional[int] = None, db: Session = Depends(get_db)):
    """`GET /api/feedback` · Elenco dei feedback, dal più recente; filtrabile per mostra con ?mostra_id=."""
    query = db.query(models.Feedback)
    if mostra_id is not None:
        query = query.filter(models.Feedback.mostra_id == mostra_id)
    return query.order_by(models.Feedback.creato_il.desc()).all()


# DELETE /api/feedback/{id} (moderazione da parte dell'admin)
@router.delete("/{feedback_id}")
def elimina_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """`DELETE /api/feedback/{feedback_id}` · Elimina un feedback non appropriato."""
    feedback = db.query(models.Feedback).filter(models.Feedback.id == feedback_id).first()
    if feedback is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback non trovato")
    db.delete(feedback)
    db.commit()
    return {"message": "Feedback eliminato"}
