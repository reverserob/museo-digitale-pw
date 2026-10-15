from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Mostra(Base):
    __tablename__ = "mostre"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String, index=True, nullable=False)
    descrizione = Column(Text, nullable=False)
    # Percorsi relativi (es. "/static/uploads/abc.webp") separati da virgola
    immagini = Column(String, nullable=False, default="")
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)

    prenotazioni = relationship("Prenotazione", back_populates="mostra", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="mostra", cascade="all, delete-orphan")


class Prenotazione(Base):
    __tablename__ = "prenotazioni"

    id = Column(Integer, primary_key=True, index=True)
    mostra_id = Column(Integer, ForeignKey("mostre.id", ondelete="CASCADE"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    email = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    creata_il = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    # visitatore registrato che ha prenotato (nome, email e telefono sono copiati al momento della prenotazione)
    utente_id = Column(Integer, ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True, index=True)

    mostra = relationship("Mostra", back_populates="prenotazioni")
    utente = relationship("Utente", back_populates="prenotazioni")


class Feedback(Base):
    """Recensione lasciata da un visitatore su una mostra (voto da 1 a 5 + commento)."""

    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    mostra_id = Column(Integer, ForeignKey("mostre.id", ondelete="CASCADE"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    voto = Column(Integer, nullable=False)
    commento = Column(Text, nullable=False, default="")
    creato_il = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    # autore del feedback (vuoto per i feedback dimostrativi inseriti dal seeding)
    utente_id = Column(Integer, ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True, index=True)

    mostra = relationship("Mostra", back_populates="feedback")
    utente = relationship("Utente", back_populates="feedback")


class Utente(Base):
    """Visitatore registrato: serve per prenotare e lasciare feedback."""

    __tablename__ = "utenti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    telefono = Column(String, nullable=False)
    # mai la password in chiaro: solo l'hash PBKDF2 con il suo sale
    password_hash = Column(String, nullable=False)
    creato_il = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    prenotazioni = relationship("Prenotazione", back_populates="utente")
    feedback = relationship("Feedback", back_populates="utente")
