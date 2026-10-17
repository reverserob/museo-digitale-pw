"""Test del login amministratore e della protezione delle rotte riservate con il token firmato."""

import time

import pytest

import auth
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD

# Rotte che richiedono il login (metodo, percorso)
ROTTE_RISERVATE = [
    ("post", "/api/mostre"),
    ("put", "/api/mostre/1"),
    ("delete", "/api/mostre/1"),
    ("get", "/api/prenotazioni"),
]


def test_login_corretto_restituisce_token(client):
    r = client.post("/api/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"
    assert "." in r.json()["access_token"]


def test_login_email_non_sensibile_a_maiuscole_e_spazi(client):
    r = client.post("/api/login", json={"email": "  ADMIN@Test.it ", "password": ADMIN_PASSWORD})
    assert r.status_code == 200


@pytest.mark.parametrize(
    "email, password",
    [
        (ADMIN_EMAIL, "sbagliata"),
        ("altro@test.it", ADMIN_PASSWORD),
        ("", ""),
    ],
)
def test_login_credenziali_errate(client, email, password):
    r = client.post("/api/login", json={"email": email, "password": password})
    assert r.status_code == 401
    assert r.json()["detail"] == "Credenziali errate."


@pytest.mark.parametrize("metodo, percorso", ROTTE_RISERVATE)
def test_rotte_riservate_senza_token(client, metodo, percorso):
    r = client.request(metodo, percorso)
    assert r.status_code == 401


@pytest.mark.parametrize("metodo, percorso", ROTTE_RISERVATE)
def test_rotte_riservate_con_token_falso(client, metodo, percorso):
    r = client.request(metodo, percorso, headers={"Authorization": "Bearer token.inventato"})
    assert r.status_code == 401


def test_token_modificato_viene_rifiutato(client, token):
    # cambio un carattere della firma: il server deve accorgersene
    ultimo = "A" if token[-1] != "A" else "B"
    manomesso = token[:-1] + ultimo
    r = client.get("/api/prenotazioni", headers={"Authorization": f"Bearer {manomesso}"})
    assert r.status_code == 401


def test_token_scaduto_viene_rifiutato(client, monkeypatch):
    # creo un token "nel passato": la scadenza è già trascorsa
    adesso = time.time()
    monkeypatch.setattr(auth.time, "time", lambda: adesso - 10 * 3600)
    vecchio = auth.crea_token(ADMIN_EMAIL)
    monkeypatch.setattr(auth.time, "time", lambda: adesso)
    r = client.get("/api/prenotazioni", headers={"Authorization": f"Bearer {vecchio}"})
    assert r.status_code == 401


def test_token_firmato_con_altra_chiave_viene_rifiutato(client, monkeypatch):
    monkeypatch.setattr(auth.settings, "SECRET_KEY", "chiave-di-un-attaccante")
    falso = auth.crea_token(ADMIN_EMAIL)
    monkeypatch.undo()
    r = client.get("/api/prenotazioni", headers={"Authorization": f"Bearer {falso}"})
    assert r.status_code == 401


def test_token_valido_permette_accesso(client, auth):
    r = client.get("/api/prenotazioni", headers=auth)
    assert r.status_code == 200


def test_troppi_tentativi_di_login_bloccati(client):
    # i primi 5 tentativi (limite "5/minute") ricevono 401, il sesto viene bloccato con 429
    for _ in range(5):
        r = client.post("/api/login", json={"email": ADMIN_EMAIL, "password": "sbagliata"})
        assert r.status_code == 401
    r = client.post("/api/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 429
    assert "Troppi tentativi" in r.json()["detail"]
