"""Limitazione del numero di richieste rate limiting tramite slowapi."""

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Limita il numero di richieste di accesso
# get_remote_address usa l'IP del client come chiave di controllo
limiter = Limiter(key_func=get_remote_address)


# Risposta 429-Too Many Requests con  messaggio leggibile dal frontend
async def troppe_richieste(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Troppi tentativi di accesso. Riprova tra qualche minuto."},
    )
