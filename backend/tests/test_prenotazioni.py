import pytest

from tests.conftest import registra_utente


def dati_validi(mostra_id, **modifiche):
    dati = {
        "mostra_id": mostra_id,
        "nome": "Mario",
        "cognome": "Rossi",
        "email": "mario.rossi@test.it",
        "telefono": "3331234567",
    }
    dati.update(modifiche)
    return dati


def test_prenotazione_valida(client, auth, utente, mostra_futura):
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente)
    assert r.status_code == 201
    assert "id" in r.json()

    salvate = client.get("/api/prenotazioni", headers=auth).json()
    assert len(salvate) == 1
    # i dati arrivano dall'account del visitatore
    assert salvate[0]["nome"] == "Mario"
    assert salvate[0]["cognome"] == "Rossi"
    assert salvate[0]["email"] == "mario.rossi@test.it"
    assert salvate[0]["telefono"] == "3331234567"
    assert salvate[0]["mostra_id"] == mostra_futura


def test_prenotazione_senza_login_rifiutata(client, mostra_futura, email_finta):
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura})
    assert r.status_code == 401
    assert "Accedi" in r.json()["detail"]
    assert email_finta == []


def test_prenotazione_con_token_admin_rifiutata(client, auth, mostra_futura):
    # l'amministratore non prenota: serve un account visitatore
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=auth)
    assert r.status_code == 403


def test_prenotazione_con_token_falso(client, mostra_futura):
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers={"Authorization": "Bearer abc.def"})
    assert r.status_code == 401


def test_prenotazione_avvia_invio_email(client, utente, mostra_futura, email_finta):
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente)
    assert len(email_finta) == 1
    assert email_finta[0]["destinatario"] == "mario.rossi@test.it"
    assert email_finta[0]["nome"] == "Mario"
    assert email_finta[0]["titolo_mostra"] == "Mostra futura"
    assert str(email_finta[0]["data_fine"]) == "2099-12-31"


def test_prenotazione_con_telefono_diverso(client, auth, utente, mostra_futura):
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura, "telefono": " 0612345678 "}, headers=utente)
    assert r.status_code == 201
    assert client.get("/api/prenotazioni", headers=auth).json()[0]["telefono"] == "0612345678"


@pytest.mark.parametrize("telefono", ["333-123", "12345", "1" * 16, "06abc12345"])
def test_prenotazione_telefono_non_valido(client, utente, mostra_futura, email_finta, telefono):
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura, "telefono": telefono}, headers=utente)
    assert r.status_code == 422
    assert "da 6 a 15 cifre" in r.json()["detail"]
    assert email_finta == []


def test_prenotazione_campo_mancante(client, utente):
    r = client.post("/api/prenota", json={}, headers=utente)
    assert r.status_code == 422
    assert "mostra_id" in r.json()["detail"]


def test_prenotazione_mostra_inesistente(client, utente):
    r = client.post("/api/prenota", json={"mostra_id": 9999}, headers=utente)
    assert r.status_code == 404


def test_prenotazione_mostra_conclusa(client, utente, mostra_conclusa, email_finta):
    r = client.post("/api/prenota", json={"mostra_id": mostra_conclusa}, headers=utente)
    assert r.status_code == 400
    assert "conclusa" in r.json()["detail"]
    assert email_finta == []


def test_elenco_prenotazioni_richiede_admin(client, utente):
    assert client.get("/api/prenotazioni").status_code == 401
    # nemmeno un visitatore può vedere le prenotazioni di tutti
    assert client.get("/api/prenotazioni", headers=utente).status_code == 401


def test_elenco_prenotazioni_filtrato_per_mostra(client, auth, utente, mostra_futura):
    altra = client.get("/api/mostre").json()[0]["id"]
    luigi = registra_utente(client, email="luigi@test.it", nome="Luigi")
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente)
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=luigi)
    client.post("/api/prenota", json={"mostra_id": altra}, headers=luigi)

    tutte = client.get("/api/prenotazioni", headers=auth).json()
    filtrate = client.get(f"/api/prenotazioni?mostra_id={mostra_futura}", headers=auth).json()
    assert len(tutte) == 3
    assert len(filtrate) == 2
    assert all(p["mostra_id"] == mostra_futura for p in filtrate)


def test_elenco_prenotazioni_dalla_piu_recente(client, auth, mostra_futura):
    primo = registra_utente(client, email="primo@test.it", nome="Primo")
    secondo = registra_utente(client, email="secondo@test.it", nome="Secondo")
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=primo)
    client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=secondo)
    nomi = [p["nome"] for p in client.get("/api/prenotazioni", headers=auth).json()]
    assert nomi == ["Secondo", "Primo"]


def test_prenotazione_senza_account_rifiutata(client, mostra_futura, email_finta):
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura})
    assert r.status_code == 401
    assert email_finta == []


def test_una_sola_prenotazione_per_mostra(client, auth, utente, mostra_futura, mostra_in_corso, email_finta):
    assert client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente).status_code == 201
    r = client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente)
    assert r.status_code == 409
    assert r.json()["detail"] == "Ti sei già prenotato a questa mostra."
    # nessuna seconda prenotazione e nessuna seconda email; su un'altra mostra invece si può
    assert len(client.get("/api/prenotazioni", headers=auth).json()) == 1
    assert len(email_finta) == 1
    assert client.post("/api/prenota", json={"mostra_id": mostra_in_corso}, headers=utente).status_code == 201


# --- annullamento da parte del visitatore ---
def _prenota(client, headers, mostra_id):
    r = client.post("/api/prenota", json={"mostra_id": mostra_id}, headers=headers)
    assert r.status_code == 201
    return r.json()["id"]


def test_annulla_prenotazione_invia_email(client, auth, utente, mostra_futura, email_annullamento):
    pid = _prenota(client, utente, mostra_futura)
    r = client.delete(f"/api/utenti/me/prenotazioni/{pid}", headers=utente)
    assert r.status_code == 200
    assert "annullata" in r.json()["message"]
    assert client.get("/api/utenti/me/prenotazioni", headers=utente).json() == []
    assert client.get("/api/prenotazioni", headers=auth).json() == []
    assert len(email_annullamento) == 1
    assert email_annullamento[0]["destinatario"] == "mario.rossi@test.it"
    assert email_annullamento[0]["titolo_mostra"] == "Mostra futura"


def test_dopo_l_annullamento_ci_si_puo_riprenotare(client, utente, mostra_futura):
    pid = _prenota(client, utente, mostra_futura)
    client.delete(f"/api/utenti/me/prenotazioni/{pid}", headers=utente)
    assert client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente).status_code == 201


def test_non_si_annulla_la_prenotazione_di_un_altro(client, utente, mostra_futura, email_annullamento):
    from tests.conftest import registra_utente

    pid = _prenota(client, utente, mostra_futura)
    anna = registra_utente(client, email="anna@test.it", nome="Anna", cognome="Bianchi")
    assert client.delete(f"/api/utenti/me/prenotazioni/{pid}", headers=anna).status_code == 404
    assert len(client.get("/api/utenti/me/prenotazioni", headers=utente).json()) == 1
    assert email_annullamento == []


def test_annullamento_richiede_visitatore(client, auth, utente, mostra_futura):
    pid = _prenota(client, utente, mostra_futura)
    assert client.delete(f"/api/utenti/me/prenotazioni/{pid}").status_code == 401
    assert client.delete(f"/api/utenti/me/prenotazioni/{pid}", headers=auth).status_code == 403
    assert client.delete("/api/utenti/me/prenotazioni/9999", headers=utente).status_code == 404
