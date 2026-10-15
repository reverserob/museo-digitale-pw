import pytest


def feedback_valido(mostra_id, **modifiche):
    dati = {"mostra_id": mostra_id, "nome": "Giulia", "voto": 5, "commento": "Allestimento bellissimo"}
    dati.update(modifiche)
    return dati


def test_feedback_valido(client, mostra_in_corso):
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso))
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["voto"] == 5
    assert corpo["mostra_id"] == mostra_in_corso


def test_feedback_su_mostra_conclusa_consentito(client, mostra_conclusa):
    assert client.post("/api/feedback", json=feedback_valido(mostra_conclusa)).status_code == 201


def test_feedback_su_mostra_futura_rifiutato(client, mostra_futura):
    r = client.post("/api/feedback", json=feedback_valido(mostra_futura))
    assert r.status_code == 400
    assert "non è ancora iniziata" in r.json()["detail"]


def test_feedback_mostra_inesistente(client):
    assert client.post("/api/feedback", json=feedback_valido(9999)).status_code == 404


def test_feedback_commento_facoltativo(client, mostra_in_corso):
    dati = feedback_valido(mostra_in_corso)
    del dati["commento"]
    r = client.post("/api/feedback", json=dati)
    assert r.status_code == 201
    assert r.json()["commento"] == ""


@pytest.mark.parametrize(
    "campo, valore, messaggio",
    [
        ("voto", 0, "tra 1 e 5"),
        ("voto", 6, "tra 1 e 5"),
        ("nome", " A ", "almeno 2 caratteri"),
        ("nome", "x" * 61, "al massimo 60"),
        ("commento", "x" * 501, "al massimo 500"),
    ],
)
def test_feedback_dati_non_validi(client, mostra_in_corso, campo, valore, messaggio):
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso, **{campo: valore}))
    assert r.status_code == 422
    assert messaggio in r.json()["detail"]


def test_lista_feedback_filtrata_per_mostra(client, mostra_in_corso, mostra_conclusa):
    client.post("/api/feedback", json=feedback_valido(mostra_in_corso))
    client.post("/api/feedback", json=feedback_valido(mostra_in_corso, voto=3))
    client.post("/api/feedback", json=feedback_valido(mostra_conclusa))

    assert len(client.get("/api/feedback").json()) == 3
    filtrati = client.get(f"/api/feedback?mostra_id={mostra_in_corso}").json()
    assert len(filtrati) == 2
    assert all(f["mostra_id"] == mostra_in_corso for f in filtrati)


def test_elimina_feedback_richiede_admin(client, auth, mostra_in_corso):
    feedback_id = client.post("/api/feedback", json=feedback_valido(mostra_in_corso)).json()["id"]

    assert client.delete(f"/api/feedback/{feedback_id}").status_code == 401
    assert client.delete(f"/api/feedback/{feedback_id}", headers=auth).status_code == 200
    assert client.get("/api/feedback").json() == []
    assert client.delete(f"/api/feedback/{feedback_id}", headers=auth).status_code == 404


def test_eliminando_la_mostra_spariscono_i_feedback(client, auth, mostra_in_corso):
    client.post("/api/feedback", json=feedback_valido(mostra_in_corso))
    client.delete(f"/api/mostre/{mostra_in_corso}", headers=auth)
    assert client.get("/api/feedback").json() == []
