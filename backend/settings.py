"""ENV VARIABLES CONFIG"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent / ".env.local")
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass


def _env(nome, default=""):
    valore = os.getenv(nome, "").strip()
    return valore or default


def _lista(valore: str):
    return [v.strip() for v in valore.split(",") if v.strip()]


# Database
DATABASE_URL = _env("DATABASE_URL", "sqlite:///./museo.db")

# CORS
CORS_ORIGINS = _lista(
    _env(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://museo-digitale-pw-azure.vercel.app",
    )
)

# Area riservata (default solo demo locale)
ADMIN_EMAIL = _env("ADMIN_EMAIL", "admin@museo.it")
ADMIN_PASSWORD = _env("ADMIN_PASSWORD", "admin2026")
# KEY per token di accesso
SECRET_KEY = _env("SECRET_KEY", "dev-secret-cambiami")
TOKEN_DURATA_ORE = int(_env("TOKEN_DURATA_ORE", "8"))

# Reset password: durata del link e indirizzo del frontend da usare nel link
# (se la richiesta arriva da uno dei CORS_ORIGINS si usa direttamente quell'indirizzo)
RESET_PASSWORD_MINUTI = int(_env("RESET_PASSWORD_MINUTI", "30"))
FRONTEND_URL = _env("FRONTEND_URL", "https://museo-digitale-pw-azure.vercel.app").rstrip("/")

# login try limit
LOGIN_RATE_LIMIT = _env("LOGIN_RATE_LIMIT", "5/minute")

# Invio email
SMTP_SERVER = _env("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER")
# la password per le app di Google viene mostrata con gli spazi: li tolgo
SMTP_PASSWORD = _env("SMTP_PASSWORD").replace(" ", "")

# Invio tramite API di Brevo (porta HTTPS 443): da usare dove le porte SMTP sono bloccate (es. Render free).
# Se BREVO_API_KEY è impostata ha la precedenza su SMTP.
BREVO_API_KEY = _env("BREVO_API_KEY")
# indirizzo mittente (deve essere verificato su Brevo) e nome visualizzato
EMAIL_MITTENTE = _env("EMAIL_MITTENTE", SMTP_USER)
EMAIL_MITTENTE_NOME = _env("EMAIL_MITTENTE_NOME", "Museo Civico Digitale")

# Upload immagini
STATIC_DIR = Path(__file__).parent / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_MAX_MB = int(_env("UPLOAD_MAX_MB", "5"))
ESTENSIONI_IMMAGINI = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
