# Test del servizio email: nessuna email viene inviata davvero,
# le chiamate a Brevo e a SMTP vengono sostituite da funzioni finte.
import json
from datetime import date

import pytest

import settings
from services import email_service

DATI = dict(
    destinatario="mario@test.it",
    nome="Mario <b>",
    titolo_mostra="Monet",
    data_inizio=date(2027, 1, 1),
    data_fine=date(2027, 2, 1),
)


class RispostaFinta:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return b'{"messageId": "123"}'


@pytest.fixture
def richieste_brevo(monkeypatch):
    inviate = []

    def urlopen_finto(richiesta, timeout):
        inviate.append(richiesta)
        return RispostaFinta()

    monkeypatch.setattr(email_service.urllib.request, "urlopen", urlopen_finto)
    return inviate


@pytest.fixture
def invii_smtp(monkeypatch):
    inviati = []
    monkeypatch.setattr(email_service, "invia_con_smtp", lambda *args: inviati.append(args))
    return inviati


def test_con_brevo_api_key_usa_brevo(monkeypatch, richieste_brevo, invii_smtp):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave-test")
    monkeypatch.setattr(settings, "EMAIL_MITTENTE", "museo@test.it")
    email_service.invia_email_background(**DATI)

    assert len(richieste_brevo) == 1 and invii_smtp == []
    richiesta = richieste_brevo[0]
    assert richiesta.full_url == "https://api.brevo.com/v3/smtp/email"
    assert richiesta.get_header("Api-key") == "chiave-test"
    corpo = json.loads(richiesta.data)
    assert corpo["sender"]["email"] == "museo@test.it"
    assert corpo["to"] == [{"email": "mario@test.it", "name": "Mario <b>"}]
    assert corpo["subject"] == "Conferma Prenotazione: Monet"
    # il nome dell'utente è "escapato" nell'HTML
    assert "Mario &lt;b&gt;" in corpo["htmlContent"]
    assert "Dal 2027-01-01 al 2027-02-01" in corpo["htmlContent"]


def test_senza_brevo_usa_smtp(monkeypatch, richieste_brevo, invii_smtp):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_USER", "museo@gmail.com")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "password")
    email_service.invia_email_background(**DATI)

    assert len(invii_smtp) == 1 and richieste_brevo == []
    assert invii_smtp[0][0] == "mario@test.it"


def test_senza_configurazione_non_invia_nulla(monkeypatch, richieste_brevo, invii_smtp):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_USER", "")
    email_service.invia_email_background(**DATI)
    assert richieste_brevo == [] and invii_smtp == []


def test_errore_di_brevo_non_blocca_il_server(monkeypatch):
    # se Brevo risponde con un errore, viene solo scritto nel log (nessuna eccezione)
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave-sbagliata")

    def urlopen_errore(richiesta, timeout):
        raise email_service.urllib.error.HTTPError(richiesta.full_url, 401, "Unauthorized", {}, None)

    monkeypatch.setattr(email_service.urllib.request, "urlopen", urlopen_errore)
    email_service.invia_email_background(**DATI)
