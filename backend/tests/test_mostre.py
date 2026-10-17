"""Test delle API delle mostre: elenco, dettaglio, creazione con immagini, modifica ed eliminazione."""

import json
from pathlib import Path

from tests.conftest import PNG_FINTO

DATI_MOSTRA = {
    "titolo": "Nuova mostra",
    "descrizione": "Descrizione della nuova mostra",
    "data_inizio": "2099-03-01",
    "data_fine": "2099-06-30",
}


def immagine(nome="foto.png", contenuto=PNG_FINTO, tipo="image/png"):
    # tupla nel formato richiesto da TestClient per caricare un file multipart
    return ("immagini", (nome, contenuto, tipo))


# read
def test_elenco_contiene_le_mostre_del_seeding(client):
    attese = json.loads((Path(__file__).parent.parent / "data" / "mostre.json").read_text(encoding="utf-8"))
    r = client.get("/api/mostre")
    assert r.status_code == 200
    titoli = {m["titolo"] for m in r.json()}
    assert titoli == {m["titolo"] for m in attese}


def test_elenco_ordinato_per_data_inizio(client):
    date = [m["data_inizio"] for m in client.get("/api/mostre").json()]
    assert date == sorted(date)


def test_seeding_immagini_multiple_come_stringa(client):
    leonardo = next(m for m in client.get("/api/mostre").json() if m["titolo"].startswith("Leonardo"))
    assert leonardo["immagini"].count(",") == 2
    assert all(p.startswith("/static/uploads/") for p in leonardo["immagini"].split(","))


def test_dettaglio_mostra(client):
    r = client.get("/api/mostre/1")
    assert r.status_code == 200
    assert r.json()["id"] == 1


def test_dettaglio_mostra_inesistente(client):
    r = client.get("/api/mostre/9999")
    assert r.status_code == 404
    assert r.json()["detail"] == "Mostra non trovata"


# create
def test_crea_mostra(client, auth, cartella_upload):
    r = client.post("/api/mostre", data=DATI_MOSTRA, files=[immagine()], headers=auth)
    assert r.status_code == 201
    mostra = r.json()
    assert mostra["titolo"] == "Nuova mostra"
    percorso = mostra["immagini"]
    assert percorso.startswith("/static/uploads/") and percorso.endswith(".png")
    # il file è stato davvero salvato
    assert (cartella_upload / Path(percorso).name).read_bytes() == PNG_FINTO
    # e compare nell'elenco
    assert any(m["id"] == mostra["id"] for m in client.get("/api/mostre").json())


def test_crea_mostra_con_piu_immagini(client, auth):
    files = [immagine("a.png"), immagine("b.jpg", tipo="image/jpeg")]
    r = client.post("/api/mostre", data=DATI_MOSTRA, files=files, headers=auth)
    assert r.status_code == 201
    assert len(r.json()["immagini"].split(",")) == 2


def test_upload_nome_file_generato_dal_server(client, auth, cartella_upload):
    # un nome "malevolo" non deve far scrivere il file fuori dalla cartella
    r = client.post("/api/mostre", data=DATI_MOSTRA, files=[immagine("../../main.png")], headers=auth)
    assert r.status_code == 201
    salvati = list(cartella_upload.iterdir())
    assert len(salvati) == 1
    assert ".." not in salvati[0].name and len(salvati[0].stem) == 32


def test_crea_mostra_file_non_immagine(client, auth):
    r = client.post("/api/mostre", data=DATI_MOSTRA, files=[immagine("doc.txt", b"ciao", "text/plain")], headers=auth)
    assert r.status_code == 400
    assert "non è un'immagine" in r.json()["detail"]


def test_crea_mostra_immagine_troppo_grande(client, auth, monkeypatch):
    import settings

    monkeypatch.setattr(settings, "UPLOAD_MAX_MB", 0)
    r = client.post("/api/mostre", data=DATI_MOSTRA, files=[immagine()], headers=auth)
    assert r.status_code == 400
    assert "supera il limite" in r.json()["detail"]


def test_crea_mostra_date_invertite(client, auth):
    dati = {**DATI_MOSTRA, "data_inizio": "2099-06-30", "data_fine": "2099-03-01"}
    r = client.post("/api/mostre", data=dati, files=[immagine()], headers=auth)
    assert r.status_code == 400
    assert "data di fine" in r.json()["detail"]


def test_crea_mostra_data_non_valida(client, auth):
    dati = {**DATI_MOSTRA, "data_inizio": "31/12/2099"}
    r = client.post("/api/mostre", data=dati, files=[immagine()], headers=auth)
    assert r.status_code == 400


def test_crea_mostra_titolo_troppo_corto(client, auth):
    r = client.post("/api/mostre", data={**DATI_MOSTRA, "titolo": "ab"}, files=[immagine()], headers=auth)
    assert r.status_code == 422
    assert "titolo" in r.json()["detail"]


def test_crea_mostra_senza_immagini(client, auth):
    r = client.post("/api/mostre", data=DATI_MOSTRA, headers=auth)
    assert r.status_code == 422


# edit
def test_modifica_senza_immagini_mantiene_le_vecchie(client, auth):
    prima = client.get("/api/mostre/1").json()
    r = client.put("/api/mostre/1", data={**DATI_MOSTRA, "titolo": "Titolo modificato"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["titolo"] == "Titolo modificato"
    assert r.json()["immagini"] == prima["immagini"]


def crea_mostra_con_tre_immagini(client, auth):
    files = [immagine("a.png"), immagine("b.png"), immagine("c.png")]
    corpo = client.post("/api/mostre", data=DATI_MOSTRA, files=files, headers=auth).json()
    return corpo["id"], corpo["immagini"].split(",")


def test_modifica_con_nuove_immagini_le_aggiunge(client, auth):
    prima = client.get("/api/mostre/1").json()["immagini"].split(",")
    r = client.put("/api/mostre/1", data=DATI_MOSTRA, files=[immagine()], headers=auth)
    assert r.status_code == 200
    dopo = r.json()["immagini"].split(",")
    # le vecchie restano, la nuova va in coda
    assert dopo[: len(prima)] == prima
    assert len(dopo) == len(prima) + 1
    assert dopo[-1].endswith(".png")


def test_modifica_rimuove_solo_le_immagini_non_tenute(client, auth):
    mostra_id, (a, b, c) = crea_mostra_con_tre_immagini(client, auth)
    r = client.put(
        f"/api/mostre/{mostra_id}", data={**DATI_MOSTRA, "immagini_esistenti": json.dumps([a, c])}, headers=auth
    )
    assert r.status_code == 200
    assert r.json()["immagini"].split(",") == [a, c]


def test_modifica_tiene_alcune_immagini_e_ne_aggiunge_altre(client, auth):
    mostra_id, (a, b, c) = crea_mostra_con_tre_immagini(client, auth)
    r = client.put(
        f"/api/mostre/{mostra_id}",
        data={**DATI_MOSTRA, "immagini_esistenti": json.dumps([b])},
        files=[immagine("d.png")],
        headers=auth,
    )
    nuove = r.json()["immagini"].split(",")
    assert len(nuove) == 2
    assert nuove[0] == b
    assert nuove[1] not in (a, b, c)


def test_modifica_ignora_percorsi_non_della_mostra(client, auth):
    mostra_id, (a, b, c) = crea_mostra_con_tre_immagini(client, auth)
    dati = {**DATI_MOSTRA, "immagini_esistenti": json.dumps([a, "/static/uploads/altro.png", "../../segreto", a])}
    r = client.put(f"/api/mostre/{mostra_id}", data=dati, headers=auth)
    assert r.json()["immagini"] == a


def test_modifica_senza_nessuna_immagine_rifiutata(client, auth):
    mostra_id, _ = crea_mostra_con_tre_immagini(client, auth)
    r = client.put(f"/api/mostre/{mostra_id}", data={**DATI_MOSTRA, "immagini_esistenti": "[]"}, headers=auth)
    assert r.status_code == 400
    assert "almeno un'immagine" in r.json()["detail"]
    # la mostra non è stata modificata
    assert len(client.get(f"/api/mostre/{mostra_id}").json()["immagini"].split(",")) == 3


def test_modifica_mostra_inesistente(client, auth):
    r = client.put("/api/mostre/9999", data=DATI_MOSTRA, headers=auth)
    assert r.status_code == 404


# delete
def test_elimina_mostra(client, auth):
    r = client.delete("/api/mostre/1", headers=auth)
    assert r.status_code == 200
    assert client.get("/api/mostre/1").status_code == 404


def test_elimina_mostra_inesistente(client, auth):
    assert client.delete("/api/mostre/9999", headers=auth).status_code == 404


def test_elimina_mostra_cancella_le_prenotazioni(client, auth, utente, mostra_futura):
    assert client.post("/api/prenota", json={"mostra_id": mostra_futura}, headers=utente).status_code == 201
    assert len(client.get("/api/prenotazioni", headers=auth).json()) == 1

    client.delete(f"/api/mostre/{mostra_futura}", headers=auth)
    assert client.get("/api/prenotazioni", headers=auth).json() == []


def test_modifica_elenco_immagini_non_valido(client, auth):
    r = client.put("/api/mostre/1", data={**DATI_MOSTRA, "immagini_esistenti": "non-json"}, headers=auth)
    assert r.status_code == 400
