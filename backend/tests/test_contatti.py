"""Test del modulo Contatti: solo i visitatori registrati possono scrivere, la richiesta arriva per email al museo."""

import pytest

import settings
from services import email_service

DATI = {
    "titolo": "Visite per scuole",
    "descrizione": "Organizzate visite guidate per classi delle superiori?",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "Mario.Rossi@test.it",
    "telefono": "3331234567",
}


@pytest.fixture
def invii(monkeypatch):
    """Simula un servizio email configurato e registra le richieste inviate."""
    inviate = []
    monkeypatch.setattr("routers.contatti.email_configurata", lambda: True)
    monkeypatch.setattr("routers.contatti.invia_email_contatto", lambda dati: inviate.append(dati) or True)
    return inviate


def test_contatto_inviato_alla_casella_del_museo(client, utente, invii):
    r = client.post("/api/contatti", json=DATI, headers=utente)
    assert r.status_code == 200
    assert "Richiesta inviata" in r.json()["message"]
    assert len(invii) == 1
    assert invii[0]["titolo"] == "Visite per scuole"
    assert invii[0]["email"] == "mario.rossi@test.it"


def test_contatto_senza_account_rifiutato(client, invii):
    assert client.post("/api/contatti", json=DATI).status_code == 401
    assert invii == []


def test_contatto_con_token_admin_rifiutato(client, auth, invii):
    assert client.post("/api/contatti", json=DATI, headers=auth).status_code == 403
    assert invii == []


@pytest.mark.parametrize(
    "campo, valore, messaggio",
    [
        ("titolo", "Ok", "almeno 3 caratteri"),
        ("titolo", "x" * 121, "al massimo 120"),
        ("descrizione", "Breve", "almeno 10 caratteri"),
        ("descrizione", "x" * 2001, "al massimo 2000"),
        ("nome", "A", "almeno 2 caratteri"),
        ("email", "non-una-email", "email"),
        ("telefono", "12ab", "da 6 a 15 cifre"),
    ],
)
def test_contatto_dati_non_validi(client, utente, invii, campo, valore, messaggio):
    r = client.post("/api/contatti", json={**DATI, campo: valore}, headers=utente)
    assert r.status_code == 422
    assert messaggio in r.json()["detail"]
    assert invii == []


def test_contatto_campo_mancante(client, utente, invii):
    dati = dict(DATI)
    del dati["telefono"]
    assert client.post("/api/contatti", json=dati, headers=utente).status_code == 422


def test_invio_fallito_restituisce_503(client, utente, monkeypatch):
    monkeypatch.setattr("routers.contatti.email_configurata", lambda: True)
    monkeypatch.setattr("routers.contatti.invia_email_contatto", lambda dati: False)
    r = client.post("/api/contatti", json=DATI, headers=utente)
    assert r.status_code == 503
    assert "Riprova più tardi" in r.json()["detail"]


def test_senza_servizio_email_la_richiesta_finisce_nel_log(client, utente, caplog):
    with caplog.at_level("WARNING", logger="uvicorn.error"):
        r = client.post("/api/contatti", json=DATI, headers=utente)
    assert r.status_code == 200
    assert "Visite per scuole" in caplog.text


def test_html_contatto_escapa_i_campi():
    corpo = email_service.crea_html_contatto({**DATI, "titolo": "<script>x</script>", "descrizione": "riga 1\nriga 2"})
    assert "<script>" not in corpo
    assert "&lt;script&gt;" in corpo
    assert "riga 1<br>riga 2" in corpo
    assert "3331234567" in corpo


def test_email_contatto_va_alla_casella_configurata_con_rispondi_a(monkeypatch):
    chiamate = []
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    monkeypatch.setattr(settings, "CONTATTI_EMAIL", "museo@test.it")
    monkeypatch.setattr(email_service, "invia_con_brevo", lambda *argomenti: chiamate.append(argomenti))
    assert email_service.invia_email_contatto({**DATI, "email": "mario.rossi@test.it"}) is True
    destinatario, _nome, oggetto, _html, rispondi_a, _allegati = chiamate[0]
    assert destinatario == "museo@test.it"
    assert oggetto == "[Contatti] Visite per scuole"
    assert rispondi_a == "mario.rossi@test.it"
