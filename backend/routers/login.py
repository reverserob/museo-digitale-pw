"""Login dell'amministratore (area riservata)."""

from fastapi import APIRouter, HTTPException, Request, status

import schemas
import settings
from auth import crea_token, verifica_credenziali
from services.rate_limit_service import limiter

# tutte le rotte di questo file iniziano con /api; il tag le raggruppa nella documentazione /docs
router = APIRouter(prefix="/api", tags=["Area riservata"])


# POST /api/login
# Il decoratore limiter.limit applica il limite ai tentativi (es. 5 al minuto per indirizzo IP):
# oltre il limite slowapi risponde 429. Il parametro request serve a slowapi per leggere l'IP.
@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login(request: Request, dati: schemas.LoginRequest):
    """Verifica le credenziali dell'amministratore e restituisce un token firmato."""
    if not verifica_credenziali(dati.email, dati.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali errate.")
    # il token contiene il ruolo "admin": le rotte riservate lo controllano con richiedi_admin
    return {"access_token": crea_token(dati.email.strip().lower(), ruolo="admin")}
