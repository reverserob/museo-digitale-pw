"""Gestione degli errori di validazione dei dati"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


# In caso di errore 422 di FastAPI
# gestione con messaggio di testo da mostratre a frontend
async def errore_validazione(request: Request, exc: RequestValidationError):
    """Trasforma gli errori in tringa di testo composto da campo + testo"""
    messaggi = []
    for err in exc.errors():
        campo = err["loc"][-1] if err.get("loc") else ""
        testo = str(err.get("msg", "")).replace("Value error, ", "")
        messaggi.append(f"{campo}: {testo}" if campo else testo)
    return JSONResponse(
        status_code=422,
        content={"detail": " · ".join(messaggi) or "Dati non validi."},
    )
