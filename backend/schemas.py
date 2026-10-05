from pydantic import BaseModel

class MostraCreate(BaseModel):
    titolo: str
    descrizione: str
    # capienza_massima: int
    immagini: str
    data_inizio: str
    data_fine: str

class MostraResponse(BaseModel):
    id: int
    titolo: str
    descrizione: str
    # capienza_massima: int
    immagini: str
    data_inizio: str
    data_fine: str

    class Config:
        from_attributes = True
