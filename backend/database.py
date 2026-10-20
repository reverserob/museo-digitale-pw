"""Connessione al database con SQLAlchemy (motore, sessioni e classe base dei modelli)."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from settings import DATABASE_URL

# Database in uso: SQLite (sviluppo e test) oppure PostgreSQL (produzione)
E_SQLITE = DATABASE_URL.startswith("sqlite")

if E_SQLITE:
    # SQLite per impostazione predefinita permette di usare una connessione solo dal thread
    # che l'ha creata; FastAPI esegue le rotte in un pool di thread, quindi disattivo il controllo.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _attiva_chiavi_esterne(connessione, _record):
        # SQLite non controlla le chiavi esterne se non lo si chiede a ogni connessione:
        # così si comporta come PostgreSQL (riferimenti inesistenti rifiutati, ON DELETE applicato)
        connessione.execute("PRAGMA foreign_keys = ON")

else:
    # PostgreSQL in cloud: il server può chiudere le connessioni inattive (es. Neon sospende il calcolo
    # dopo qualche minuto). pool_pre_ping verifica la connessione prima di usarla e pool_recycle la
    # rinnova dopo 5 minuti, così la prima richiesta dopo una pausa non fallisce.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300, pool_size=5, max_overflow=5)
# fabbrica di sessioni: ogni richiesta HTTP lavora con una propria sessione
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# classe da cui ereditano tutti i modelli (models.py): ogni sottoclasse diventa una tabella
Base = declarative_base()


def get_db():
    """Dipendenza FastAPI: apre una sessione per la richiesta e la chiude sempre alla fine.

    Il "yield" consegna la sessione alla rotta; il blocco finally viene eseguito anche
    se la rotta solleva un'eccezione, così le connessioni non restano aperte.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
