"""Gestione delle immagini delle mostre:
- controllo
- salvataggio nel database
- selezione di img per formato
"""

import io
import json
import uuid
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session

import models
import settings

# indirizzo pubblico delle immagini salvate nel database servite da routers/immagini.py
PREFISSO_URL = "/api/immagini/"
# tipo MIME
TIPI_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}
# formati accettati per ogni estensione ammessa
FORMATI_PER_ESTENSIONE = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
    ".gif": "GIF",
}


def _errore(testo: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=testo)


def controlla_contenuto(nome_file: str, estensione: str, contenuto: bytes) -> None:
    """Controllo  dell'immagine e dell'estensione

    Args:
        nome_file: Nome file
        estensione: Estensione
        contenuto: Byte del file

    ERROR HTTPException:
        - 400 se il file non è un'immagine valida
            oppure se il formato non corrisponde all'estensione
            oppure se supera `IMMAGINE_MAX_PIXEL`.
    """
    try:
        with Image.open(io.BytesIO(contenuto)) as img:
            formato = img.format
            larghezza, altezza = img.size
            if formato != FORMATI_PER_ESTENSIONE[estensione]:
                raise _errore(f"Il contenuto del file '{nome_file}' non corrisponde al formato {estensione}.")
            if larghezza * altezza > settings.IMMAGINE_MAX_PIXEL:
                raise _errore(
                    f"L'immagine '{nome_file}' è troppo grande ({larghezza}×{altezza} pixel): "
                    f"massimo {settings.IMMAGINE_MAX_PIXEL // 1_000_000} milioni di pixel."
                )
            img.load()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise _errore(f"Il file '{nome_file}' non è un'immagine valida o è danneggiato.") from None


def file_presenti(immagini: Optional[list[UploadFile]]) -> list[UploadFile]:
    """Scarta i campi file vuoti

    Args:
        immagini: File ricevuti dal form oppure None.

    Returns:
         i file  caricati
    """
    return [f for f in (immagini or []) if f is not None and f.filename]


def immagini_da_tenere(attuali: str, richieste: Optional[str]) -> list[str]:
    """Restituisce le immagini già salvate e sono accettati path che appartengono già alla mostra non duplicati

    Args:
        attuali: Percorsi salvati nel database, separati da virgola
        richieste: Elenco JSON inviato dal form di modifica

    Returns:
        Percorsi da mantenere, nell'ordine richiesto.

    ERROR HTTPException:
        - 400 in caso di JSON non valido
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
    #  solo path esistenti relativi alla mostra e non duplicati
    consentiti = set(elenco_attuale)
    tenute = []
    for p in elenco_richiesto:
        if isinstance(p, str) and p in consentiti and p not in tenute:
            tenute.append(p)
    return tenute


async def salva_immagini(immagini: list[UploadFile], db: Session, mostra: models.Mostra) -> list[str]:
    """Controlla le immagini caricate e le aggiunge alla sessione del database collegate alla mostra

    Le rows vengono solo aggiunte alla sessione e la mostra e le immagini
    vengono salvate o annullate nella stessa transazione

    Args:
        immagini: File caricati lato form
        db: Sessione del database della richiest
        mostra: mostra di riferimento per le immagini

    Returns:
        Percorsi pubblici delle immagini (`/api/immagini/<nome>`).

    ERROR HTTPException:
        - 400 se i file sono superiori ad `IMMAGINI_MAX_PER_RICHIESTA`
            oppure se un file non è un'immagine  del formato dichiarato
            o se supera `UPLOAD_MAX_MB` o `IMMAGINE_MAX_PIXEL`.
    """
    if len(immagini) > settings.IMMAGINI_MAX_PER_RICHIESTA:
        raise _errore(f"Puoi caricare al massimo {settings.IMMAGINI_MAX_PER_RICHIESTA} immagini alla volta.")
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    da_salvare = []
    for file in immagini:
        # controllo preliminare dell'estensione del nome ed estensione
        estensione = Path(file.filename).suffix.lower()
        if estensione not in settings.ESTENSIONI_IMMAGINI or not (file.content_type or "").startswith("image/"):
            raise _errore(f"Il file '{file.filename}' non è un'immagine supportata (jpg, png, webp, gif).")
        # controllo delle dimensioni dei byte
        contenuto = await file.read(limite + 1)
        if len(contenuto) > limite:
            raise _errore(f"Il file '{file.filename}' supera il limite di {settings.UPLOAD_MAX_MB} MB.")
        # controllo di formato, dimensioni in pixel e integrità
        controlla_contenuto(file.filename, estensione, contenuto)
        # nome casuale assegnato con uuid invece che il nome scelto dall'utente
        da_salvare.append((f"{uuid.uuid4().hex}{estensione}", TIPI_MIME[estensione], contenuto))

    # aggiungo le rows al db
    percorsi = []
    for nome, tipo, contenuto in da_salvare:
        db.add(models.Immagine(mostra=mostra, nome=nome, tipo=tipo, dati=contenuto))
        percorsi.append(f"{PREFISSO_URL}{nome}")
    return percorsi


def rimuovi_immagini(db: Session, percorsi: list[str]) -> int:
    """Elimina dal database le immagini indicate che non servono più (senza fare il commit).

    Quando modificando una mostra alcune immagini vengono rimosse o se si elimina la mostra
    anche le sue immagini vengono eliminate dalla chiave esterna con ON DELETE CASCADE.

    Args:
        db: Sessione del database.
        percorsi: path delle immagini da eliminare

    Returns:
        Numero di immagini eliminate
    """
    nomi = [p[len(PREFISSO_URL) :] for p in percorsi if p.startswith(PREFISSO_URL)]
    if not nomi:
        return 0
    return db.query(models.Immagine).filter(models.Immagine.nome.in_(nomi)).delete(synchronize_session=False)
