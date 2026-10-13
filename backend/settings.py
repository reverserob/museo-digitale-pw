"""ENV VARIABLES CONFIG"""

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

# CORS
CORS_ORIGINS = _lista(
    os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://museo-digitale-pw-azure.vercel.app",
    )
)

# Area riservata (default solo demo locale)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@museo.it")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin2026")
# KEY per token di accesso
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-cambiami")
TOKEN_DURATA_ORE = int(os.getenv("TOKEN_DURATA_ORE", "8"))

# Invio email
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

# Upload immagini
STATIC_DIR = Path(__file__).parent / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_MAX_MB = int(os.getenv("UPLOAD_MAX_MB", "5"))
ESTENSIONI_IMMAGINI = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
