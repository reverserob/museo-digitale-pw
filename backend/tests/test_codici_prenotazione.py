"""Test del codice di prenotazione, del QR code e della verifica all'ingresso (area riservata)."""

import base64
import json
import re
from datetime import date, datetime

import pytest
from sqlalchemy import create_engine, text

import models
import settings
from database import SessionLocal
from services import email_service
from services.migrazioni_service import aggiorna_schema
from services.prenotazioni_service import (
    genera_qr_png,
    normalizza_codice,
    stato_ingresso,
    url_verifica,
)
from tests.conftest import prenota_nel_db, registra_utente

FORMATO = re.compile(r"^MCD-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")
PNG = b"\x89PNG\r\n\x1a\n"


def prenota(client, headers, mostra_id):
    risposta = client.post("/api/prenota", json={"mostra_id": mostra_id}, headers=headers)
    assert risposta.status_code == 201, risposta.text
    return risposta.json()


# --- codice di riferimento ---


def test_la_prenotazione_restituisce_un_codice(client, utente, mostra_futura):
    dati = prenota(client, utente, mostra_futura)
    assert FORMATO.match(dati["codice"])


def test_codici_diversi_per_prenotazioni_diverse(client, mostra_futura, mostra_in_corso):
    mario = registra_utente(client)
    anna = registra_utente(client, email="anna@test.it", nome="Anna", cognome="Bianchi")
    codici = {
        prenota(client, mario, mostra_futura)["codice"],
        prenota(client, mario, mostra_in_corso)["codice"],
        prenota(client, anna, mostra_futura)["codice"],
    }
    assert len(codici) == 3


def test_email_di_conferma_riceve_codice_e_indirizzo_del_backend(client, utente, mostra_futura, email_finta):
    dati = prenota(client, utente, mostra_futura)
    assert email_finta[0]["codice"] == dati["codice"]
    assert email_finta[0]["url_backend"].startswith("http")


def test_area_personale_mostra_il_codice(client, utente, mostra_futura):
    dati = prenota(client, utente, mostra_futura)
    mie = client.get("/api/utenti/me/prenotazioni", headers=utente).json()
    assert mie[0]["codice"] == dati["codice"]
    assert mie[0]["ingresso_il"] is None


def test_elenco_admin_contiene_il_codice(client, auth, utente, mostra_futura):
    dati = prenota(client, utente, mostra_futura)
    elenco = client.get("/api/prenotazioni", headers=auth).json()
    assert elenco[0]["codice"] == dati["codice"]


@pytest.mark.parametrize(
    "scritto",
    ["MCD-7K3F-9QXA", "mcd-7k3f-9qxa", " mcd 7k3f 9qxa ", "7K3F9QXA", "MCD7K3F9QXA"],
)
def test_normalizza_codice_accetta_varianti(scritto):
    assert normalizza_codice(scritto) == "MCD-7K3F-9QXA"


@pytest.mark.parametrize("scritto", ["", "MCD-7K3F", "MCD-7K3F-9QXA-1", "MCD-0K3F-9QXA", "abc"])
def test_normalizza_codice_rifiuta_testi_non_validi(scritto):
    # lo 0 non fa parte dell'alfabeto dei codici (si confonde con la O)
    assert normalizza_codice(scritto) is None


# --- QR code ---


def test_qr_contiene_l_indirizzo_della_pagina_di_verifica():
    assert url_verifica("MCD-7K3F-9QXA") == f"{settings.FRONTEND_URL}/admin/verifica?codice=MCD-7K3F-9QXA"
    assert genera_qr_png("MCD-7K3F-9QXA").startswith(PNG)


def test_immagine_qr_pubblica(client, utente, mostra_futura):
    codice = prenota(client, utente, mostra_futura)["codice"]
    risposta = client.get(f"/api/prenotazioni/qr/{codice}")
    assert risposta.status_code == 200
    assert risposta.headers["content-type"] == "image/png"
    assert risposta.content.startswith(PNG)


@pytest.mark.parametrize("codice", ["MCD-AAAA-AAAA", "non-valido"])
def test_immagine_qr_di_codice_inesistente(client, codice):
    assert client.get(f"/api/prenotazioni/qr/{codice}").status_code == 404


# --- email ---


def test_email_contiene_codice_qr_e_allegato(monkeypatch):
    inviate = []
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    monkeypatch.setattr(email_service, "invia_con_brevo", lambda *argomenti: inviate.append(argomenti))
    email_service.invia_email_background(
        destinatario="mario@test.it",
        nome="Mario",
        titolo_mostra="Monet",
        data_inizio=date(2027, 1, 1),
        data_fine=date(2027, 2, 1),
        codice="MCD-7K3F-9QXA",
        url_backend="https://backend.test/",
    )
    _dest, _nome, _oggetto, corpo, _rispondi, allegati = inviate[0]
    assert "MCD-7K3F-9QXA" in corpo
    assert 'src="https://backend.test/api/prenotazioni/qr/MCD-7K3F-9QXA"' in corpo
    nome_file, contenuto = allegati[0]
    assert nome_file == "prenotazione-MCD-7K3F-9QXA.png"
    assert contenuto.startswith(PNG)


def test_brevo_riceve_l_allegato_in_base64(monkeypatch):
    richieste = []

    class Risposta:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            return b"{}"

    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    monkeypatch.setattr(email_service.urllib.request, "urlopen", lambda r, timeout: richieste.append(r) or Risposta())
    email_service.invia_con_brevo("a@test.it", "A", "Oggetto", "<p>x</p>", allegati=[("qr.png", PNG)])
    corpo = json.loads(richieste[0].data)
    assert corpo["attachment"] == [{"name": "qr.png", "content": base64.b64encode(PNG).decode()}]


# --- verifica all'ingresso ---


def test_verifica_richiede_admin(client, utente, mostra_in_corso):
    codice = prenota(client, utente, mostra_in_corso)["codice"]
    assert client.get(f"/api/prenotazioni/verifica/{codice}").status_code == 401
    # anche il visitatore titolare della prenotazione non può usare la verifica
    assert client.get(f"/api/prenotazioni/verifica/{codice}", headers=utente).status_code == 401


def test_verifica_con_codice_valido(client, auth, utente, mostra_in_corso):
    dati = prenota(client, utente, mostra_in_corso)
    r = client.get(f"/api/prenotazioni/verifica/{dati['codice'].lower()}", headers=auth)
    assert r.status_code == 200
    v = r.json()
    assert v["codice"] == dati["codice"]
    assert (v["nome"], v["cognome"]) == ("Mario", "Rossi")
    assert v["titolo_mostra"] == "Mostra in corso"
    assert v["stato"] == "valida"
    assert v["ingresso_il"] is None


def test_verifica_con_numero_della_prenotazione(client, auth, utente, mostra_in_corso):
    dati = prenota(client, utente, mostra_in_corso)
    v = client.get(f"/api/prenotazioni/verifica/{dati['id']}", headers=auth).json()
    assert v["codice"] == dati["codice"]


@pytest.mark.parametrize("riferimento", ["MCD-AAAA-AAAA", "999", "testo-qualsiasi"])
def test_verifica_prenotazione_inesistente(client, auth, riferimento):
    r = client.get(f"/api/prenotazioni/verifica/{riferimento}", headers=auth)
    assert r.status_code == 404
    assert r.json()["detail"] == "Nessuna prenotazione trovata con questo codice."


def test_stato_mostra_futura_e_conclusa(client, auth, utente, mostra_futura, mostra_conclusa):
    futura = prenota(client, utente, mostra_futura)["codice"]
    assert client.get(f"/api/prenotazioni/verifica/{futura}", headers=auth).json()["stato"] == "non_iniziata"
    prenota_nel_db(mostra_conclusa)
    db = SessionLocal()
    conclusa = db.query(models.Prenotazione).filter(models.Prenotazione.mostra_id == mostra_conclusa).one()
    conclusa.codice = "MCD-CCCC-CCCC"
    db.commit()
    db.close()
    assert client.get("/api/prenotazioni/verifica/MCD-CCCC-CCCC", headers=auth).json()["stato"] == "conclusa"


def test_registra_ingresso_una_sola_volta(client, auth, utente, mostra_in_corso):
    codice = prenota(client, utente, mostra_in_corso)["codice"]
    r = client.post(f"/api/prenotazioni/verifica/{codice}/ingresso", headers=auth)
    assert r.status_code == 200
    assert r.json()["stato"] == "gia_entrato"
    assert r.json()["ingresso_il"] is not None
    # un secondo ingresso con la stessa prenotazione viene rifiutato
    secondo = client.post(f"/api/prenotazioni/verifica/{codice}/ingresso", headers=auth)
    assert secondo.status_code == 409
    # l'ingresso compare anche nell'area personale del visitatore
    assert client.get("/api/utenti/me/prenotazioni", headers=utente).json()[0]["ingresso_il"] is not None


def test_ingresso_rifiutato_se_la_mostra_non_e_iniziata(client, auth, utente, mostra_futura):
    codice = prenota(client, utente, mostra_futura)["codice"]
    r = client.post(f"/api/prenotazioni/verifica/{codice}/ingresso", headers=auth)
    assert r.status_code == 400
    assert r.json()["detail"] == "La mostra non è ancora iniziata."


def test_ingresso_richiede_admin(client, utente, mostra_in_corso):
    codice = prenota(client, utente, mostra_in_corso)["codice"]
    assert client.post(f"/api/prenotazioni/verifica/{codice}/ingresso", headers=utente).status_code == 401


def test_stato_ingresso_unitario():
    mostra = models.Mostra(data_inizio=date(2027, 1, 1), data_fine=date(2027, 1, 31))
    p = models.Prenotazione(mostra=mostra)
    assert stato_ingresso(p, date(2026, 12, 31)) == "non_iniziata"
    assert stato_ingresso(p, date(2027, 1, 15)) == "valida"
    assert stato_ingresso(p, date(2027, 2, 1)) == "conclusa"
    p.ingresso_il = datetime(2027, 1, 15, 10, 0)
    assert stato_ingresso(p, date(2027, 1, 15)) == "gia_entrato"


# --- database esistenti ---


def test_migrazione_assegna_i_codici_alle_prenotazioni_esistenti(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'vecchio.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE utenti (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE feedback (id INTEGER PRIMARY KEY, nome TEXT)"))
        conn.execute(text("CREATE TABLE prenotazioni (id INTEGER PRIMARY KEY, nome TEXT)"))
        conn.execute(text("INSERT INTO prenotazioni (nome) VALUES ('Anna'), ('Luca')"))
    aggiorna_schema(engine)
    with engine.connect() as conn:
        codici = [r[0] for r in conn.execute(text("SELECT codice FROM prenotazioni"))]
        indici = {r[1] for r in conn.execute(text("PRAGMA index_list('prenotazioni')"))}
    assert len(codici) == 2 and len(set(codici)) == 2
    assert all(FORMATO.match(c) for c in codici)
    assert "ix_prenotazioni_codice" in indici
    # una seconda esecuzione non cambia i codici già assegnati
    aggiorna_schema(engine)
    with engine.connect() as conn:
        assert [r[0] for r in conn.execute(text("SELECT codice FROM prenotazioni"))] == codici


def test_prenotazione_usata_non_si_puo_annullare(client, auth, utente, mostra_in_corso):
    dati = prenota(client, utente, mostra_in_corso)
    client.post(f"/api/prenotazioni/verifica/{dati['codice']}/ingresso", headers=auth)
    r = client.delete(f"/api/utenti/me/prenotazioni/{dati['id']}", headers=utente)
    assert r.status_code == 409
    assert r.json()["detail"] == "La prenotazione è già stata usata per l'ingresso e non può essere annullata."


@pytest.mark.parametrize("url_backend", ["http://127.0.0.1:8000/", "http://localhost:8000", None])
def test_in_locale_il_qr_e_solo_in_allegato(monkeypatch, url_backend):
    inviate = []
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    monkeypatch.setattr(email_service, "invia_con_brevo", lambda *argomenti: inviate.append(argomenti))
    email_service.invia_email_background(
        destinatario="mario@test.it",
        nome="Mario",
        titolo_mostra="Monet",
        data_inizio=date(2027, 1, 1),
        data_fine=date(2027, 2, 1),
        codice="MCD-7K3F-9QXA",
        url_backend=url_backend,
    )
    _dest, _nome, _oggetto, corpo, _rispondi, allegati = inviate[0]
    # nessuna immagine con un indirizzo irraggiungibile: il QR code è solo in allegato
    assert "<img" not in corpo
    assert "che trovi in allegato" in corpo
    assert allegati[0][1].startswith(PNG)
