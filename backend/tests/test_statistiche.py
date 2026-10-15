from datetime import date, datetime

import models
from database import SessionLocal
from services.statistiche_service import stato_mostra


def prenota(client, mostra_id):
    dati = {"mostra_id": mostra_id, "nome": "Mario", "cognome": "Rossi", "email": "m@test.it", "telefono": "3331234567"}
    assert client.post("/api/prenota", json=dati).status_code == 201


def recensisci(client, mostra_id, voto):
    dati = {"mostra_id": mostra_id, "nome": "Giulia", "voto": voto}
    assert client.post("/api/feedback", json=dati).status_code == 201


def test_statistiche_richiedono_admin(client):
    assert client.get("/api/statistiche").status_code == 401


def test_statistiche_database_iniziale(client, auth):
    s = client.get("/api/statistiche", headers=auth).json()
    # le mostre del seed sono tutte contate, ma non ci sono ancora prenotazioni o feedback
    assert s["totale_mostre"] == len(s["per_mostra"]) > 0
    assert s["mostre_in_corso"] + s["mostre_future"] + s["mostre_concluse"] == s["totale_mostre"]
    assert s["totale_prenotazioni"] == 0
    assert s["totale_feedback"] == 0
    assert s["voto_medio"] is None


def test_statistiche_conteggi(client, auth, mostra_futura, mostra_in_corso):
    prenota(client, mostra_futura)
    prenota(client, mostra_futura)
    prenota(client, mostra_in_corso)
    recensisci(client, mostra_in_corso, 5)
    recensisci(client, mostra_in_corso, 4)

    s = client.get("/api/statistiche", headers=auth).json()
    assert s["totale_prenotazioni"] == 3
    assert s["prenotazioni_ultimi_7_giorni"] == 3
    assert s["totale_feedback"] == 2
    assert s["voto_medio"] == 4.5

    per_id = {m["mostra_id"]: m for m in s["per_mostra"]}
    assert per_id[mostra_futura]["prenotazioni"] == 2
    assert per_id[mostra_futura]["stato"] == "futura"
    assert per_id[mostra_futura]["voto_medio"] is None
    assert per_id[mostra_in_corso]["prenotazioni"] == 1
    assert per_id[mostra_in_corso]["feedback"] == 2
    assert per_id[mostra_in_corso]["stato"] == "in corso"


def test_stato_mostra():
    oggi = date(2026, 6, 15)
    m = models.Mostra(data_inizio=date(2026, 6, 1), data_fine=date(2026, 6, 30))
    assert stato_mostra(m, oggi) == "in corso"
    m.data_inizio = date(2026, 7, 1)
    m.data_fine = date(2026, 7, 31)
    assert stato_mostra(m, oggi) == "futura"
    m.data_inizio = date(2026, 5, 1)
    m.data_fine = date(2026, 5, 31)
    assert stato_mostra(m, oggi) == "conclusa"
    # l'ultimo giorno la mostra è ancora in corso
    m.data_fine = oggi
    assert stato_mostra(m, oggi) == "in corso"


def test_prenotazioni_vecchie_escluse_dagli_ultimi_7_giorni(client, auth, mostra_futura):
    db = SessionLocal()
    db.add(
        models.Prenotazione(
            mostra_id=mostra_futura,
            nome="Anna",
            cognome="Bianchi",
            email="a@test.it",
            telefono="3330000000",
            creata_il=datetime(2020, 1, 1),
        )
    )
    db.commit()
    db.close()

    s = client.get("/api/statistiche", headers=auth).json()
    assert s["totale_prenotazioni"] == 1
    assert s["prenotazioni_ultimi_7_giorni"] == 0
