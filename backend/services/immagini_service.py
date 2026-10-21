"""Gestione delle immagini delle mostre: controllo, salvataggio nel database e selezione di quelle da mantenere."""

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
# formato reale riconosciuto da Pillow (dai byte del file) per ogni estensione ammessa
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
    """Verifica che i byte siano davvero un'immagine del formato indicato dall'estensione.

    Il tipo dichiarato dal browser e l'estensione si possono falsificare: qui il file viene aperto con
    Pillow, che riconosce il formato dalla sua struttura interna. Prima di decodificare i pixel controllo
    larghezza e altezza, così un file piccolo che si espande in un'immagine enorme ("decompression bomb")
    viene rifiutato senza occupare memoria; poi decodifico tutta l'immagine, così un file troncato o
    corrotto non viene salvato.

    Args:
        nome_file: Nome originale, usato solo nei messaggi di errore.
        estensione: Estensione già controllata (es. `.png`).
        contenuto: Byte del file caricato.

    Raises:
        HTTPException: 400 se il file non è un'immagine valida, se il formato reale non corrisponde
            all'estensione o se supera `IMMAGINE_MAX_PIXEL`.
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
            img.load()  # decodifica completa: errore se il file è troncato o corrotto
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise _errore(f"Il file '{nome_file}' non è un'immagine valida o è danneggiato.") from None


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


async def salva_immagini(immagini: list[UploadFile], db: Session, mostra: models.Mostra) -> list[str]:
    """Controlla le immagini caricate e le aggiunge alla sessione del database, collegate alla mostra.

    Le righe vengono solo aggiunte alla sessione: il commit lo fa il router insieme alla mostra,
    quindi mostra e immagini vengono salvate (o annullate) nella stessa transazione.

    Args:
        immagini: File caricati dal form.
        db: Sessione del database della richiesta.
        mostra: Mostra a cui appartengono le immagini (anche nuova, non ancora salvata).

    Returns:
        Percorsi pubblici delle immagini (`/api/immagini/<nome>`).

    Raises:
        HTTPException: 400 se i file sono più di `IMMAGINI_MAX_PER_RICHIESTA`, se un file non è
            un'immagine valida del formato dichiarato o se supera `UPLOAD_MAX_MB` o `IMMAGINE_MAX_PIXEL`.
    """
    if len(immagini) > settings.IMMAGINI_MAX_PER_RICHIESTA:
        raise _errore(f"Puoi caricare al massimo {settings.IMMAGINI_MAX_PER_RICHIESTA} immagini alla volta.")
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    da_salvare = []
    for file in immagini:
        # primo controllo (preliminare): estensione del nome e tipo dichiarato dal browser
        estensione = Path(file.filename).suffix.lower()
        if estensione not in settings.ESTENSIONI_IMMAGINI or not (file.content_type or "").startswith("image/"):
            raise _errore(f"Il file '{file.filename}' non è un'immagine supportata (jpg, png, webp, gif).")
        # leggo al massimo un byte oltre il limite: un file più grande viene rifiutato senza leggerlo tutto
        contenuto = await file.read(limite + 1)
        if len(contenuto) > limite:
            raise _errore(f"Il file '{file.filename}' supera il limite di {settings.UPLOAD_MAX_MB} MB.")
        # secondo controllo (sul contenuto reale): formato, dimensioni in pixel e integrità
        controlla_contenuto(file.filename, estensione, contenuto)
        # nome casuale (uuid): evita collisioni e non usa il nome scelto dall'utente
        da_salvare.append((f"{uuid.uuid4().hex}{estensione}", TIPI_MIME[estensione], contenuto))

    # aggiungo le righe solo dopo aver controllato TUTTI i file: se uno non è valido non resta nulla a metà
    percorsi = []
    for nome, tipo, contenuto in da_salvare:
        db.add(models.Immagine(mostra=mostra, nome=nome, tipo=tipo, dati=contenuto))
        percorsi.append(f"{PREFISSO_URL}{nome}")
    return percorsi


def rimuovi_immagini(db: Session, percorsi: list[str]) -> int:
    """Elimina dal database le immagini indicate che non servono più (senza fare il commit).

    Serve quando dalla modifica di una mostra si tolgono alcune immagini; quando si elimina la mostra
    le sue immagini vengono eliminate dalla chiave esterna con ON DELETE CASCADE.
    Sono considerate solo le immagini salvate nel database (`/api/immagini/...`): le immagini delle
    mostre iniziali, in `static/uploads/`, fanno parte del codice del progetto e restano.

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
