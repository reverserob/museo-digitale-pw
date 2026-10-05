from pydantic import BaseModel, EmailStr, field_validator
import re

class MostraBase(BaseModel):
    titolo: str
    descrizione: str
    immagini: str
    data_inizio: str
    data_fine: str

class MostraCreate(MostraBase):
    pass

class MostraResponse(MostraBase):
    id: int

    class Config:
        from_attributes = True

# Schema specifico e validato per la prenotazione
class PrenotazioneCreate(BaseModel):
    mostra_id: int
    nome: str
    cognome: str
    email: EmailStr
    telefono: str

    @field_validator('nome', 'cognome')
    def valida_nomi(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Il campo deve contenere almeno 3 caratteri.')
        return v.strip()

    @field_validator('email')
    def valida_email(cls, v):
        if not v or '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Inserisci un indirizzo email valido.')
        return v.strip().lower()

    @field_validator('telefono')
    def valida_telefono(cls, v):
        if not v or not re.match(r'^\d+$', v.strip()):
            raise ValueError('Il numero di telefono deve contenere solo cifre numeriche.')
        return v.strip()
