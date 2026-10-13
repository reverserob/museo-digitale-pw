import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status

import settings


def file_presenti(immagini: Optional[List[UploadFile]]) -> List[UploadFile]:
    return [f for f in (immagini or []) if f is not None and f.filename]


async def salva_immagini(immagini: List[UploadFile]) -> List[str]:
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
