"""Gestione uniforme degli errori di validazione dei dati in ingresso."""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


# Registrato in main.py: sostituisce la risposta 422 predefinita di FastAPI (un elenco tecnico)
# con un unico messaggio leggibile che il frontend può mostrare così com'è.
async def errore_validazione(request: Request, exc: RequestValidationError):
    """Trasforma gli errori di validazione in un testo del tipo "campo: messaggio · campo: messaggio"."""
    messaggi = []
    for err in exc.errors():
        # loc è il percorso del campo, es. ("body", "email"): l'ultimo elemento è il nome del campo
        campo = err["loc"][-1] if err.get("loc") else ""
        # Pydantic antepone "Value error, " ai messaggi dei validatori personalizzati: lo tolgo
        testo = str(err.get("msg", "")).replace("Value error, ", "")
        messaggi.append(f"{campo}: {testo}" if campo else testo)
    return JSONResponse(
        status_code=422,
        content={"detail": " · ".join(messaggi) or "Dati non validi."},
    )
