"""Codice di riferimento e QR code delle prenotazioni, usati dal museo per verificare chi si presenta.

Ogni prenotazione riceve un codice casuale nel formato `MCD-XXXX-XXXX` (es. `MCD-7K3F-9QXA`).
Il codice compare nell'email di conferma insieme a un QR code che contiene l'indirizzo della pagina
di verifica dell'area riservata: inquadrandolo con il telefono, il personale apre direttamente la prenotazione.
"""

import io
import re
import secrets
from datetime import date
from typing import Optional

import segno
from sqlalchemy.orm import Session

import models
import settings

# prefisso del codice (Museo Civico Digitale)
PREFISSO = "MCD"
# alfabeto senza caratteri che si confondono quando vengono letti o dettati (0/O, 1/I/L)
ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
# 8 caratteri casuali: 31^8 ≈ 850 miliardi di combinazioni, impossibili da indovinare per tentativi
LUNGHEZZA = 8


def _codice_casuale() -> str:
    """Genera un codice nel formato `MCD-XXXX-XXXX` con caratteri casuali crittograficamente sicuri."""
    caratteri = "".join(secrets.choice(ALFABETO) for _ in range(LUNGHEZZA))
    return f"{PREFISSO}-{caratteri[:4]}-{caratteri[4:]}"


def genera_codice(db: Session) -> str:
    """Genera un codice di prenotazione non ancora usato.

    Args:
        db: Sessione del database, usata per controllare che il codice sia unico.

    Returns:
        Il nuovo codice, ad esempio `MCD-7K3F-9QXA`.
    """
    while True:
        codice = _codice_casuale()
        # una collisione è praticamente impossibile, ma il controllo garantisce l'unicità
        if db.query(models.Prenotazione.id).filter(models.Prenotazione.codice == codice).first() is None:
            return codice


def normalizza_codice(testo: str) -> Optional[str]:
    """Riporta al formato standard un codice digitato a mano o letto dal QR code.

    Accetta minuscole, spazi e trattini in posizioni diverse, con o senza il prefisso `MCD`.

    Args:
        testo: Codice inserito, ad esempio `mcd 7k3f 9qxa` oppure `7K3F9QXA`.

    Returns:
        Il codice nel formato `MCD-XXXX-XXXX`, oppure None se il testo non può essere un codice valido.
    """
    pulito = re.sub(r"[^A-Za-z0-9]", "", testo or "").upper()
    if pulito.startswith(PREFISSO):
        pulito = pulito[len(PREFISSO) :]
    if len(pulito) != LUNGHEZZA or any(c not in ALFABETO for c in pulito):
        return None
    return f"{PREFISSO}-{pulito[:4]}-{pulito[4:]}"


def trova_per_codice_o_id(db: Session, riferimento: str) -> Optional[models.Prenotazione]:
    """Cerca una prenotazione dal suo codice (`MCD-...`) oppure dal numero identificativo.

    Args:
        db: Sessione del database.
        riferimento: Codice di prenotazione o numero (id) della prenotazione.

    Returns:
        La prenotazione trovata, oppure None.
    """
    riferimento = (riferimento or "").strip()
    if riferimento.isdigit():
        return db.query(models.Prenotazione).filter(models.Prenotazione.id == int(riferimento)).first()
    codice = normalizza_codice(riferimento)
    if codice is None:
        return None
    return db.query(models.Prenotazione).filter(models.Prenotazione.codice == codice).first()


def url_verifica(codice: str) -> str:
    """Indirizzo della pagina di verifica dell'area riservata, contenuto nel QR code.

    Args:
        codice: Codice della prenotazione.

    Returns:
        URL del tipo `https://<sito>/admin/verifica?codice=MCD-XXXX-XXXX`.
    """
    return f"{settings.FRONTEND_URL}/admin/verifica?codice={codice}"


def genera_qr_png(codice: str, scala: int = 8) -> bytes:
    """Crea l'immagine PNG del QR code di una prenotazione.

    Args:
        codice: Codice della prenotazione.
        scala: Dimensione in pixel di ogni "quadratino" del QR code.

    Returns:
        Il contenuto del file PNG.
    """
    # livello di correzione "M": il QR resta leggibile anche se una parte (circa il 15%) è rovinata
    qr = segno.make(url_verifica(codice), error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="png", scale=scala, border=2)
    return buffer.getvalue()


def stato_ingresso(prenotazione: models.Prenotazione, oggi: date) -> str:
    """Dice se il visitatore può entrare oggi con questa prenotazione.

    Args:
        prenotazione: Prenotazione da verificare.
        oggi: Data del controllo.

    Returns:
        `"valida"` (mostra aperta, ingresso non ancora registrato), `"gia_entrato"`,
        `"non_iniziata"` oppure `"conclusa"`.
    """
    mostra = prenotazione.mostra
    if prenotazione.ingresso_il is not None:
        return "gia_entrato"
    if mostra.data_inizio > oggi:
        return "non_iniziata"
    if mostra.data_fine < oggi:
        return "conclusa"
    return "valida"
