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


def test_crea_gli_indici_unici_su_un_database_esistente(tmp_path):
    # database con le tabelle complete ma senza gli indici unici introdotti con PostgreSQL
    engine = create_engine(f"sqlite:///{tmp_path / 'senza_indici.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE utenti (id INTEGER PRIMARY KEY)"))
        conn.execute(
            text(
                "CREATE TABLE prenotazioni (id INTEGER PRIMARY KEY, mostra_id INTEGER, utente_id INTEGER, "
                "codice VARCHAR(20), ingresso_il TIMESTAMP)"
            )
        )
        conn.execute(text("CREATE TABLE feedback (id INTEGER PRIMARY KEY, mostra_id INTEGER, utente_id INTEGER)"))

    aggiorna_schema(engine)

    indici = {i["name"]: i for t in ("prenotazioni", "feedback") for i in inspect(engine).get_indexes(t)}
    assert indici["uq_prenotazioni_utente_mostra"]["unique"]
    assert indici["uq_feedback_utente_mostra"]["unique"]
    # da qui in poi il database rifiuta una seconda prenotazione dello stesso visitatore sulla stessa mostra
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO prenotazioni (mostra_id, utente_id) VALUES (1, 1)"))
    try:
        with engine.begin() as conn:
            conn.execute(text("INSERT INTO prenotazioni (mostra_id, utente_id) VALUES (1, 1)"))
        duplicata = True
    except Exception:
        duplicata = False
    assert not duplicata


def test_collega_le_immagini_caricate_prima_della_colonna_mostra_id(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'immagini_vecchie.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE mostre (id INTEGER PRIMARY KEY, immagini VARCHAR)"))
        conn.execute(
            text("CREATE TABLE immagini (id INTEGER PRIMARY KEY, nome VARCHAR(64), tipo VARCHAR(50), dati BLOB)")
        )
        conn.execute(
            text("INSERT INTO mostre (id, immagini) VALUES (7, '/static/uploads/x.webp,/api/immagini/abc.png')")
        )
        conn.execute(text("INSERT INTO immagini (nome, tipo, dati) VALUES ('abc.png', 'image/png', x'00')"))

    aggiorna_schema(engine)

    with engine.connect() as conn:
        assert conn.execute(text("SELECT mostra_id FROM immagini WHERE nome = 'abc.png'")).scalar() == 7
