from fastapi import APIRouter, HTTPException, status

import schemas
from auth import crea_token, verifica_credenziali

router = APIRouter(prefix="/api", tags=["Area riservata"])


# API LOGIN
@router.post("/login", response_model=schemas.TokenResponse)
def login(dati: schemas.LoginRequest):
    if not verifica_credenziali(dati.email, dati.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali errate.")
    return {"access_token": crea_token(dati.email.strip().lower())}
