import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class MostraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titolo: str
    descrizione: str
    immagini: str
    data_inizio: date
    data_fine: date


class PrenotazioneCreate(BaseModel):
    """Dati inviati dal form di prenotazione, validati lato server."""

    mostra_id: int
    nome: str
    cognome: str
    email: EmailStr
    telefono: str

    @field_validator("nome", "cognome")
    @classmethod
    def valida_nomi(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Il campo deve contenere almeno 3 caratteri.")
        if len(v) > 100:
            raise ValueError("Il campo può contenere al massimo 100 caratteri.")
        return v

    @field_validator("email")
    @classmethod
    def normalizza_email(cls, v: str) -> str:
        # Il formato è già verificato da EmailStr: qui normalizziamo soltanto
        return v.strip().lower()

    @field_validator("telefono")
    @classmethod
    def valida_telefono(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\d{6,15}", v):
            raise ValueError("Il numero di telefono deve contenere da 6 a 15 cifre.")
        return v


class PrenotazioneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mostra_id: int
    nome: str
    cognome: str
    email: str
    telefono: str
    creata_il: datetime


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def valida_date(data_inizio: str, data_fine: str) -> tuple[date, date]:
    """Controlla il formato ISO delle date e che la fine non preceda l'inizio."""
    try:
        inizio = date.fromisoformat(data_inizio)
        fine = date.fromisoformat(data_fine)
    except ValueError:
        raise ValueError("Le date devono essere nel formato AAAA-MM-GG.") from None
    if fine < inizio:
        raise ValueError("La data di fine non può precedere la data di inizio.")
    return inizio, fine
