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


# --- nuove email: registrazione, registrazione doppia, reset password ---
def test_html_registrazione_escapa_il_nome():
    corpo = email_service.crea_html_registrazione("Anna <script>")
    assert "Anna &lt;script&gt;" in corpo
    assert "<script>" not in corpo
    assert "registrazione" in corpo


def test_html_gia_registrato():
    corpo = email_service.crea_html_gia_registrato("Anna")
    assert "già registrato" in corpo


def test_html_reset_contiene_il_link_e_la_durata():
    corpo = email_service.crea_html_reset_password("Anna", "https://sito.it/reimposta-password?token=a.b", 30)
    assert 'href="https://sito.it/reimposta-password?token=a.b"' in corpo
    assert "30 minuti" in corpo


def test_reset_senza_servizio_email_scrive_il_link_nel_log(monkeypatch, caplog):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_USER", "")
    with caplog.at_level("WARNING", logger="uvicorn.error"):
        email_service.invia_email_reset_password("anna@test.it", "Anna", "https://sito.it/x?token=t", 30)
    assert "https://sito.it/x?token=t" in caplog.text


def test_registrazione_inviata_con_brevo(monkeypatch, richieste_brevo):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    email_service.invia_email_registrazione("anna@test.it", "Anna")
    assert len(richieste_brevo) == 1
    corpo = json.loads(richieste_brevo[0].data)
    assert corpo["subject"] == "Registrazione completata"
    assert corpo["to"][0]["email"] == "anna@test.it"


def test_html_annullamento():
    corpo = email_service.crea_html_annullamento("Anna <b>", "Monet", date(2027, 1, 1), date(2027, 2, 1))
    assert "annullata" in corpo
    assert "Anna &lt;b&gt;" in corpo
    assert "Monet" in corpo


def test_annullamento_inviato_con_brevo(monkeypatch, richieste_brevo):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    email_service.invia_email_annullamento("anna@test.it", "Anna", "Monet", date(2027, 1, 1), date(2027, 2, 1))
    corpo = json.loads(richieste_brevo[0].data)
    assert corpo["subject"] == "Prenotazione annullata: Monet"


def test_brevo_aggiunge_reply_to(monkeypatch, richieste_brevo):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "chiave")
    email_service.invia_con_brevo("museo@test.it", "Museo", "Oggetto", "<p>x</p>", "mario@test.it")
    assert json.loads(richieste_brevo[0].data)["replyTo"] == {"email": "mario@test.it"}
