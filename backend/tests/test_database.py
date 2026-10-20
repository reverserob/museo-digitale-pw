"""Test d'integrazione sul database: vincoli, relazioni tra tabelle, CRUD, concorrenza e persistenza.

Girano su SQLite in locale e su un PostgreSQL vero nel job "Backend (PostgreSQL)" della CI
(variabile TEST_DATABASE_URL). I test di concorrenza richiedono PostgreSQL e su SQLite vengono saltati.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

import models
import settings
from auth import hash_password
from database import E_SQLITE, SessionLocal, engine
from tests.conftest import PNG_FINTO, registra_utente

solo_postgres = pytest.mark.skipif(E_SQLITE, reason="richiede PostgreSQL (job CI 'Backend (PostgreSQL)')")


def _utente(db, email="anna@test.it"):
    utente = models.Utente(
        nome="Anna", cognome="Neri", email=email, telefono="3331234567", password_hash=hash_password("Museo2026")
    )
    db.add(utente)
    db.commit()
    return utente


def _mostra(db, titolo="Mostra DB"):
    mostra = models.Mostra(
        titolo=titolo,
        descrizione="Descrizione di prova",
        immagini="/static/uploads/x.webp",
        data_inizio=date(2000, 1, 1),
        data_fine=date(2099, 12, 31),
    )
    db.add(mostra)
    db.commit()
    return mostra


def _prenotazione(utente, mostra, codice):
    return models.Prenotazione(
        mostra_id=mostra.id,
        utente_id=utente.id,
        nome=utente.nome,
        cognome=utente.cognome,
        email=utente.email,
        telefono=utente.telefono,
        codice=codice,
    )


# --- vincoli imposti dal database (non solo dalle API) ---
def test_database_rifiuta_la_prenotazione_duplicata():
    db = SessionLocal()
    utente, mostra = _utente(db), _mostra(db)
    db.add(_prenotazione(utente, mostra, "MCD-AAAA-AAAA"))
    db.commit()
    db.add(_prenotazione(utente, mostra, "MCD-BBBB-BBBB"))
    with pytest.raises(IntegrityError):
        db.commit()  # indice unico uq_prenotazioni_utente_mostra
    db.rollback()
    assert db.query(models.Prenotazione).count() == 1
    db.close()


def test_database_rifiuta_il_feedback_duplicato():
    db = SessionLocal()
    utente, mostra = _utente(db), _mostra(db)
    for _ in range(2):
        db.add(models.Feedback(mostra_id=mostra.id, utente_id=utente.id, nome="Anna N.", voto=5, commento=""))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.close()


def test_database_rifiuta_email_e_codici_duplicati():
    db = SessionLocal()
    _utente(db)
    db.add(models.Utente(nome="Altra", cognome="Anna", email="anna@test.it", telefono="3330000000", password_hash="x"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    utente, mostra, altra = _utente(db, "b@test.it"), _mostra(db), _mostra(db, "Altra mostra")
    db.add_all([_prenotazione(utente, mostra, "MCD-CCCC-CCCC"), _prenotazione(utente, altra, "MCD-CCCC-CCCC")])
    with pytest.raises(IntegrityError):
        db.commit()  # il codice di prenotazione è unico
    db.rollback()
    db.close()


def test_chiave_esterna_verso_mostra_inesistente_rifiutata():
    db = SessionLocal()
    utente = _utente(db)
    mostra_finta = models.Mostra(id=99999)
    db.add(_prenotazione(utente, mostra_finta, "MCD-DDDD-DDDD"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.close()


def test_una_prenotazione_per_account_eliminato_non_blocca_le_altre():
    # dopo l'eliminazione dell'account utente_id diventa NULL: più righe NULL sulla stessa mostra sono ammesse
    db = SessionLocal()
    mostra = _mostra(db)
    for i in range(2):
        db.add(
            models.Prenotazione(
                mostra_id=mostra.id,
                utente_id=None,
                nome="Account",
                cognome="eliminato",
                email="",
                telefono="",
                codice=f"MCD-EEEE-EEE{i}",
            )
        )
    db.commit()
    assert db.query(models.Prenotazione).filter(models.Prenotazione.utente_id.is_(None)).count() == 2
    db.close()


# --- relazioni tra tabelle ---
def test_eliminare_una_mostra_elimina_prenotazioni_e_feedback():
    db = SessionLocal()
    utente, mostra = _utente(db), _mostra(db)
    db.add(_prenotazione(utente, mostra, "MCD-FFFF-FFFF"))
    db.add(models.Feedback(mostra_id=mostra.id, utente_id=utente.id, nome="Anna N.", voto=4, commento="Bella"))
    db.commit()
    db.delete(mostra)
    db.commit()
    assert db.query(models.Prenotazione).count() == 0
    assert db.query(models.Feedback).count() == 0
    assert db.query(models.Utente).count() == 1  # l'account resta
    db.close()


def test_relazioni_navigabili_dai_due_lati():
    db = SessionLocal()
    utente, mostra = _utente(db), _mostra(db)
    db.add(_prenotazione(utente, mostra, "MCD-GGGG-GGGG"))
    db.commit()
    db.expire_all()
    assert utente.prenotazioni[0].mostra.titolo == "Mostra DB"
    assert mostra.prenotazioni[0].utente.email == "anna@test.it"
    db.close()


# --- CRUD sul database ---
def test_crud_mostra_sul_database():
    db = SessionLocal()
    mostra = _mostra(db)  # Create
    letta = db.get(models.Mostra, mostra.id)  # Read
    assert letta.titolo == "Mostra DB" and letta.data_fine == date(2099, 12, 31)
    letta.titolo = "Titolo aggiornato"  # Update
    db.commit()
    db.expire_all()
    assert db.get(models.Mostra, mostra.id).titolo == "Titolo aggiornato"
    db.delete(letta)  # Delete
    db.commit()
    assert db.get(models.Mostra, mostra.id) is None
    db.close()


def test_crud_utenti_via_api_sul_database(client, auth):
    intestazione = registra_utente(client)  # Create
    uid = client.get("/api/utenti/me", headers=intestazione).json()["id"]  # Read
    client.put(
        f"/api/utenti/{uid}", json={"nome": "Mario", "cognome": "Bianchi", "telefono": "3339998887"}, headers=auth
    )
    db = SessionLocal()
    assert db.get(models.Utente, uid).cognome == "Bianchi"  # Update arrivato al database
    db.close()
    client.delete(f"/api/utenti/{uid}", headers=auth)  # Delete
    db = SessionLocal()
    assert db.get(models.Utente, uid) is None
    db.close()


# --- concorrenza: la regola "una prenotazione per mostra" regge anche con richieste simultanee ---
@solo_postgres
def test_prenotazioni_simultanee_ne_accetta_una_sola(client, mostra_futura):
    intestazione = registra_utente(client)

    def prenota(_):
        return client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=intestazione).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        esiti = list(pool.map(prenota, range(8)))
    assert esiti.count(201) == 1
    assert esiti.count(409) == 7
    db = SessionLocal()
    assert db.query(models.Prenotazione).filter(models.Prenotazione.mostra_id == mostra_futura).count() == 1
    db.close()


# --- persistenza: i dati restano dopo il "riavvio" (nuovo motore e nuove connessioni) ---
def test_dati_e_immagini_restano_dopo_il_riavvio_della_connessione(client, auth, mostra_futura):
    intestazione = registra_utente(client)
    codice = client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=intestazione).json()["codice"]
    file = {"immagini": ("foto.png", PNG_FINTO, "image/png")}
    dati = {
        "titolo": "Mostra persistente",
        "descrizione": "Descrizione lunga abbastanza",
        "data_inizio": "2030-01-01",
        "data_fine": "2030-02-01",
    }
    percorso = client.post("/api/mostre", data=dati, files=file, headers=auth).json()["immagini"]

    # chiudo tutte le connessioni del server, come avviene quando il processo si riavvia
    engine.dispose()
    nuovo_motore = create_engine(settings.DATABASE_URL)
    NuovaSessione = sessionmaker(bind=nuovo_motore)
    db = NuovaSessione()
    assert (
        db.query(models.Prenotazione).filter(models.Prenotazione.codice == codice).one().email == "mario.rossi@test.it"
    )
    nome = percorso.rsplit("/", 1)[1]
    assert db.query(models.Immagine).filter(models.Immagine.nome == nome).one().dati == PNG_FINTO
    with nuovo_motore.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM immagini")).scalar() == 1
    db.close()
    nuovo_motore.dispose()
    # e l'API continua a servire l'immagine
    assert client.get(percorso).content == PNG_FINTO
