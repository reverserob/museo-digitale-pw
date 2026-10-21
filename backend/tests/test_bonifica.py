"""Test dello script di bonifica dei duplicati."""

import bonifica_duplicati


def test_bonifica_senza_duplicati(capsys):
    bonifica_duplicati.main([])
    assert "Nessun duplicato" in capsys.readouterr().out


def test_bonifica_simulazione_ed_esecuzione(capsys, monkeypatch):
    conteggi = iter([{"uq_prenotazioni_utente_mostra": 2}, {"uq_prenotazioni_utente_mostra": 2}])
    monkeypatch.setattr(bonifica_duplicati, "trova_duplicati", lambda _e: next(conteggi))
    monkeypatch.setattr(bonifica_duplicati, "bonifica_duplicati", lambda _e: {"uq_prenotazioni_utente_mostra": 2})
    bonifica_duplicati.main([])
    assert "Simulazione" in capsys.readouterr().out
    bonifica_duplicati.main(["--esegui"])
    assert "eliminate 2 righe" in capsys.readouterr().out
