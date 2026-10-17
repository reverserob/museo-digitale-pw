"""API del catalogo: lettura pubblica delle mostre e gestione (creazione, modifica, eliminazione) per l'amministratore."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import richiedi_admin
from database import get_db
from services.immagini_service import file_presenti, immagini_da_tenere, salva_immagini
from services.mostre_service import converti_date, trova_mostra

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/api/mostre", tags=["Mostre"])


# GET /api/mostre (pubblica)
@router.get("", response_model=list[schemas.MostraResponse])
def leggi_mostre(db: Session = Depends(get_db)):
    """`GET /api/mostre` · Elenco di tutte le mostre, ordinate per data di inizio."""
    try:
        return db.query(models.Mostra).order_by(models.Mostra.data_inizio).all()
    except Exception as e:
        # errore inatteso del database: lo registro nel log e rispondo con un messaggio generico
        logger.error(f"Errore nel recupero delle mostre: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Errore nel recupero delle mostre dal database."
        ) from e


# GET /api/mostre/{id} (pubblica)
@router.get("/{mostra_id}", response_model=schemas.MostraResponse)
def leggi_singola_mostra(mostra_id: int, db: Session = Depends(get_db)):
    """`GET /api/mostre/{mostra_id}` · Dettaglio di una mostra (404 se non esiste)."""
    return trova_mostra(db, mostra_id)


# POST /api/mostre (solo amministratore)
# I dati arrivano come form-data (multipart) e non come JSON, perché insieme ai campi
# di testo vengono inviati i file delle immagini. Form(...) indica un campo obbligatorio;
# min_length e max_length vengono controllati da FastAPI prima di eseguire la funzione.
# La funzione è "async" perché la lettura dei file caricati è un'operazione di I/O asincrona.
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
    """`POST /api/mostre` · Pubblica una nuova mostra con una o più immagini (solo amministratore).

    Raises:
        HTTPException: 400 per date non valide o immagini mancanti/non valide;
            401 senza token admin; 422 per campi del form non validi.
    """
    inizio, fine = converti_date(data_inizio, data_fine)
    # ignoro eventuali campi file vuoti inviati dal browser
    file_validi = file_presenti(immagini)
    if not file_validi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Carica almeno un'immagine.")
    # salva i file su disco (dopo i controlli su tipo e dimensione) e restituisce i loro percorsi
    percorsi = await salva_immagini(file_validi)
    try:
        nuova_mostra = models.Mostra(
            titolo=titolo.strip(),
            descrizione=descrizione.strip(),
            data_inizio=inizio,
            data_fine=fine,
            immagini=",".join(percorsi),  # nel database salvo solo i percorsi, separati da virgola
        )
        db.add(nuova_mostra)
        db.commit()
        db.refresh(nuova_mostra)  # ricarica l'oggetto per avere l'id assegnato dal database
        return nuova_mostra
    except Exception as e:
        db.rollback()  # annulla la transazione: nel database non resta nulla a metà
        logger.error(f"Errore durante la creazione della mostra: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile pubblicare la nuova mostra."
        ) from e


# PUT /api/mostre/{id} (solo amministratore)
@router.put("/{mostra_id}", response_model=schemas.MostraResponse)
async def aggiorna_mostra(
    mostra_id: int,
    titolo: str = Form(..., min_length=3, max_length=200),
    descrizione: str = Form(..., min_length=10),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    # nuove immagini da aggiungere (facoltative)
    immagini: Optional[list[UploadFile]] = File(None),
    # elenco JSON delle immagini già salvate da mantenere; se manca le teniamo tutte
    immagini_esistenti: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """`PUT /api/mostre/{mostra_id}` · Modifica una mostra: mantiene le immagini scelte e aggiunge quelle nuove (solo amministratore).

    Raises:
        HTTPException: 400 per date non valide o se la mostra resterebbe senza immagini;
            401 senza token admin; 404 se la mostra non esiste.
    """
    mostra = trova_mostra(db, mostra_id)
    inizio, fine = converti_date(data_inizio, data_fine)
    da_tenere = immagini_da_tenere(mostra.immagini, immagini_esistenti)
    file_validi = file_presenti(immagini)
    # una mostra senza immagini non è ammessa
    if not da_tenere and not file_validi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra deve avere almeno un'immagine.")
    nuovi_percorsi = await salva_immagini(file_validi) if file_validi else []
    try:
        mostra.titolo = titolo.strip()
        mostra.descrizione = descrizione.strip()
        mostra.data_inizio = inizio
        mostra.data_fine = fine
        # prima le immagini mantenute (nell'ordine attuale), poi quelle nuove
        mostra.immagini = ",".join(da_tenere + nuovi_percorsi)
        db.commit()
        db.refresh(mostra)
        return mostra
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante l'aggiornamento della mostra {mostra_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile aggiornare la mostra."
        ) from e


# DELETE /api/mostre/{id} (solo amministratore)
@router.delete("/{mostra_id}")
def elimina_mostra(
    mostra_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    """`DELETE /api/mostre/{mostra_id}` · Elimina una mostra insieme alle sue prenotazioni e ai suoi feedback (solo amministratore).

    Raises:
        HTTPException: 401 senza token admin; 404 se la mostra non esiste.
    """
    mostra = trova_mostra(db, mostra_id)
    try:
        db.delete(mostra)  # elimina anche prenotazioni e feedback collegati (cascade)
        db.commit()
        return {"message": "Mostra eliminata con successo"}
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante l'eliminazione della mostra {mostra_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile eliminare la mostra."
        ) from e
