"""Test del fuso orario del museo usato per decidere "oggi"."""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import settings
from services import orario_service


def test_oggi_usa_il_fuso_del_museo(monkeypatch):
    monkeypatch.setattr(settings, "FUSO_ORARIO", "Europe/Rome")
    assert orario_service.oggi() == datetime.now(ZoneInfo("Europe/Rome")).date()


def test_vicino_a_mezzanotte_vale_la_data_italiana(monkeypatch):
    # alle 22:30 UTC del 31 marzo in Italia è già il primo aprile (ora legale, UTC+2)
    class OrologioFinto(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 3, 31, 22, 30, tzinfo=timezone.utc).astimezone(tz)

    monkeypatch.setattr(orario_service, "datetime", OrologioFinto)
    monkeypatch.setattr(settings, "FUSO_ORARIO", "Europe/Rome")
    assert str(orario_service.oggi()) == "2026-04-01"
    monkeypatch.setattr(settings, "FUSO_ORARIO", "UTC")
    assert str(orario_service.oggi()) == "2026-03-31"


def test_adesso_utc_senza_fuso():
    istante = orario_service.adesso_utc()
    assert istante.tzinfo is None
    assert abs((datetime.now(timezone.utc).replace(tzinfo=None) - istante).total_seconds()) < 5
