"""Test del CRUD degli utenti: modifica ed eliminazione dall'area personale e gestione dall'area riservata."""

from datetime import datetime, timezone

import models
from database import SessionLocal
from tests.conftest import prenota_nel_db, registra_utente

NUOVI_DATI = {"nome": "Mario Luigi", "cognome": "Bianchi", "telefono": "3339876543"}


def _id_utente(email="mario.rossi@test.it"):
    db = SessionLocal()
    utente = db.query(models.Utente).filter(models.Utente.email == email).one()
    db.close()
    return utente.id


def _segna_ingresso(mostra_id):
    """Registra direttamente nel DB l'ingresso della prenotazione sulla mostra indicata."""
    db = SessionLocal()
    p = db.query(models.Prenotazione).filter(models.Prenotazione.mostra_id == mostra_id).one()
    p.ingresso_il = datetime.now(timezone.utc)
    db.commit()
    db.close()


# --- Update: il visitatore modifica il proprio profilo ---
def test_modifica_profilo(client, utente):
    r = client.put("/api/utenti/me", json=NUOVI_DATI, headers=utente)
    assert r.status_code == 200
    assert r.json()["nome"] == "Mario Luigi"
    assert r.json()["email"] == "mario.rossi@test.it"  # l'email non cambia
    assert client.get("/api/utenti/me", headers=utente).json()["telefono"] == "3339876543"


def test_modifica_profilo_ignora_email_e_password(client, utente):
    r = client.put(
        "/api/utenti/me", json={**NUOVI_DATI, "email": "altra@test.it", "password_hash": "x"}, headers=utente
    )
    assert r.status_code == 200
    assert r.json()["email"] == "mario.rossi@test.it"
    # la password resta quella di prima
    login = client.post("/api/utenti/login", json={"email": "mario.rossi@test.it", "password": "Museo2026"})
    assert login.status_code == 200


def test_modifica_profilo_valida_i_dati(client, utente):
    r = client.put("/api/utenti/me", json={**NUOVI_DATI, "telefono": "12ab"}, headers=utente)
    assert r.status_code == 422
    r = client.put("/api/utenti/me", json={**NUOVI_DATI, "nome": " "}, headers=utente)
    assert r.status_code == 422


def test_modifica_profilo_richiede_visitatore(client, auth):
    assert client.put("/api/utenti/me", json=NUOVI_DATI).status_code == 401
    assert client.put("/api/utenti/me", json=NUOVI_DATI, headers=auth).status_code == 403


def test_modifica_profilo_non_cambia_lo_storico(client, utente, mostra_futura):
    client.post("/api/prenota", json={"mostra_id": mostra_futura, "telefono": "3331234567"}, headers=utente)
    client.put("/api/utenti/me", json=NUOVI_DATI, headers=utente)
    db = SessionLocal()
    p = db.query(models.Prenotazione).one()
    db.close()
    # la prenotazione conserva i dati copiati al momento della prenotazione
    assert p.cognome == "Rossi"


# --- Delete: il visitatore elimina il proprio account ---
def test_elimina_account_con_password(client, utente, mostra_futura, mostra_in_corso):
    client.post("/api/prenota", json={"mostra_id": mostra_futura, "telefono": "3331234567"}, headers=utente)
    client.post("/api/prenota", json={"mostra_id": mostra_in_corso, "telefono": "3331234567"}, headers=utente)
    _segna_ingresso(mostra_in_corso)

    r = client.request("DELETE", "/api/utenti/me", json={"password": "Museo2026"}, headers=utente)
    assert r.status_code == 200
    assert r.json()["prenotazioni_annullate"] == 1
    assert r.json()["prenotazioni_anonimizzate"] == 1

    db = SessionLocal()
    assert db.query(models.Utente).count() == 0
    rimaste = db.query(models.Prenotazione).all()
    db.close()
    # resta solo la prenotazione usata per l'ingresso, senza dati personali
    assert len(rimaste) == 1
    assert rimaste[0].utente_id is None
    assert rimaste[0].email == "" and rimaste[0].telefono == ""
    assert rimaste[0].cognome == "eliminato"


def test_elimina_account_password_errata(client, utente):
    r = client.request("DELETE", "/api/utenti/me", json={"password": "Sbagliata1"}, headers=utente)
    # 400 e non 401: il front-end non deve chiudere la sessione per una password digitata male
    assert r.status_code == 400
    assert r.json()["detail"] == "Password errata."
    assert client.get("/api/utenti/me", headers=utente).status_code == 200


def test_dopo_eliminazione_il_token_non_vale_piu(client, utente):
    client.request("DELETE", "/api/utenti/me", json={"password": "Museo2026"}, headers=utente)
    assert client.get("/api/utenti/me", headers=utente).status_code == 401
    login = client.post("/api/utenti/login", json={"email": "mario.rossi@test.it", "password": "Museo2026"})
    assert login.status_code == 401


def test_dopo_eliminazione_ci_si_puo_registrare_di_nuovo(client, utente):
    client.request("DELETE", "/api/utenti/me", json={"password": "Museo2026"}, headers=utente)
    registra_utente(client)  # stessa email: di nuovo libera


def test_elimina_account_anonimizza_i_feedback(client, utente, mostra_in_corso):
    prenota_nel_db(mostra_in_corso)
    client.post("/api/feedback", json={"mostra_id": mostra_in_corso, "voto": 5, "commento": "Bella"}, headers=utente)
    client.request("DELETE", "/api/utenti/me", json={"password": "Museo2026"}, headers=utente)
    pubblici = client.get(f"/api/feedback?mostra_id={mostra_in_corso}").json()
    assert len(pubblici) == 1
    assert pubblici[0]["nome"] == "Visitatore"


# --- Area riservata: Read, Update, Delete degli account ---
def test_elenco_utenti_admin(client, auth, utente, mostra_futura):
    registra_utente(client, email="anna.neri@test.it", nome="Anna", cognome="Neri")
    client.post("/api/prenota", json={"mostra_id": mostra_futura, "telefono": "3331234567"}, headers=utente)
    r = client.get("/api/utenti", headers=auth)
    assert r.status_code == 200
    elenco = {u["email"]: u for u in r.json()}
    assert set(elenco) == {"mario.rossi@test.it", "anna.neri@test.it"}
    assert elenco["mario.rossi@test.it"]["prenotazioni"] == 1
    assert elenco["anna.neri@test.it"]["prenotazioni"] == 0
    assert "password_hash" not in elenco["anna.neri@test.it"]


def test_gestione_utenti_riservata_admin(client, utente):
    uid = _id_utente()
    assert client.get("/api/utenti").status_code == 401
    assert client.get("/api/utenti", headers=utente).status_code == 401
    assert client.get(f"/api/utenti/{uid}", headers=utente).status_code == 401
    assert client.put(f"/api/utenti/{uid}", json=NUOVI_DATI, headers=utente).status_code == 401
    assert client.delete(f"/api/utenti/{uid}", headers=utente).status_code == 401


def test_dettaglio_e_modifica_utente_admin(client, auth, utente):
    uid = _id_utente()
    assert client.get(f"/api/utenti/{uid}", headers=auth).json()["cognome"] == "Rossi"
    r = client.put(f"/api/utenti/{uid}", json=NUOVI_DATI, headers=auth)
    assert r.status_code == 200
    assert r.json()["cognome"] == "Bianchi"
    # il visitatore vede i dati corretti dall'amministratore
    assert client.get("/api/utenti/me", headers=utente).json()["cognome"] == "Bianchi"


def test_elimina_utente_admin(client, auth, utente, mostra_futura):
    client.post("/api/prenota", json={"mostra_id": mostra_futura, "telefono": "3331234567"}, headers=utente)
    uid = _id_utente()
    r = client.delete(f"/api/utenti/{uid}", headers=auth)
    assert r.status_code == 200
    assert r.json()["prenotazioni_annullate"] == 1
    assert client.get("/api/utenti", headers=auth).json() == []
    assert client.get("/api/utenti/me", headers=utente).status_code == 401


def test_utente_inesistente(client, auth):
    assert client.get("/api/utenti/999", headers=auth).status_code == 404
    assert client.put("/api/utenti/999", json=NUOVI_DATI, headers=auth).status_code == 404
    assert client.delete("/api/utenti/999", headers=auth).status_code == 404
