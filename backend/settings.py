"""Configurazione centralizzata letta da variabili d'ambiente.

In locale i valori possono stare in un file `backend/.env` (vedi `.env.example`),
che NON va mai committato. In produzione (Render) si impostano dal pannello
"Environment" del servizio.
"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env")
except ImportError:  # python-dotenv è opzionale
    pass


def _lista(valore: str):
    return [v.strip() for v in valore.split(",") if v.strip()]


# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./museo.db")

# CORS: domini del frontend autorizzati a chiamare le API
CORS_ORIGINS = _lista(
    os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://museo-digitale-pw-azure.vercel.app",
    )
)

# Area riservata (i default servono solo per la demo in locale)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@museo.it")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin2026")
# Chiave usata per firmare i token di accesso: in produzione va impostata
# con un valore casuale lungo (es. `python -c "import secrets; print(secrets.token_hex(32))"`)
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-cambiami")
TOKEN_DURATA_ORE = int(os.getenv("TOKEN_DURATA_ORE", "8"))

# Invio email (se mancano le credenziali l'invio viene saltato e solo loggato)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# Upload immagini
UPLOAD_MAX_MB = int(os.getenv("UPLOAD_MAX_MB", "5"))
ESTENSIONI_IMMAGINI = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
