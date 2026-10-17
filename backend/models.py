"""Modelli dei dati: ogni classe corrisponde a una tabella del database (ORM SQLAlchemy)."""

from datetime import datetime, timezone

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Mostra(Base):
    """Esposizione del catalogo del museo."""

    __tablename__ = "mostre"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String, index=True, nullable=False)
    descrizione = Column(Text, nullable=False)
    # Percorsi relativi (es. "/static/uploads/abc.webp") separati da virgola
    immagini = Column(String, nullable=False, default="")
    data_inizio = Column(Date, nullable=False)
    data_fine = Column(Date, nullable=False)

    # composizione: prenotazioni e feedback non esistono senza la loro mostra,
    # quindi eliminando la mostra vengono eliminati anche loro (cascade)
    prenotazioni = relationship("Prenotazione", back_populates="mostra", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="mostra", cascade="all, delete-orphan")


class Prenotazione(Base):
    """Prenotazione di una visita a una mostra da parte di un visitatore registrato."""

    __tablename__ = "prenotazioni"

    id = Column(Integer, primary_key=True, index=True)
    # chiave esterna verso la mostra; l'indice velocizza i filtri per mostra
    mostra_id = Column(Integer, ForeignKey("mostre.id", ondelete="CASCADE"), nullable=False, index=True)
    # nome, cognome ed email vengono copiati dall'account al momento della prenotazione,
    # così lo storico resta leggibile anche se l'account cambia o viene eliminato
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    email = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    # data e ora di creazione in UTC (il front-end le converte nell'ora locale)
    creata_il = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    # account che ha prenotato: se l'account viene eliminato il campo diventa NULL (aggregazione)
    utente_id = Column(Integer, ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True, index=True)
    mostra = relationship("Mostra", back_populates="prenotazioni")
    utente = relationship("Utente", back_populates="prenotazioni")


class Feedback(Base):
    """Recensione lasciata da un visitatore su una mostra (voto da 1 a 5 + commento)."""

    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    mostra_id = Column(Integer, ForeignKey("mostre.id", ondelete="CASCADE"), nullable=False, index=True)
    # nome pubblico dell'autore: nome e iniziale del cognome (es. "Mario R."), mai email o telefono
    nome = Column(String, nullable=False)
    voto = Column(Integer, nullable=False)
    commento = Column(Text, nullable=False, default="")
    creato_il = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    # NULL per i feedback dimostrativi del seeding, che non hanno un autore registrato
    utente_id = Column(Integer, ForeignKey("utenti.id", ondelete="SET NULL"), nullable=True, index=True)

    mostra = relationship("Mostra", back_populates="feedback")
    utente = relationship("Utente", back_populates="feedback")


class Utente(Base):
    """Account di un visitatore registrato."""

    __tablename__ = "utenti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    # email unica: con la stessa email ci si può registrare una sola volta
    email = Column(String, nullable=False, unique=True, index=True)
    telefono = Column(String, nullable=False)
    # mai la password in chiaro: solo l'hash PBKDF2 con il suo sale
    password_hash = Column(String, nullable=False)
    creato_il = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # nessun cascade: eliminando l'account, prenotazioni e feedback restano (utente_id = NULL)
    prenotazioni = relationship("Prenotazione", back_populates="utente")
    feedback = relationship("Feedback", back_populates="utente")
