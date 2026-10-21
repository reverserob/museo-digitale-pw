"""Configurazione comune dei test pytest: ambiente isolato, database pulito e fixture riutilizzabili."""

import io
import os
import tempfile
from datetime import date
from pathlib import Path

import pytest
from PIL import Image

# Configurazione di test: va impostata PRIMA di importare l'app,
# perché settings.py legge le variabili d'ambiente all'import.
# load_dotenv non sovrascrive le variabili già presenti, quindi i valori
# del tuo .env / .env.local non vengono usati durante i test.
CARTELLA_TEST = Path(tempfile.mkdtemp(prefix="museo_test_"))
# Database dei test: SQLite in una cartella temporanea, oppure un PostgreSQL vero se è impostata
# TEST_DATABASE_URL (es. postgresql://postgres@localhost:5432/museo_test), come nel job "Backend (PostgreSQL)" della CI.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{CARTELLA_TEST / 'test.db'}"
os.environ["ADMIN_EMAIL"] = "admin@test.it"
os.environ["ADMIN_PASSWORD"] = "password-test"
os.environ["SECRET_KEY"] = "chiave-segreta-di-test"
# credenziali email vuote: nessun invio reale durante i test
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["BREVO_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402

import models  # noqa: E402
import settings  # noqa: E402
from database import SessionLocal, engine  # noqa: E402
from main import app  # noqa: E402
from services.rate_limit_service import limiter  # noqa: E402
from services.seed_service import inserisci_dati_iniziali  # noqa: E402

# credenziali dell'admin di test, uguali a quelle impostate sopra nell'ambiente
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
    db = SessionLocal()
    # i feedback di esempio del seed vengono tolti: ogni test crea i propri
    db.query(models.Feedback).delete()
    db.commit()
    db.close()
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


@pytest.fixture(autouse=True)
def email_registrazione(monkeypatch):
    # come email_finta, per l'email di benvenuto dopo la registrazione
    chiamate = []
    monkeypatch.setattr("routers.utenti.invia_email_registrazione", lambda **dati: chiamate.append(dati))
    return chiamate


@pytest.fixture(autouse=True)
def email_gia_registrato(monkeypatch):
    # email di avviso per il tentativo di registrazione con un'email già usata
    chiamate = []
    monkeypatch.setattr("routers.utenti.invia_email_gia_registrato", lambda **dati: chiamate.append(dati))
    return chiamate


@pytest.fixture(autouse=True)
def email_annullamento(monkeypatch):
    # email di conferma dell'annullamento di una prenotazione
    chiamate = []
    monkeypatch.setattr("routers.utenti.invia_email_annullamento", lambda **dati: chiamate.append(dati))
    return chiamate


@pytest.fixture(autouse=True)
def email_account_eliminato(monkeypatch):
    # email di conferma dell'eliminazione dell'account
    chiamate = []
    monkeypatch.setattr("routers.utenti.invia_email_account_eliminato", lambda **dati: chiamate.append(dati))
    return chiamate


@pytest.fixture(autouse=True)
def email_reset(monkeypatch):
    # email con il link per reimpostare la password
    chiamate = []
    monkeypatch.setattr("routers.utenti.invia_email_reset_password", lambda **dati: chiamate.append(dati))
    return chiamate


@pytest.fixture
def client():
    # client HTTP che chiama l'app FastAPI direttamente, senza avviare un server
    return TestClient(app)


@pytest.fixture
def token(client):
    # token dell'amministratore ottenuto con un vero login
    risposta = client.post("/api/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return risposta.json()["access_token"]


@pytest.fixture
def auth(token):
    # header da passare alle rotte riservate all'admin
    return {"Authorization": f"Bearer {token}"}


def crea_mostra_nel_db(data_inizio, data_fine, titolo="Mostra di test"):
    """Inserisce una mostra direttamente nel database e ne restituisce l'id."""
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
def mostra_in_corso():
    # iniziata nel passato e non ancora finita
    return crea_mostra_nel_db("2000-01-01", "2099-12-31", "Mostra in corso")


@pytest.fixture
def mostra_conclusa():
    # già terminata: non prenotabile, ma recensibile da chi era prenotato
    return crea_mostra_nel_db("2000-01-01", "2000-02-01", "Mostra conclusa")


def crea_immagine(formato: str = "PNG", dimensioni: tuple = (4, 3)) -> bytes:
    """Restituisce i byte di una piccola immagine vera nel formato indicato (per i test di upload)."""
    buffer = io.BytesIO()
    Image.new("RGB", dimensioni, (197, 160, 89)).save(buffer, format=formato)
    return buffer.getvalue()


# immagini minime valide per i test di upload (il server ne controlla il contenuto reale con Pillow)
PNG_FINTO = crea_immagine("PNG")
JPG_FINTO = crea_immagine("JPEG")


def registra_utente(client, email="mario.rossi@test.it", nome="Mario", cognome="Rossi", telefono="3331234567"):
    """Registra un visitatore e restituisce l'header con il suo token."""
    dati = {"nome": nome, "cognome": cognome, "email": email, "telefono": telefono, "password": "Museo2026"}
    risposta = client.post("/api/utenti/registrazione", json=dati)
    assert risposta.status_code == 201, risposta.text
    return {"Authorization": f"Bearer {risposta.json()['access_token']}"}


@pytest.fixture
def utente(client):
    # header di un visitatore registrato (Mario Rossi)
    return registra_utente(client)


def prenota_nel_db(mostra_id, email="mario.rossi@test.it"):
    """Crea direttamente nel DB la prenotazione del visitatore (serve anche per le mostre già concluse)."""
    db = SessionLocal()
    utente = db.query(models.Utente).filter(models.Utente.email == email).one()
    db.add(
        models.Prenotazione(
            mostra_id=mostra_id,
            utente_id=utente.id,
            nome=utente.nome,
            cognome=utente.cognome,
            email=utente.email,
            telefono=utente.telefono,
        )
    )
    db.commit()
    db.close()
