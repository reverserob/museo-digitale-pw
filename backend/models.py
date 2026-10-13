from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class Mostra(Base):
    __tablename__ = "mostre"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String, index=True, nullable=False)
    descrizione = Column(Text, nullable=False)
    # Percorsi relativi (es. "/static/uploads/abc.webp") separati da virgola
    immagini = Column(String, nullable=False, default="")
    data_inizio = Column(String, nullable=False)  # formato ISO YYYY-MM-DD
    data_fine = Column(String, nullable=False)

    prenotazioni = relationship(
        "Prenotazione", back_populates="mostra", cascade="all, delete-orphan"
    )


class Prenotazione(Base):
    __tablename__ = "prenotazioni"

    id = Column(Integer, primary_key=True, index=True)
    mostra_id = Column(Integer, ForeignKey("mostre.id", ondelete="CASCADE"), nullable=False, index=True)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    email = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    creata_il = Column(DateTime, default=datetime.utcnow, nullable=False)

    mostra = relationship("Mostra", back_populates="prenotazioni")
