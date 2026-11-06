"""Data e ora del museo usato per le regole su mostre e ingressi

Le date delle mostre di inizio e fine sono giorni del calendario del museo.
I timestamp salvati nel database (creazione, ingresso) restano invece in UTC.
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

import settings


def oggi() -> date:
    """Restituisce la data di oggi nel fuso orario del museo

    Returns:
        Data corrente secondo `settings.FUSO_ORARIO` Europe/Rome
    """
    return datetime.now(ZoneInfo(settings.FUSO_ORARIO)).date()


def adesso_utc() -> datetime:
    """Restituisce data e ora attuali in UTC senza fuso con formato usato per le colonne DateTime

    Returns:
        Istante corrente in UTC come datetime naive
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
