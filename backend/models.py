from sqlalchemy import Column, Integer, String
from database import Base

class Mostra(Base):
    __tablename__ = "mostre"

    id = Column(Integer, primary_key=True, index=True)
    titolo = Column(String, index=True)
    descrizione = Column(String)
   # capienza_massima = Column(Integer)
    immagini = Column(String)
    data_inizio = Column(String)
    data_fine = Column(String)
