from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


# Error Handler
async def errore_validazione(request: Request, exc: RequestValidationError):
    messaggi = []
    for err in exc.errors():
        campo = err["loc"][-1] if err.get("loc") else ""
        testo = str(err.get("msg", "")).replace("Value error, ", "")
        messaggi.append(f"{campo}: {testo}" if campo else testo)
    return JSONResponse(
        status_code=422,
        content={"detail": " · ".join(messaggi) or "Dati non validi."},
    )
