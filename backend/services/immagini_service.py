"""Gestione delle immagini delle mostre: controllo, salvataggio nel database e selezione di quelle da mantenere."""

import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import models
import settings

# indirizzo pubblico delle immagini salvate nel database (servite da routers/immagini.py)
PREFISSO_URL = "/api/immagini/"
# tipo MIME ricavato dall'estensione controllata dal server (non dal tipo dichiarato dal browser)
TIPI_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


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


async def salva_immagini(immagini: list[UploadFile], db: Session) -> list[str]:
    """Controlla le immagini caricate e le aggiunge alla sessione del database.

    Le righe vengono solo aggiunte alla sessione: il commit lo fa il router insieme alla mostra,
    quindi mostra e immagini vengono salvate (o annullate) nella stessa transazione.

    Args:
        immagini: File caricati dal form.
        db: Sessione del database della richiesta.

    Returns:
        Percorsi pubblici delle immagini (`/api/immagini/<nome>`).

    Raises:
        HTTPException: 400 se un file non è un'immagine supportata o supera `UPLOAD_MAX_MB`.
    """
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    da_salvare = []
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
        da_salvare.append((f"{uuid.uuid4().hex}{estensione}", TIPI_MIME[estensione], contenuto))

    # aggiungo le righe solo dopo aver controllato TUTTI i file: se uno non è valido non resta nulla a metà
    percorsi = []
    for nome, tipo, contenuto in da_salvare:
        db.add(models.Immagine(nome=nome, tipo=tipo, dati=contenuto))
        percorsi.append(f"{PREFISSO_URL}{nome}")
    return percorsi


def rimuovi_immagini(db: Session, percorsi: list[str]) -> int:
    """Elimina dal database le immagini indicate che non servono più (senza fare il commit).

    Sono considerate solo le immagini salvate nel database (`/api/immagini/...`): le immagini delle
    mostre iniziali, in `static/uploads/`, fanno parte del progetto e restano.

    Args:
        db: Sessione del database.
        percorsi: Percorsi pubblici delle immagini da eliminare.

    Returns:
        Numero di immagini eliminate.
    """
    nomi = [p[len(PREFISSO_URL) :] for p in percorsi if p.startswith(PREFISSO_URL)]
    if not nomi:
        return 0
    return db.query(models.Immagine).filter(models.Immagine.nome.in_(nomi)).delete(synchronize_session=False)
