"""Test degli account dei visitatori: registrazione, login, profilo e reimpostazione della password."""

import models
from auth import hash_password, verifica_password
from database import SessionLocal
from tests.conftest import registra_utente

DATI = {
    "nome": "Giulia",
    "cognome": "Verdi",
    "email": "Giulia.Verdi@Test.it",
    "telefono": "3471234567",
    "password": "Museo2026",
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
    assert "Museo2026" not in utente.password_hash
    assert utente.password_hash.startswith("pbkdf2_sha256$")


def test_email_gia_registrata(client):
    assert client.post("/api/utenti/registrazione", json=DATI).status_code == 201
    r = client.post("/api/utenti/registrazione", json={**DATI, "email": "giulia.verdi@test.it"})
    assert r.status_code == 409
    assert "Utente già registrato" in r.json()["detail"]


def test_registrazione_password_corta(client):
    r = client.post("/api/utenti/registrazione", json={**DATI, "password": "1234"})
    assert r.status_code == 422
    assert "almeno 6 caratteri" in r.json()["detail"]


def test_registrazione_con_conferma_email_corretta(client):
    r = client.post("/api/utenti/registrazione", json={**DATI, "conferma_email": "giulia.verdi@test.it "})
    assert r.status_code == 201


def test_registrazione_bloccata_se_le_email_non_coincidono(client, email_registrazione):
    r = client.post("/api/utenti/registrazione", json={**DATI, "conferma_email": "giulia.verde@test.it"})
    assert r.status_code == 422
    assert r.json()["detail"] == "conferma_email: Le email non coincidono."
    # nessun account creato e nessuna email inviata
    db = SessionLocal()
    assert db.query(models.Utente).count() == 0
    db.close()
    assert email_registrazione == []


def test_login_corretto(client):
    client.post("/api/utenti/registrazione", json=DATI)
    r = client.post("/api/utenti/login", json={"email": " GIULIA.verdi@test.it ", "password": "Museo2026"})
    assert r.status_code == 200
    assert r.json()["utente"]["nome"] == "Giulia"


def test_login_errato_stesso_messaggio(client):
    client.post("/api/utenti/registrazione", json=DATI)
    sbagliata = client.post("/api/utenti/login", json={"email": "giulia.verdi@test.it", "password": "sbagliata!"})
    inesistente = client.post("/api/utenti/login", json={"email": "nessuno@test.it", "password": "Museo2026"})
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


# --- email di registrazione ---
def test_registrazione_invia_email_di_conferma(client, email_registrazione):
    client.post("/api/utenti/registrazione", json=DATI)
    assert email_registrazione == [{"destinatario": "giulia.verdi@test.it", "nome": "Giulia"}]


def test_registrazione_doppia_avvisa_il_titolare(client, email_registrazione, email_gia_registrato):
    client.post("/api/utenti/registrazione", json=DATI)
    r = client.post("/api/utenti/registrazione", json={**DATI, "email": " Giulia.Verdi@test.it "})
    assert r.status_code == 409
    # nessun secondo account e nessuna seconda email di benvenuto, ma un avviso al titolare
    assert len(email_registrazione) == 1
    assert email_gia_registrato == [{"destinatario": "giulia.verdi@test.it", "nome": "Giulia"}]


def test_registrazione_non_valida_non_invia_email(client, email_registrazione):
    client.post("/api/utenti/registrazione", json={**DATI, "password": "corta"})
    assert email_registrazione == []


# --- password dimenticata ---
def _richiedi_link(client, email_reset, email="giulia.verdi@test.it"):
    client.post("/api/utenti/registrazione", json=DATI)
    r = client.post("/api/utenti/password-dimenticata", json={"email": email})
    assert r.status_code == 200
    return email_reset[-1]["link"].split("token=")[1] if email_reset else None


def test_password_dimenticata_invia_il_link(client, email_reset):
    token = _richiedi_link(client, email_reset, email=" GIULIA.verdi@test.it ")
    assert token
    assert email_reset[0]["destinatario"] == "giulia.verdi@test.it"
    assert email_reset[0]["link"].startswith("https://museo-digitale-pw-azure.vercel.app/reimposta-password?token=")


def test_link_usa_il_sito_di_provenienza(client, email_reset):
    client.post("/api/utenti/registrazione", json=DATI)
    client.post(
        "/api/utenti/password-dimenticata",
        json={"email": "giulia.verdi@test.it"},
        headers={"Origin": "http://localhost:5173"},
    )
    assert email_reset[0]["link"].startswith("http://localhost:5173/reimposta-password?token=")


def test_password_dimenticata_email_sconosciuta_stessa_risposta(client, email_reset):
    client.post("/api/utenti/registrazione", json=DATI)
    nota = client.post("/api/utenti/password-dimenticata", json={"email": "giulia.verdi@test.it"})
    ignota = client.post("/api/utenti/password-dimenticata", json={"email": "nessuno@test.it"})
    assert nota.status_code == ignota.status_code == 200
    assert nota.json() == ignota.json()
    assert len(email_reset) == 1


def test_reimposta_password(client, email_reset):
    token = _richiedi_link(client, email_reset)
    r = client.post("/api/utenti/reimposta-password", json={"token": token, "password": "NuovaPass1"})
    assert r.status_code == 200
    vecchia = client.post("/api/utenti/login", json={"email": "giulia.verdi@test.it", "password": "Museo2026"})
    nuova = client.post("/api/utenti/login", json={"email": "giulia.verdi@test.it", "password": "NuovaPass1"})
    assert vecchia.status_code == 401
    assert nuova.status_code == 200


def test_link_di_reset_usabile_una_sola_volta(client, email_reset):
    token = _richiedi_link(client, email_reset)
    assert (
        client.post("/api/utenti/reimposta-password", json={"token": token, "password": "NuovaPass1"}).status_code
        == 200
    )
    r = client.post("/api/utenti/reimposta-password", json={"token": token, "password": "AltraPass2"})
    assert r.status_code == 400
    assert "non è valido o è scaduto" in r.json()["detail"]


def test_link_di_reset_scaduto(client, email_reset, monkeypatch):
    import time

    token = _richiedi_link(client, email_reset)
    adesso = time.time()
    monkeypatch.setattr(time, "time", lambda: adesso + 31 * 60)
    r = client.post("/api/utenti/reimposta-password", json={"token": token, "password": "NuovaPass1"})
    assert r.status_code == 400


def test_reset_con_token_non_valido(client):
    r = client.post("/api/utenti/reimposta-password", json={"token": "abc.def", "password": "NuovaPass1"})
    assert r.status_code == 400


def test_reset_rispetta_la_regola_della_password(client, email_reset):
    token = _richiedi_link(client, email_reset)
    r = client.post("/api/utenti/reimposta-password", json={"token": token, "password": "senzamaiuscole1"})
    assert r.status_code == 422
    assert "maiuscola" in r.json()["detail"]


def test_token_di_reset_non_vale_come_accesso(client, email_reset):
    token = _richiedi_link(client, email_reset)
    assert client.get("/api/utenti/me", headers={"Authorization": f"Bearer {token}"}).status_code == 403
    assert client.get("/api/prenotazioni", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_token_di_accesso_non_vale_come_reset(client):
    corpo = client.post("/api/utenti/registrazione", json=DATI).json()
    r = client.post("/api/utenti/reimposta-password", json={"token": corpo["access_token"], "password": "NuovaPass1"})
    assert r.status_code == 400


# --- i miei feedback ---
def test_miei_feedback(client, mostra_in_corso):
    from tests.conftest import prenota_nel_db, registra_utente

    mario = registra_utente(client)
    anna = registra_utente(client, email="anna@test.it", nome="Anna", cognome="Bianchi")
    prenota_nel_db(mostra_in_corso)
    prenota_nel_db(mostra_in_corso, email="anna@test.it")
    assert client.get("/api/utenti/me/feedback", headers=mario).json() == []

    client.post("/api/feedback", json={"mostra_id": mostra_in_corso, "voto": 4}, headers=mario)
    client.post("/api/feedback", json={"mostra_id": mostra_in_corso, "voto": 2}, headers=anna)
    miei = client.get("/api/utenti/me/feedback", headers=mario).json()
    assert [(f["mostra_id"], f["voto"]) for f in miei] == [(mostra_in_corso, 4)]


def test_miei_feedback_richiede_visitatore(client, auth):
    assert client.get("/api/utenti/me/feedback").status_code == 401
    assert client.get("/api/utenti/me/feedback", headers=auth).status_code == 403
