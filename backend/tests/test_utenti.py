import models
from auth import hash_password, verifica_password
from database import SessionLocal
from tests.conftest import registra_utente

DATI = {
    "nome": "Giulia",
    "cognome": "Verdi",
    "email": "Giulia.Verdi@Test.it",
    "telefono": "3471234567",
    "password": "password-sicura",
}


def test_registrazione_restituisce_token_e_profilo(client):
    r = client.post("/api/utenti/registrazione", json=DATI)
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["access_token"]
    assert corpo["utente"]["email"] == "giulia.verdi@test.it"
    assert "password" not in corpo["utente"]
    assert "password_hash" not in corpo["utente"]


def test_password_salvata_solo_come_hash(client):
    client.post("/api/utenti/registrazione", json=DATI)
    db = SessionLocal()
    utente = db.query(models.Utente).one()
    db.close()
    assert "password-sicura" not in utente.password_hash
    assert utente.password_hash.startswith("pbkdf2_sha256$")


def test_email_gia_registrata(client):
    assert client.post("/api/utenti/registrazione", json=DATI).status_code == 201
    r = client.post("/api/utenti/registrazione", json={**DATI, "email": "giulia.verdi@test.it"})
    assert r.status_code == 409
    assert "Esiste già" in r.json()["detail"]


def test_registrazione_password_corta(client):
    r = client.post("/api/utenti/registrazione", json={**DATI, "password": "1234"})
    assert r.status_code == 422
    assert "almeno 8 caratteri" in r.json()["detail"]


def test_login_corretto(client):
    client.post("/api/utenti/registrazione", json=DATI)
    r = client.post("/api/utenti/login", json={"email": " GIULIA.verdi@test.it ", "password": "password-sicura"})
    assert r.status_code == 200
    assert r.json()["utente"]["nome"] == "Giulia"


def test_login_errato_stesso_messaggio(client):
    client.post("/api/utenti/registrazione", json=DATI)
    sbagliata = client.post("/api/utenti/login", json={"email": "giulia.verdi@test.it", "password": "sbagliata!"})
    inesistente = client.post("/api/utenti/login", json={"email": "nessuno@test.it", "password": "password-sicura"})
    assert sbagliata.status_code == inesistente.status_code == 401
    # non si rivela se l'email esiste
    assert sbagliata.json()["detail"] == inesistente.json()["detail"] == "Email o password errate."


def test_login_visitatore_limitato(client):
    for _ in range(5):
        client.post("/api/utenti/login", json={"email": "x@test.it", "password": "sbagliata"})
    assert client.post("/api/utenti/login", json={"email": "x@test.it", "password": "sbagliata"}).status_code == 429


def test_profilo_richiede_token_visitatore(client, auth, utente):
    assert client.get("/api/utenti/me").status_code == 401
    assert client.get("/api/utenti/me", headers=auth).status_code == 403
    r = client.get("/api/utenti/me", headers=utente)
    assert r.status_code == 200
    assert r.json()["email"] == "mario.rossi@test.it"


def test_token_visitatore_non_apre_area_admin(client, utente):
    assert client.get("/api/statistiche", headers=utente).status_code == 401
    assert client.delete("/api/mostre/1", headers=utente).status_code == 401


def test_mie_prenotazioni(client, utente, mostra_futura, mostra_in_corso):
    altro = registra_utente(client, email="altro@test.it")
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente)
    client.post("/api/prenota", json={"mostra_id": mostra_in_corso}, headers=utente)
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=altro)

    mie = client.get("/api/utenti/me/prenotazioni", headers=utente).json()
    assert len(mie) == 2
    assert {p["titolo_mostra"] for p in mie} == {"Mostra futura", "Mostra in corso"}
    assert "data_inizio" in mie[0]


def test_hash_e_verifica_password():
    h = hash_password("segreta123")
    assert verifica_password("segreta123", h)
    assert not verifica_password("segreta124", h)
    assert not verifica_password("segreta123", "formato-non-valido")
    # due hash della stessa password sono diversi (sale casuale)
    assert hash_password("segreta123") != h
