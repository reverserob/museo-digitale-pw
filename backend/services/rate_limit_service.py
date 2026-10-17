"""Limitazione del numero di richieste (rate limiting) con la libreria slowapi."""

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Limita il numero di richieste per indirizzo IP (usato su login, registrazione, reset password e contatti
# contro i tentativi a raffica). get_remote_address usa l'IP del client come chiave del conteggio.
limiter = Limiter(key_func=get_remote_address)


# Risposta 429 (Too Many Requests) con un messaggio leggibile dal frontend; registrata in main.py
async def troppe_richieste(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Troppi tentativi di accesso. Riprova tra qualche minuto."},
    )
