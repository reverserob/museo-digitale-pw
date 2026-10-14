from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Limita il numero di richieste per indirizzo IP (usato sul login contro i tentativi a raffica)
limiter = Limiter(key_func=get_remote_address)


# Risposta 429 con un messaggio leggibile dal frontend
async def troppe_richieste(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Troppi tentativi di accesso. Riprova tra qualche minuto."},
    )
