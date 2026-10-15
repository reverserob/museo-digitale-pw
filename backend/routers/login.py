from fastapi import APIRouter, HTTPException, Request, status

import schemas
import settings
from auth import crea_token, verifica_credenziali
from services.rate_limit_service import limiter

router = APIRouter(prefix="/api", tags=["Area riservata"])


# API LOGIN
# LOGIN_RATE_LIMIT
@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login(request: Request, dati: schemas.LoginRequest):
    if not verifica_credenziali(dati.email, dati.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali errate.")
    return {"access_token": crea_token(dati.email.strip().lower(), ruolo="admin")}
