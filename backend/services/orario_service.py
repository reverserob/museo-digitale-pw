"""Data e ora del museo: un unico punto per il fuso orario usato dalle regole su mostre e ingressi.

Le date delle mostre (inizio e fine) sono giorni del calendario del museo, quindi il confronto con
"oggi" usa il fuso orario del museo (`FUSO_ORARIO`, predefinito Europe/Rome) e non quello del server,
che su Render è UTC. I timestamp salvati nel database (creazione, ingresso) restano invece in UTC.
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

import settings


def oggi() -> date:
    """Restituisce la data di oggi nel fuso orario del museo.

    Returns:
        Data corrente secondo `settings.FUSO_ORARIO` (es. Europe/Rome).
    """
    return datetime.now(ZoneInfo(settings.FUSO_ORARIO)).date()


def adesso_utc() -> datetime:
    """Restituisce data e ora attuali in UTC, senza fuso (formato usato per le colonne DateTime).

    Returns:
        Istante corrente in UTC come `datetime` "naive".
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
