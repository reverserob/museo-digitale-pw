"""Test del controllo di sicurezza della configurazione all'avvio."""

import os
import subprocess
import sys
from pathlib import Path

import settings

BACKEND = Path(__file__).parent.parent


def test_configurazione_di_test_senza_problemi_gravi(monkeypatch):
    monkeypatch.setattr(settings, "SECRET_KEY", "x" * 64)
    assert settings.problemi_configurazione() == []


def test_valori_dimostrativi_segnalati(monkeypatch):
    monkeypatch.setattr(settings, "SECRET_KEY", settings.SECRET_KEY_DEMO)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", settings.ADMIN_PASSWORD_DEMO)
    problemi = settings.problemi_configurazione()
    assert any("SECRET_KEY non impostata" in p for p in problemi)
    assert any("ADMIN_PASSWORD" in p for p in problemi)


def test_chiave_corta_segnalata(monkeypatch):
    monkeypatch.setattr(settings, "SECRET_KEY", "corta")
    assert settings.problemi_configurazione() == ["SECRET_KEY troppo corta: servono almeno 32 caratteri casuali"]


def _avvia(ambiente: dict) -> subprocess.CompletedProcess:
    # importa main.py in un processo separato, con un database temporaneo e senza le variabili del .env
    env = {k: v for k, v in os.environ.items() if k not in ("SECRET_KEY", "ADMIN_PASSWORD", "ADMIN_EMAIL", "RENDER")}
    env.update({"DATABASE_URL": "sqlite://", "SECRET_KEY": "", "ADMIN_PASSWORD": "", **ambiente})
    # load_dotenv non sovrascrive le variabili presenti: valori vuoti = "non impostata"
    return subprocess.run(
        [sys.executable, "-c", "import main"], cwd=BACKEND, env=env, capture_output=True, text=True, timeout=60
    )


def test_avvio_rifiutato_in_produzione_con_valori_dimostrativi():
    esito = _avvia({"RENDER": "true"})
    assert esito.returncode != 0
    assert "Avvio rifiutato in produzione" in esito.stderr


def test_avvio_in_produzione_con_configurazione_sicura():
    esito = _avvia({"AMBIENTE": "produzione", "SECRET_KEY": "k" * 40, "ADMIN_PASSWORD": "Password-Sicura-1"})
    assert esito.returncode == 0, esito.stderr


def test_avvio_in_sviluppo_con_valori_dimostrativi_solo_avviso():
    esito = _avvia({"AMBIENTE": "sviluppo"})
    assert esito.returncode == 0, esito.stderr
