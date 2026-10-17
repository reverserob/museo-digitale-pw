"""Gestione delle immagini delle mostre: controllo, salvataggio su disco e selezione di quelle da mantenere."""

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status

import settings


def file_presenti(immagini: Optional[list[UploadFile]]) -> list[UploadFile]:
    """Scarta i campi file vuoti (senza nome) che il browser può inviare quando non si sceglie nulla.

    Args:
        immagini: File ricevuti dal form, oppure None.

    Returns:
        Solo i file effettivamente caricati.
    """
    return [f for f in (immagini or []) if f is not None and f.filename]


def immagini_da_tenere(attuali: str, richieste: Optional[str]) -> list[str]:
    """Restituisce le immagini già salvate che l'amministratore ha scelto di mantenere.

    Sono accettati solo percorsi che appartengono già alla mostra, senza duplicati.

    Args:
        attuali: Percorsi salvati nel database, separati da virgola.
        richieste: Elenco JSON inviato dal form di modifica (None = mantieni tutte).

    Returns:
        Percorsi da mantenere, nell'ordine richiesto.

    Raises:
        HTTPException: 400 se `richieste` non è un elenco JSON valido.
    """
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
    # accetto solo percorsi che appartengono già alla mostra (niente percorsi inventati) e senza duplicati
    consentiti = set(elenco_attuale)
    tenute = []
    for p in elenco_richiesto:
        if isinstance(p, str) and p in consentiti and p not in tenute:
            tenute.append(p)
    return tenute


async def salva_immagini(immagini: list[UploadFile]) -> list[str]:
    """Controlla e salva le immagini caricate.

    I file vengono scritti su disco con un nome casuale solo dopo aver controllato tutti i file.

    Args:
        immagini: File caricati dal form.

    Returns:
        Percorsi pubblici delle immagini salvate (`/static/uploads/...`).

    Raises:
        HTTPException: 400 se un file non è un'immagine supportata o supera `UPLOAD_MAX_MB`.
    """
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    da_scrivere = []
    for file in immagini:
        # controllo sia l'estensione del nome sia il tipo dichiarato dal browser
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
        # nome casuale (uuid): evita collisioni e non usa il nome scelto dall'utente
        da_scrivere.append((f"{uuid.uuid4().hex}{estensione}", contenuto))

    # scrivo su disco solo dopo aver controllato TUTTI i file: se uno non è valido non resta nulla a metà
    percorsi = []
    for nome, contenuto in da_scrivere:
        (settings.UPLOAD_DIR / nome).write_bytes(contenuto)
        percorsi.append(f"/static/uploads/{nome}")
    return percorsi
