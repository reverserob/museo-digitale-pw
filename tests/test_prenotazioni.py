import pytest


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


def test_prenotazione_valida(client, auth, mostra_futura):
    r = client.post("/api/prenota", json=dati_validi(mostra_futura))
    assert r.status_code == 201
    assert "id" in r.json()

    salvate = client.get("/api/prenotazioni", headers=auth).json()
    assert len(salvate) == 1
    assert salvate[0]["nome"] == "Mario"
    assert salvate[0]["mostra_id"] == mostra_futura


def test_prenotazione_avvia_invio_email(client, mostra_futura, email_finta):
    client.post("/api/prenota", json=dati_validi(mostra_futura))
    assert len(email_finta) == 1
    assert email_finta[0]["destinatario"] == "mario.rossi@test.it"
    assert email_finta[0]["titolo_mostra"] == "Mostra futura"
    assert str(email_finta[0]["data_fine"]) == "2099-12-31"


def test_prenotazione_normalizza_i_dati(client, auth, mostra_futura):
    dati = dati_validi(mostra_futura, nome="  Mario  ", email="Mario.Rossi@TEST.it", telefono=" 3331234567 ")
    assert client.post("/api/prenota", json=dati).status_code == 201
    salvata = client.get("/api/prenotazioni", headers=auth).json()[0]
    assert salvata["nome"] == "Mario"
    assert salvata["email"] == "mario.rossi@test.it"
    assert salvata["telefono"] == "3331234567"


@pytest.mark.parametrize(
    "campo, valore, messaggio",
    [
        ("nome", "Al", "almeno 3 caratteri"),
        ("cognome", "  ", "almeno 3 caratteri"),
        ("nome", "x" * 101, "al massimo 100"),
        ("email", "non-una-email", "email"),
        ("telefono", "333-123", "da 6 a 15 cifre"),
        ("telefono", "12345", "da 6 a 15 cifre"),
        ("telefono", "1" * 16, "da 6 a 15 cifre"),
    ],
)
def test_prenotazione_dati_non_validi(client, mostra_futura, email_finta, campo, valore, messaggio):
    r = client.post("/api/prenota", json=dati_validi(mostra_futura, **{campo: valore}))
    assert r.status_code == 422
    assert messaggio in r.json()["detail"]
    # con dati non validi non parte nessuna email
    assert email_finta == []


def test_prenotazione_campo_mancante(client, mostra_futura):
    dati = dati_validi(mostra_futura)
    del dati["email"]
    r = client.post("/api/prenota", json=dati)
    assert r.status_code == 422
    assert "email" in r.json()["detail"]


def test_prenotazione_mostra_inesistente(client):
    r = client.post("/api/prenota", json=dati_validi(9999))
    assert r.status_code == 404


def test_prenotazione_mostra_conclusa(client, mostra_conclusa, email_finta):
    r = client.post("/api/prenota", json=dati_validi(mostra_conclusa))
    assert r.status_code == 400
    assert "conclusa" in r.json()["detail"]
    assert email_finta == []


def test_elenco_prenotazioni_filtrato_per_mostra(client, auth, mostra_futura):
    altra = client.get("/api/mostre").json()[0]["id"]
    client.post("/api/prenota", json=dati_validi(mostra_futura))
    client.post("/api/prenota", json=dati_validi(mostra_futura, nome="Luigi"))
    client.post("/api/prenota", json=dati_validi(altra, nome="Anna"))

    tutte = client.get("/api/prenotazioni", headers=auth).json()
    filtrate = client.get(f"/api/prenotazioni?mostra_id={mostra_futura}", headers=auth).json()
    assert len(tutte) == 3
    assert len(filtrate) == 2
    assert all(p["mostra_id"] == mostra_futura for p in filtrate)


def test_elenco_prenotazioni_dalla_piu_recente(client, auth, mostra_futura):
    client.post("/api/prenota", json=dati_validi(mostra_futura, nome="Primo"))
    client.post("/api/prenota", json=dati_validi(mostra_futura, nome="Secondo"))
    nomi = [p["nome"] for p in client.get("/api/prenotazioni", headers=auth).json()]
    assert nomi == ["Secondo", "Primo"]
