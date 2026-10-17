"""Connessione al database con SQLAlchemy (motore, sessioni e classe base dei modelli)."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from settings import DATABASE_URL

# SQLite per impostazione predefinita permette di usare una connessione solo dal thread
# che l'ha creata; FastAPI esegue le rotte in un pool di thread, quindi disattivo il controllo.
# Con altri database (es. PostgreSQL) l'opzione non serve.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# il motore gestisce le connessioni fisiche al database
engine = create_engine(DATABASE_URL, connect_args=connect_args)
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
