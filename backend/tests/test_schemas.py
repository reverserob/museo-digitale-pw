# Test "unitari": controllano le singole funzioni di validazione senza passare dalle API
import pytest
from pydantic import ValidationError

from schemas import PrenotazioneCreate, valida_date


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


def test_prenotazione_pulisce_spazi_e_maiuscole():
    p = PrenotazioneCreate(mostra_id=1, nome=" Anna ", cognome="Bianchi", email="ANNA@Test.IT", telefono=" 0612345678 ")
    assert p.nome == "Anna"
    assert p.email == "anna@test.it"
    assert p.telefono == "0612345678"


def test_prenotazione_telefono_con_lettere():
    with pytest.raises(ValidationError):
        PrenotazioneCreate(mostra_id=1, nome="Anna", cognome="Bianchi", email="anna@test.it", telefono="06abc12345")
