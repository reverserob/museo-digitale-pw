# Test "unitari": controllano le singole funzioni di validazione senza passare dalle API
import pytest
from pydantic import ValidationError

from schemas import PrenotazioneCreate, RegistrazioneRequest, valida_date


def test_date_valide():
    valida_date("2026-01-01", "2026-12-31")
    valida_date("2026-05-10", "2026-05-10")  # stessa data: ammessa


def test_date_invertite():
    with pytest.raises(ValueError, match="data di fine"):
        valida_date("2026-12-31", "2026-01-01")


@pytest.mark.parametrize("data", ["01/01/2026", "2026-13-01", "domani", ""])
def test_date_formato_errato(data):
    with pytest.raises(ValueError, match="AAAA-MM-GG"):
        valida_date(data, "2026-12-31")


def test_registrazione_pulisce_spazi_e_maiuscole():
    r = RegistrazioneRequest(
        nome=" Anna ", cognome="Bianchi", email="ANNA@Test.IT", telefono=" 0612345678 ", password="password-sicura"
    )
    assert r.nome == "Anna"
    assert r.email == "anna@test.it"
    assert r.telefono == "0612345678"


@pytest.mark.parametrize(
    "campo, valore",
    [("nome", "A"), ("telefono", "06abc12345"), ("password", "corta"), ("email", "non-una-email")],
)
def test_registrazione_dati_non_validi(campo, valore):
    dati = {
        "nome": "Anna",
        "cognome": "Bianchi",
        "email": "anna@test.it",
        "telefono": "0612345678",
        "password": "password-sicura",
    }
    dati[campo] = valore
    with pytest.raises(ValidationError):
        RegistrazioneRequest(**dati)


def test_prenotazione_telefono_facoltativo():
    assert PrenotazioneCreate(mostra_id=1).telefono is None
    assert PrenotazioneCreate(mostra_id=1, telefono=" 0612345678 ").telefono == "0612345678"
    with pytest.raises(ValidationError):
        PrenotazioneCreate(mostra_id=1, telefono="06abc12345")
