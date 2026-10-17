"""Schemi Pydantic: descrivono i dati in ingresso e in uscita dalle API e ne controllano la validità.

Gli schemi "Request"/"Create" validano ciò che arriva dal client: se un controllo fallisce,
FastAPI risponde 422 e il messaggio del ValueError arriva all'utente (vedi error_service.py).
Gli schemi "Response" stabiliscono quali campi vengono restituiti: ad esempio l'hash
della password non compare mai in UtenteResponse.
"""

import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class MostraResponse(BaseModel):
    """Mostra restituita dalle API del catalogo."""

    # from_attributes permette di costruire lo schema direttamente da un oggetto SQLAlchemy
    model_config = ConfigDict(from_attributes=True)

    id: int
    titolo: str
    descrizione: str
    immagini: str
    data_inizio: date
    data_fine: date


# --- Regole di validazione riutilizzate da più schemi ---
def _valida_nome(v: str, minimo: int = 2) -> str:
    """Nome o cognome: spazi iniziali e finali tolti, lunghezza tra `minimo` e 100 caratteri."""
    v = v.strip()
    if len(v) < minimo:
        raise ValueError(f"Il campo deve contenere almeno {minimo} caratteri.")
    if len(v) > 100:
        raise ValueError("Il campo può contenere al massimo 100 caratteri.")
    return v


def _valida_telefono(v: str) -> str:
    """Telefono: solo cifre, da 6 a 15 (nessuno spazio, trattino o prefisso con +)."""
    v = v.strip()
    if not re.fullmatch(r"\d{6,15}", v):
        raise ValueError("Il numero di telefono deve contenere da 6 a 15 cifre.")
    return v


def _valida_password(v: str) -> str:
    """Password: almeno 6 caratteri, una lettera maiuscola e un numero."""
    # stessa regola controllata nei form del frontend (registrazione e reset)
    if len(v) < 6:
        raise ValueError("La password deve contenere almeno 6 caratteri.")
    if len(v) > 128:
        raise ValueError("La password può contenere al massimo 128 caratteri.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("La password deve contenere almeno una lettera maiuscola.")
    if not re.search(r"\d", v):
        raise ValueError("La password deve contenere almeno un numero.")
    return v


# --- Account dei visitatori ---
class RegistrazioneRequest(BaseModel):
    """Dati inviati dal form di registrazione."""

    nome: str
    cognome: str
    email: EmailStr  # EmailStr controlla che l'indirizzo sia sintatticamente valido
    telefono: str
    password: str

    @field_validator("nome", "cognome")
    @classmethod
    def valida_nomi(cls, v: str) -> str:
        return _valida_nome(v)

    @field_validator("email")
    @classmethod
    def normalizza_email(cls, v: str) -> str:
        # salvo l'email in minuscolo: "Mario@Test.it" e "mario@test.it" sono lo stesso account
        return v.strip().lower()

    @field_validator("telefono")
    @classmethod
    def valida_telefono(cls, v: str) -> str:
        return _valida_telefono(v)

    @field_validator("password")
    @classmethod
    def valida_password(cls, v: str) -> str:
        return _valida_password(v)


class PasswordDimenticataRequest(BaseModel):
    """Richiesta del link per reimpostare la password."""

    # stringa semplice e non EmailStr: la risposta deve essere identica anche per email non valide
    email: str

    @field_validator("email")
    @classmethod
    def normalizza_email(cls, v: str) -> str:
        return v.strip().lower()


class ReimpostaPasswordRequest(BaseModel):
    """Nuova password scelta dal link ricevuto per email."""

    token: str  # token firmato contenuto nel link
    password: str

    @field_validator("password")
    @classmethod
    def valida_password(cls, v: str) -> str:
        return _valida_password(v)


class UtenteResponse(BaseModel):
    """Profilo del visitatore restituito al front-end (senza l'hash della password)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    cognome: str
    email: str
    telefono: str


class SessioneUtenteResponse(BaseModel):
    """Risposta di login e registrazione: token di accesso e profilo del visitatore."""

    access_token: str
    token_type: str = "bearer"
    utente: UtenteResponse


# --- Prenotazioni ---
class PrenotazioneCreate(BaseModel):
    """Dati inviati dal form di prenotazione: nome, cognome ed email arrivano dall'account."""

    mostra_id: int
    # facoltativo: se manca si usa il telefono dell'account
    telefono: Optional[str] = None

    @field_validator("telefono")
    @classmethod
    def valida_telefono(cls, v: Optional[str]) -> Optional[str]:
        return _valida_telefono(v) if v is not None else None


class PrenotazioneResponse(BaseModel):
    """Prenotazione come la vede l'amministratore nella dashboard."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    mostra_id: int
    nome: str
    cognome: str
    email: str
    telefono: str
    creata_il: datetime


# --- Feedback ---
class FeedbackCreate(BaseModel):
    """Nuovo feedback: il nome dell'autore viene preso dall'account, non dal form."""

    mostra_id: int
    voto: int
    commento: str = ""  # facoltativo

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
    """Feedback pubblico: contiene solo il nome abbreviato dell'autore, nessun dato di contatto."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    mostra_id: int
    nome: str
    voto: int
    commento: str
    creato_il: datetime


# --- Statistiche della dashboard ---
class StatisticheMostra(BaseModel):
    """Indicatori di una singola mostra."""

    mostra_id: int
    titolo: str
    stato: str  # "in corso", "futura" o "conclusa"
    prenotazioni: int
    feedback: int
    voto_medio: Optional[float]  # None se la mostra non ha ancora feedback


class StatisticheResponse(BaseModel):
    """Indicatori complessivi mostrati nella dashboard dell'amministratore."""

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
    """Prenotazione mostrata nell'area personale del visitatore, con i dati della mostra."""

    id: int
    mostra_id: int
    titolo_mostra: str
    data_inizio: date
    data_fine: date
    creata_il: datetime


# --- Login dell'amministratore ---
class LoginRequest(BaseModel):
    """Credenziali inviate dal form di accesso (amministratore o visitatore)."""

    email: str
    password: str


class TokenResponse(BaseModel):
    """Risposta del login dell'amministratore."""

    access_token: str
    token_type: str = "bearer"


def valida_date(data_inizio: str, data_fine: str) -> tuple[date, date]:
    """Controlla il formato ISO delle date e che la fine non preceda l'inizio."""
    # le mostre arrivano come form-data (per via delle immagini), quindi le date sono stringhe
    try:
        inizio = date.fromisoformat(data_inizio)
        fine = date.fromisoformat(data_fine)
    except ValueError:
        raise ValueError("Le date devono essere nel formato AAAA-MM-GG.") from None
    if fine < inizio:
        raise ValueError("La data di fine non può precedere la data di inizio.")
    return inizio, fine


# --- Modulo Contatti ---
class ContattoRequest(BaseModel):
    """Domanda inviata dal modulo Contatti (solo visitatori registrati)."""

    titolo: str
    descrizione: str
    nome: str
    cognome: str
    email: EmailStr
    telefono: str

    @field_validator("titolo")
    @classmethod
    def valida_titolo(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Il titolo deve contenere almeno 3 caratteri.")
        if len(v) > 120:
            raise ValueError("Il titolo può contenere al massimo 120 caratteri.")
        return v

    @field_validator("descrizione")
    @classmethod
    def valida_descrizione(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 10:
            raise ValueError("La descrizione deve contenere almeno 10 caratteri.")
        if len(v) > 2000:
            raise ValueError("La descrizione può contenere al massimo 2000 caratteri.")
        return v

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
