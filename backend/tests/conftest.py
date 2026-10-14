import os
import tempfile
from datetime import date
from pathlib import Path

import pytest

# Configurazione di test: va impostata PRIMA di importare l'app,
# perché settings.py legge le variabili d'ambiente all'import.
# load_dotenv non sovrascrive le variabili già presenti, quindi i valori
# del tuo .env / .env.local non vengono usati durante i test.
CARTELLA_TEST = Path(tempfile.mkdtemp(prefix="museo_test_"))
os.environ["DATABASE_URL"] = f"sqlite:///{CARTELLA_TEST / 'test.db'}"
os.environ["ADMIN_EMAIL"] = "admin@test.it"
os.environ["ADMIN_PASSWORD"] = "password-test"
os.environ["SECRET_KEY"] = "chiave-segreta-di-test"
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASSWORD"] = ""

from fastapi.testclient import TestClient  # noqa: E402

import models  # noqa: E402
import settings  # noqa: E402
from database import SessionLocal, engine  # noqa: E402
from main import app  # noqa: E402
from services.rate_limit_service import limiter  # noqa: E402
from services.seed_service import inserisci_dati_iniziali  # noqa: E402

ADMIN_EMAIL = "admin@test.it"
ADMIN_PASSWORD = "password-test"


@pytest.fixture(autouse=True)
def azzera_limite_login():
    # ogni test parte con il contatore dei tentativi di login a zero
    limiter.reset()
    yield


@pytest.fixture(autouse=True)
def database_pulito():
    # Prima di ogni test: database vuoto + le mostre iniziali di data/mostre.json
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    inserisci_dati_iniziali()
    yield


@pytest.fixture(autouse=True)
def cartella_upload(tmp_path, monkeypatch):
    # Le immagini caricate nei test finiscono in una cartella temporanea,
    # non in static/uploads del progetto
    cartella = tmp_path / "uploads"
    cartella.mkdir()
    monkeypatch.setattr(settings, "UPLOAD_DIR", cartella)
    return cartella


@pytest.fixture(autouse=True)
def email_finta(monkeypatch):
    # Nessuna email vera durante i test: registro solo le chiamate
    chiamate = []
    monkeypatch.setattr("routers.prenotazioni.invia_email_background", lambda **dati: chiamate.append(dati))
    return chiamate


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def token(client):
    risposta = client.post("/api/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return risposta.json()["access_token"]


@pytest.fixture
def auth(token):
    # header da passare alle rotte riservate all'admin
    return {"Authorization": f"Bearer {token}"}


def crea_mostra_nel_db(data_inizio, data_fine, titolo="Mostra di test"):
    db = SessionLocal()
    mostra = models.Mostra(
        titolo=titolo,
        descrizione="Descrizione della mostra di test",
        immagini="/static/uploads/test.webp",
        data_inizio=date.fromisoformat(data_inizio),
        data_fine=date.fromisoformat(data_fine),
    )
    db.add(mostra)
    db.commit()
    db.refresh(mostra)
    db.close()
    return mostra.id


@pytest.fixture
def mostra_futura():
    # date lontane, così i test non smettono di funzionare col passare del tempo
    return crea_mostra_nel_db("2099-01-01", "2099-12-31", "Mostra futura")


@pytest.fixture
def mostra_conclusa():
    return crea_mostra_nel_db("2000-01-01", "2000-02-01", "Mostra conclusa")


# immagine PNG minima valida per i test di upload
PNG_FINTO = b"\x89PNG\r\n\x1a\n" + b"0" * 100
