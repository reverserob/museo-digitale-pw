"""Immagini delle mostre salvate nel database, servite come file pubblici."""

import re

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter(prefix="/api/immagini", tags=["Mostre"])

# solo nomi generati dal server: 32 caratteri esadecimali (uuid) + estensione ammessa
NOME_VALIDO = re.compile(r"[0-9a-f]{32}\.(jpg|jpeg|png|webp|gif)")


# GET /api/immagini/{nome}
@router.get("/{nome}", response_class=Response)
def leggi_immagine(nome: str, db: Session = Depends(get_db)):
    """`GET /api/immagini/{nome}` · Restituisce un'immagine caricata dall'area riservata.

    Il nome è casuale e non cambia mai, quindi il browser può conservare l'immagine in cache a lungo.

    Raises:
        HTTPException: 404 se il nome non è valido o l'immagine non esiste.
    """
    if not NOME_VALIDO.fullmatch(nome):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Immagine non trovata.")
    immagine = db.query(models.Immagine).filter(models.Immagine.nome == nome).first()
    if immagine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Immagine non trovata.")
    return Response(
        content=immagine.dati,
        media_type=immagine.tipo,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
