"""Codice di riferimento e QR code delle prenotazioni

Ogni prenotazione riceve un codice casuale nel formato MCD-XXXX-XXXX
Il codice compare nell'email di conferma insieme a un QR code che contiene l'indirizzo della pagina
di verifica dell'area riservata.
Inquadrando il QrCode con il telefono apre in dettaglio della prenotazione
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
# alfabeto senza caratteri speciali
ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
# 8 caratteri
LUNGHEZZA = 8


def _codice_casuale() -> str:
    """Genera un codice nel formato MCD-XXXX-XXXX con caratteri casuali """
    caratteri = "".join(secrets.choice(ALFABETO) for _ in range(LUNGHEZZA))
    return f"{PREFISSO}-{caratteri[:4]}-{caratteri[4:]}"


def genera_codice(db: Session) -> str:
    """Genera un codice di prenotazione non ancora usato.

    Args:
        db: Sessione del database

    Returns:
        Il codice tipo MCD-XXXX-XXXX
    """
    while True:
        codice = _codice_casuale()
        if db.query(models.Prenotazione.id).filter(models.Prenotazione.codice == codice).first() is None:
            return codice


def normalizza_codice(testo: str) -> Optional[str]:
    """Riporta al formato standard un codice digitato a mano o letto dal QR code.
    Accetta minuscole, spazi e trattini in posizioni diverse, con o senza il prefisso `MCD`.

    Args:
        testo: Codice inserito, ad esempio `mcd 7k3f 9qxa` oppure `7K3F9QXA`.

    Returns:
        Il codice nel formato MCD-XXXX-XXXX oppure none se non è valido
    """
    pulito = re.sub(r"[^A-Za-z0-9]", "", testo or "").upper()
    if pulito.startswith(PREFISSO):
        pulito = pulito[len(PREFISSO) :]
    if len(pulito) != LUNGHEZZA or any(c not in ALFABETO for c in pulito):
        return None
    return f"{PREFISSO}-{pulito[:4]}-{pulito[4:]}"


def trova_per_codice_o_id(db: Session, riferimento: str) -> Optional[models.Prenotazione]:
    """Cerca una prenotazione dal suo codice MCD-XXXX-XXXX oppure dal ID prenotazione

    Args:
        db: Sessione del database.
        riferimento: Codice di prenotazione o ID) della prenotazione.

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
    """Indirizzo della pagina di verifica dell'area riservata contenuto nel QR code

    Args:
        codice: Codice della prenotazione

    Returns:
        URL tipo https://<sito>/admin/verifica?codice=MCD-XXXX-XXXX
    """
    return f"{settings.FRONTEND_URL}/admin/verifica?codice={codice}"


def genera_qr_png(codice: str, scala: int = 8) -> bytes:
    """Crea l'immagine PNG del QR code di una prenotazione

    Args:
        codice: Codice della prenotazione
        scala: Dimensione in pixel del QR code

    Returns:
        Il contenuto del file PNG
    """
    qr = segno.make(url_verifica(codice), error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="png", scale=scala, border=2)
    return buffer.getvalue()


def stato_ingresso(prenotazione: models.Prenotazione, oggi: date) -> str:
    """ conferma che il visitatore può entrare con la prenotazione mostrata

    Args:
        prenotazione: Prenotazione
        oggi: Data del check

    Returns:
        valida se la mostra è aperta con ingresso non ancora registrato
         oppure gia_entrato opure non_iniziata` oppure `"conclusa"
    """
    mostra = prenotazione.mostra
    if prenotazione.ingresso_il is not None:
        return "gia_entrato"
    if mostra.data_inizio > oggi:
        return "non_iniziata"
    if mostra.data_fine < oggi:
        return "conclusa"
    return "valida"
