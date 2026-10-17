"""Aggiornamento leggero dello schema di un database SQLite già esistente."""

import logging

from sqlalchemy import inspect, text

logger = logging.getLogger("uvicorn.error")

# create_all crea le tabelle nuove ma non aggiunge colonne a quelle già esistenti.
# Qui aggiungo le colonne introdotte dopo la prima versione, così un museo.db
# creato in precedenza continua a funzionare senza essere cancellato.
COLONNE_AGGIUNTE = {
    "prenotazioni": {"utente_id": "INTEGER REFERENCES utenti(id)"},
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
