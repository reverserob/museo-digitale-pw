import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class MostraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titolo: str
    descrizione: str
    immagini: str
    data_inizio: date
    data_fine: date


def _valida_nome(v: str, minimo: int = 2) -> str:
    v = v.strip()
    if len(v) < minimo:
        raise ValueError(f"Il campo deve contenere almeno {minimo} caratteri.")
    if len(v) > 100:
        raise ValueError("Il campo può contenere al massimo 100 caratteri.")
    return v


def _valida_telefono(v: str) -> str:
    v = v.strip()
    if not re.fullmatch(r"\d{6,15}", v):
        raise ValueError("Il numero di telefono deve contenere da 6 a 15 cifre.")
    return v


class RegistrazioneRequest(BaseModel):
    nome: str
    cognome: str
    email: EmailStr
    telefono: str
    password: str

    @field_validator("nome", "cognome")
    @classmethod
    def valida_nomi(cls, v: str) -> str:
        return _valida_nome(v)

    @field_validator("email")
    @classmethod
    def normalizza_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("telefono")
    @classmethod
    def valida_telefono(cls, v: str) -> str:
        return _valida_telefono(v)

    @field_validator("password")
    @classmethod
    def valida_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La password deve contenere almeno 8 caratteri.")
        if len(v) > 128:
            raise ValueError("La password può contenere al massimo 128 caratteri.")
        return v


class UtenteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    cognome: str
    email: str
    telefono: str


class SessioneUtenteResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    utente: UtenteResponse


class PrenotazioneCreate(BaseModel):
    """Prenotazione di un visitatore registrato: nome, cognome ed email arrivano dal suo account."""

    mostra_id: int
    # facoltativo: se manca si usa il telefono dell'account
    telefono: Optional[str] = None

    @field_validator("telefono")
    @classmethod
    def valida_telefono(cls, v: Optional[str]) -> Optional[str]:
        return _valida_telefono(v) if v is not None else None


class PrenotazioneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mostra_id: int
    nome: str
    cognome: str
    email: str
    telefono: str
    creata_il: datetime


class FeedbackCreate(BaseModel):
    mostra_id: int
    voto: int
    commento: str = ""

    @field_validator("voto")
    @classmethod
    def valida_voto(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Il voto deve essere compreso tra 1 e 5.")
        return v

    @field_validator("commento")
    @classmethod
    def valida_commento(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 500:
            raise ValueError("Il commento può contenere al massimo 500 caratteri.")
        return v


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mostra_id: int
    nome: str
    voto: int
    commento: str
    creato_il: datetime


class StatisticheMostra(BaseModel):
    mostra_id: int
    titolo: str
    stato: str
    prenotazioni: int
    feedback: int
    voto_medio: Optional[float]


class StatisticheResponse(BaseModel):
    totale_mostre: int
    mostre_in_corso: int
    mostre_future: int
    mostre_concluse: int
    totale_prenotazioni: int
    prenotazioni_ultimi_7_giorni: int
    totale_feedback: int
    voto_medio: Optional[float]
    per_mostra: list[StatisticheMostra]


class MiaPrenotazioneResponse(BaseModel):
    id: int
    mostra_id: int
    titolo_mostra: str
    data_inizio: date
    data_fine: date
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
