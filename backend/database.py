"""Connessione al database con SQLAlchemy"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from settings import DATABASE_URL

# Database in uso: SQLite per sviluppo e test oppure PostgreSQL per produzione
E_SQLITE = DATABASE_URL.startswith("sqlite")

if E_SQLITE:
    # SQLite per impostazione predefinita permette di usare una connessione dal thread che l'ha creata
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _attiva_chiavi_esterne(connessione, _record):
        # SQLite non controlla le chiavi esterne se non lo si chiede a ogni connessione come per PostgreSQL
        connessione.execute("PRAGMA foreign_keys = ON")

else:
    # PostgreSQL in cloud: il server può chiudere le connessioni inattive
    # pool_pre_ping verifica la connessione prima di usarla
    # pool_recycle rinnova la sessione dopo 5 minuti
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300, pool_size=5, max_overflow=5)
# ogni richiesta HTTP lavora con una propria sessione
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# classe da cui ereditano tutti i modelli models.py ogni sottoclasse corrisponde ad una tabella
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
