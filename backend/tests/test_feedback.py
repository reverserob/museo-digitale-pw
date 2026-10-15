import pytest

from tests.conftest import registra_utente


def feedback_valido(mostra_id, **modifiche):
    dati = {"mostra_id": mostra_id, "voto": 5, "commento": "Allestimento bellissimo"}
    dati.update(modifiche)
    return dati


def test_feedback_valido(client, utente, mostra_in_corso):
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso), headers=utente)
    assert r.status_code == 201
    corpo = r.json()
    assert corpo["voto"] == 5
    assert corpo["mostra_id"] == mostra_in_corso
    # nel feedback pubblico compaiono nome e iniziale del cognome, non l'email
    assert corpo["nome"] == "Mario R."
    assert "email" not in corpo


def test_feedback_senza_login_rifiutato(client, mostra_in_corso):
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso))
    assert r.status_code == 401


def test_feedback_con_token_admin_rifiutato(client, auth, mostra_in_corso):
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso), headers=auth)
    assert r.status_code == 403


def test_un_solo_feedback_per_mostra(client, utente, mostra_in_corso, mostra_conclusa):
    assert client.post("/api/feedback", json=feedback_valido(mostra_in_corso), headers=utente).status_code == 201
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso, voto=3), headers=utente)
    assert r.status_code == 409
    assert "già lasciato" in r.json()["detail"]
    # su un'altra mostra invece si può
    assert client.post("/api/feedback", json=feedback_valido(mostra_conclusa), headers=utente).status_code == 201


def test_feedback_su_mostra_conclusa_consentito(client, utente, mostra_conclusa):
    assert client.post("/api/feedback", json=feedback_valido(mostra_conclusa), headers=utente).status_code == 201


def test_feedback_su_mostra_futura_rifiutato(client, utente, mostra_futura):
    r = client.post("/api/feedback", json=feedback_valido(mostra_futura), headers=utente)
    assert r.status_code == 400
    assert "non è ancora iniziata" in r.json()["detail"]


def test_feedback_mostra_inesistente(client, utente):
    assert client.post("/api/feedback", json=feedback_valido(9999), headers=utente).status_code == 404


def test_feedback_commento_facoltativo(client, utente, mostra_in_corso):
    dati = feedback_valido(mostra_in_corso)
    del dati["commento"]
    r = client.post("/api/feedback", json=dati, headers=utente)
    assert r.status_code == 201
    assert r.json()["commento"] == ""


@pytest.mark.parametrize(
    "campo, valore, messaggio",
    [
        ("voto", 0, "tra 1 e 5"),
        ("voto", 6, "tra 1 e 5"),
        ("commento", "x" * 501, "al massimo 500"),
    ],
)
def test_feedback_dati_non_validi(client, utente, mostra_in_corso, campo, valore, messaggio):
    r = client.post("/api/feedback", json=feedback_valido(mostra_in_corso, **{campo: valore}), headers=utente)
    assert r.status_code == 422
    assert messaggio in r.json()["detail"]


def test_lista_feedback_pubblica_e_filtrata(client, utente, mostra_in_corso, mostra_conclusa):
    anna = registra_utente(client, email="anna@test.it", nome="Anna", cognome="Bianchi")
    client.post("/api/feedback", json=feedback_valido(mostra_in_corso), headers=utente)
    client.post("/api/feedback", json=feedback_valido(mostra_in_corso, voto=3), headers=anna)
    client.post("/api/feedback", json=feedback_valido(mostra_conclusa), headers=utente)

    assert len(client.get("/api/feedback").json()) == 3
    filtrati = client.get(f"/api/feedback?mostra_id={mostra_in_corso}").json()
    assert len(filtrati) == 2
    assert {f["nome"] for f in filtrati} == {"Mario R.", "Anna B."}


def test_elimina_feedback_richiede_admin(client, auth, utente, mostra_in_corso):
    feedback_id = client.post("/api/feedback", json=feedback_valido(mostra_in_corso), headers=utente).json()["id"]

    assert client.delete(f"/api/feedback/{feedback_id}").status_code == 401
    assert client.delete(f"/api/feedback/{feedback_id}", headers=utente).status_code == 401
    assert client.delete(f"/api/feedback/{feedback_id}", headers=auth).status_code == 200
    assert client.get("/api/feedback").json() == []
    assert client.delete(f"/api/feedback/{feedback_id}", headers=auth).status_code == 404


def test_eliminando_la_mostra_spariscono_i_feedback(client, auth, utente, mostra_in_corso):
    client.post("/api/feedback", json=feedback_valido(mostra_in_corso), headers=utente)
    client.delete(f"/api/mostre/{mostra_in_corso}", headers=auth)
    assert client.get("/api/feedback").json() == []


def test_seeding_inserisce_i_feedback_del_json():
    import models
    from database import SessionLocal, engine
    from services.seed_service import inserisci_dati_iniziali, leggi_mostre_json

    attesi = sum(len(m.get("feedback", [])) for m in leggi_mostre_json())
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    inserisci_dati_iniziali()

    db = SessionLocal()
    assert db.query(models.Feedback).count() == attesi
    db.close()
