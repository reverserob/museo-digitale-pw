"""Aggiornamento leggero dello schema di un database SQLite già esistente."""

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
        "ingresso_il": "DATETIME",
    },
    "feedback": {"utente_id": "INTEGER REFERENCES utenti(id)"},
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
