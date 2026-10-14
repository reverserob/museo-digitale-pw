import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import richiedi_admin
from database import get_db
from services.immagini_service import file_presenti, salva_immagini
from services.mostre_service import converti_date, trova_mostra

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/mostre", tags=["Mostre"])


# API GET MOSTRE
@router.get("", response_model=list[schemas.MostraResponse])
def leggi_mostre(db: Session = Depends(get_db)):
    try:
        return db.query(models.Mostra).order_by(models.Mostra.data_inizio).all()
    except Exception as e:
        logger.error(f"Errore nel recupero delle mostre: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Errore nel recupero delle mostre dal database."
        ) from e


# API GET MOSTRE_ID
@router.get("/{mostra_id}", response_model=schemas.MostraResponse)
def leggi_singola_mostra(mostra_id: int, db: Session = Depends(get_db)):
    return trova_mostra(db, mostra_id)


# API POST MOSTRE
@router.post("", response_model=schemas.MostraResponse, status_code=status.HTTP_201_CREATED)
async def crea_mostra(
    titolo: str = Form(..., min_length=3, max_length=200),
    descrizione: str = Form(..., min_length=10),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    immagini: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    inizio, fine = converti_date(data_inizio, data_fine)
    file_validi = file_presenti(immagini)
    if not file_validi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Carica almeno un'immagine.")
    percorsi = await salva_immagini(file_validi)
    try:
        nuova_mostra = models.Mostra(
            titolo=titolo.strip(),
            descrizione=descrizione.strip(),
            data_inizio=inizio,
            data_fine=fine,
            immagini=",".join(percorsi),
        )
        db.add(nuova_mostra)
        db.commit()
        db.refresh(nuova_mostra)
        return nuova_mostra
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante la creazione della mostra: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile pubblicare la nuova mostra."
        ) from e


# API PUT MOSTRE
@router.put("/{mostra_id}", response_model=schemas.MostraResponse)
async def aggiorna_mostra(
    mostra_id: int,
    titolo: str = Form(..., min_length=3, max_length=200),
    descrizione: str = Form(..., min_length=10),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    immagini: Optional[list[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    mostra = trova_mostra(db, mostra_id)
    inizio, fine = converti_date(data_inizio, data_fine)
    file_validi = file_presenti(immagini)
    percorsi = await salva_immagini(file_validi) if file_validi else None
    try:
        mostra.titolo = titolo.strip()
        mostra.descrizione = descrizione.strip()
        mostra.data_inizio = inizio
        mostra.data_fine = fine
        if percorsi:
            mostra.immagini = ",".join(percorsi)
        db.commit()
        db.refresh(mostra)
        return mostra
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante l'aggiornamento della mostra {mostra_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile aggiornare la mostra."
        ) from e


# API DELETE MOSTRE
@router.delete("/{mostra_id}")
def elimina_mostra(
    mostra_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    mostra = trova_mostra(db, mostra_id)
    try:
        db.delete(mostra)  # elimina anche le prenotazioni collegate (cascade)
        db.commit()
        return {"message": "Mostra eliminata con successo"}
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante l'eliminazione della mostra {mostra_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile eliminare la mostra."
        ) from e
