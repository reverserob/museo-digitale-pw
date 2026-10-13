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

# Invio email
SMTP_SERVER = _env("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER")
# la password per le app di Google viene mostrata con gli spazi: li tolgo
SMTP_PASSWORD = _env("SMTP_PASSWORD").replace(" ", "")

# Upload immagini
STATIC_DIR = Path(__file__).parent / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_MAX_MB = int(_env("UPLOAD_MAX_MB", "5"))
ESTENSIONI_IMMAGINI = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
