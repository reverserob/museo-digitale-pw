import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status

import settings


def file_presenti(immagini: Optional[list[UploadFile]]) -> list[UploadFile]:
    return [f for f in (immagini or []) if f is not None and f.filename]


def immagini_da_tenere(attuali: str, richieste: Optional[str]) -> list[str]:
    elenco_attuale = [p.strip() for p in (attuali or "").split(",") if p.strip()]
    if richieste is None:
        return elenco_attuale
    try:
        elenco_richiesto = json.loads(richieste)
        if not isinstance(elenco_richiesto, list):
            raise ValueError
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Elenco delle immagini da mantenere non valido."
        ) from None
    consentiti = set(elenco_attuale)
    tenute = []
    for p in elenco_richiesto:
        if isinstance(p, str) and p in consentiti and p not in tenute:
            tenute.append(p)
    return tenute


async def salva_immagini(immagini: list[UploadFile]) -> list[str]:
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    da_scrivere = []
    for file in immagini:
        estensione = Path(file.filename).suffix.lower()
        if estensione not in settings.ESTENSIONI_IMMAGINI or not (file.content_type or "").startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Il file '{file.filename}' non è un'immagine supportata (jpg, png, webp, gif).",
            )
        contenuto = await file.read()
        if len(contenuto) > limite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Il file '{file.filename}' supera il limite di {settings.UPLOAD_MAX_MB} MB.",
            )
        da_scrivere.append((f"{uuid.uuid4().hex}{estensione}", contenuto))

    percorsi = []
    for nome, contenuto in da_scrivere:
        (settings.UPLOAD_DIR / nome).write_bytes(contenuto)
        percorsi.append(f"/static/uploads/{nome}")
    return percorsi
