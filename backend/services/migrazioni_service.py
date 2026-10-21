"""Aggiornamento leggero dello schema di un database già esistente (SQLite o PostgreSQL)."""

import logging
import secrets

from sqlalchemy import inspect, text

logger = logging.getLogger("uvicorn.error")

# create_all crea le tabelle nuove ma non aggiunge colonne a quelle già esistenti.
# Qui aggiungo le colonne introdotte dopo la prima versione, così un museo.db
# creato in precedenza continua a funzionare senza essere cancellato.
COLONNE_AGGIUNTE = {
    "prenotazioni": {
        "utente_id": "INTEGER REFERENCES utenti(id)",
        "codice": "VARCHAR(20)",
        # TIMESTAMP è valido sia in PostgreSQL sia in SQLite (DATETIME esiste solo in SQLite)
        "ingresso_il": "TIMESTAMP",
    },
    "feedback": {"utente_id": "INTEGER REFERENCES utenti(id)"},
    "immagini": {"mostra_id": "INTEGER REFERENCES mostre(id) ON DELETE CASCADE"},
}


def aggiorna_schema(engine):
    """Aggiunge le colonne mancanti elencate in COLONNE_AGGIUNTE (chiamata all'avvio da main.py)."""
    ispettore = inspect(engine)
    tabelle = set(ispettore.get_table_names())
    with engine.begin() as conn:
        for tabella, colonne in COLONNE_AGGIUNTE.items():
            # tabella non ancora creata: ci penserà create_all con tutte le colonne
            if tabella not in tabelle:
                continue
            esistenti = {c["name"] for c in ispettore.get_columns(tabella)}
            for nome, definizione in colonne.items():
                if nome not in esistenti:
                    conn.execute(text(f"ALTER TABLE {tabella} ADD COLUMN {nome} {definizione}"))
                    logger.info(f"Aggiunta la colonna {tabella}.{nome} al database esistente")
    _assegna_codici_mancanti(engine)
    _crea_indici_unici(engine)
    _collega_immagini_alle_mostre(engine)


def _collega_immagini_alle_mostre(engine):
    """Collega alle mostre le immagini caricate prima dell'introduzione della colonna `mostra_id`.

    Il collegamento si ricava dai percorsi `/api/immagini/<nome>` salvati nella colonna `immagini` delle mostre.
    """
    tabelle = set(inspect(engine).get_table_names())
    if not {"mostre", "immagini"} <= tabelle:
        return
    with engine.begin() as conn:
        mostre = conn.execute(text("SELECT id, immagini FROM mostre")).fetchall()
        for mostra_id, percorsi in mostre:
            for percorso in (percorsi or "").split(","):
                if percorso.startswith("/api/immagini/"):
                    conn.execute(
                        text("UPDATE immagini SET mostra_id = :m WHERE nome = :n AND mostra_id IS NULL"),
                        {"m": mostra_id, "n": percorso[len("/api/immagini/") :]},
                    )


# Una prenotazione e un feedback per visitatore su ogni mostra: oltre al controllo nelle API,
# la regola è garantita dal database con un indice unico (anche con due richieste contemporanee).
# I nomi coincidono con quelli dichiarati in models.py, quindi IF NOT EXISTS evita duplicati.
INDICI_UNICI = {
    "uq_prenotazioni_utente_mostra": ("prenotazioni", "utente_id, mostra_id"),
    "uq_feedback_utente_mostra": ("feedback", "utente_id, mostra_id"),
}


def _crea_indici_unici(engine):
    """Crea sui database esistenti gli indici unici introdotti dopo la prima versione."""
    tabelle = set(inspect(engine).get_table_names())
    for nome, (tabella, colonne) in INDICI_UNICI.items():
        if tabella not in tabelle:
            continue
        try:
            with engine.begin() as conn:
                conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS {nome} ON {tabella} ({colonne})"))
        except Exception as e:
            # dati vecchi con duplicati: l'applicazione funziona comunque grazie al controllo nelle API
            logger.warning(f"Indice unico {nome} non creato: {e}")


def _assegna_codici_mancanti(engine):
    """Dà un codice di riferimento alle prenotazioni create prima dell'introduzione dei codici.

    Crea anche l'indice unico sulla colonna `codice` (ALTER TABLE in SQLite non può aggiungere il vincolo UNIQUE).
    """
    # import qui per evitare un ciclo di import con i modelli all'avvio
    from services.prenotazioni_service import ALFABETO, LUNGHEZZA, PREFISSO

    if "prenotazioni" not in set(inspect(engine).get_table_names()):
        return
    with engine.begin() as conn:
        senza_codice = [r[0] for r in conn.execute(text("SELECT id FROM prenotazioni WHERE codice IS NULL"))]
        usati = {r[0] for r in conn.execute(text("SELECT codice FROM prenotazioni WHERE codice IS NOT NULL"))}
        for prenotazione_id in senza_codice:
            while True:
                caratteri = "".join(secrets.choice(ALFABETO) for _ in range(LUNGHEZZA))
                codice = f"{PREFISSO}-{caratteri[:4]}-{caratteri[4:]}"
                if codice not in usati:
                    break
            usati.add(codice)
            conn.execute(text("UPDATE prenotazioni SET codice = :c WHERE id = :i"), {"c": codice, "i": prenotazione_id})
        if senza_codice:
            logger.info(f"Assegnato il codice di riferimento a {len(senza_codice)} prenotazioni esistenti")
        # stesso nome dell'indice creato da SQLAlchemy sui database nuovi: IF NOT EXISTS evita duplicati
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_prenotazioni_codice ON prenotazioni (codice)"))
