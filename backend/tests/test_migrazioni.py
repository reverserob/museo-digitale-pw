"""Test dell'aggiornamento dello schema su un database creato con una versione precedente."""

from sqlalchemy import create_engine, inspect, text

from services.migrazioni_service import aggiorna_schema


def test_aggiunge_utente_id_a_un_database_della_versione_precedente(tmp_path):
    # database con le tabelle come erano prima degli account dei visitatori
    engine = create_engine(f"sqlite:///{tmp_path / 'vecchio.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE utenti (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE prenotazioni (id INTEGER PRIMARY KEY, nome TEXT)"))
        conn.execute(text("CREATE TABLE feedback (id INTEGER PRIMARY KEY, nome TEXT)"))
        conn.execute(text("INSERT INTO prenotazioni (nome) VALUES ('Mario')"))

    aggiorna_schema(engine)
    aggiorna_schema(engine)  # una seconda esecuzione non deve dare errori

    colonne = {t: {c["name"] for c in inspect(engine).get_columns(t)} for t in ("prenotazioni", "feedback")}
    assert "utente_id" in colonne["prenotazioni"]
    assert "utente_id" in colonne["feedback"]
    # i dati già presenti restano
    with engine.connect() as conn:
        assert conn.execute(text("SELECT nome, utente_id FROM prenotazioni")).one() == ("Mario", None)
