"""Funzioni di supporto sulle mostre condivise dai router."""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas

# Funzioni sulle mostre usate da più router (mostre, prenotazioni e feedback)


def trova_mostra(db: Session, mostra_id: int) -> models.Mostra:
    """Restituisce la mostra con l'id indicato oppure risponde 404 se non esiste."""
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mostra non trovata")
    return mostra


def converti_date(data_inizio: str, data_fine: str) -> tuple[date, date]:
    """Controlla le date ricevute dal form e le restituisce come oggetti date."""
    try:
        return schemas.valida_date(data_inizio, data_fine)
    # stessa regola dello schema Pydantic, ma trasformata in errore HTTP 400 per i form multipart
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
