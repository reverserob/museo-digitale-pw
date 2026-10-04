from pydantic import BaseModel

class MostraCreate(BaseModel):
    titolo: str
    descrizione: str
    capienza_massima: int
    immagini: str

class MostraResponse(BaseModel):
    id: int
    titolo: str
    descrizione: str
    capienza_massima: int
    immagini: str

    class Config:
        from_attributes = True
