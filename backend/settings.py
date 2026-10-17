"""Configurazione dell'applicazione letta dalle variabili d'ambiente.

In locale i valori arrivano dai file .env.local e .env (esclusi da Git); in produzione
dal pannello Environment di Render. Ogni impostazione ha un valore predefinito pensato
solo per la demo locale: le credenziali vere non vengono mai scritte nel codice.
"""

import os
from pathlib import Path

# python-dotenv è facoltativo: se non è installato si usano solo le variabili già presenti
try:
    from dotenv import load_dotenv

    # .env.local ha la precedenza perché viene caricato per primo
    # (load_dotenv non sovrascrive le variabili già definite)
    load_dotenv(Path(__file__).parent / ".env.local")
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass


def _env(nome, default=""):
    """Legge una variabile d'ambiente; se manca o è vuota restituisce il valore predefinito."""
    valore = os.getenv(nome, "").strip()
    return valore or default


def _lista(valore: str):
    """Trasforma "a, b, c" nella lista ["a", "b", "c"], ignorando gli elementi vuoti."""
    return [v.strip() for v in valore.split(",") if v.strip()]


# --- Database ---
# SQLite in un file locale; per passare a PostgreSQL basta cambiare questa stringa
DATABASE_URL = _env("DATABASE_URL", "sqlite:///./museo.db")

# --- CORS: indirizzi del front-end autorizzati a chiamare le API dal browser ---
CORS_ORIGINS = _lista(
    _env(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://museo-digitale-pw-azure.vercel.app",
    )
)

# --- Area riservata (i valori predefiniti valgono solo per la demo locale) ---
ADMIN_EMAIL = _env("ADMIN_EMAIL", "admin@museo.it")
ADMIN_PASSWORD = _env("ADMIN_PASSWORD", "admin2026")
# chiave segreta con cui vengono firmati i token di accesso (HMAC-SHA256)
SECRET_KEY = _env("SECRET_KEY", "dev-secret-cambiami")
# durata dei token di accesso, in ore
TOKEN_DURATA_ORE = int(_env("TOKEN_DURATA_ORE", "8"))

# --- Reset della password: durata del link e indirizzo del front-end da usare nel link ---
# (se la richiesta arriva da uno dei CORS_ORIGINS si usa direttamente quell'indirizzo)
RESET_PASSWORD_MINUTI = int(_env("RESET_PASSWORD_MINUTI", "30"))
FRONTEND_URL = _env("FRONTEND_URL", "https://museo-digitale-pw-azure.vercel.app").rstrip("/")

# --- Limite ai tentativi di login (sintassi di slowapi: "numero/periodo") ---
LOGIN_RATE_LIMIT = _env("LOGIN_RATE_LIMIT", "5/minute")

# --- Invio email tramite SMTP (usato in locale) ---
SMTP_SERVER = _env("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER")
# la password per le app di Google viene mostrata con gli spazi: li tolgo
SMTP_PASSWORD = _env("SMTP_PASSWORD").replace(" ", "")

# --- Invio tramite API di Brevo (porta HTTPS 443) ---
# Da usare dove le porte SMTP sono bloccate (es. piano gratuito di Render).
# Se BREVO_API_KEY è impostata ha la precedenza su SMTP.
BREVO_API_KEY = _env("BREVO_API_KEY")
# indirizzo mittente (deve essere verificato su Brevo) e nome visualizzato
EMAIL_MITTENTE = _env("EMAIL_MITTENTE", SMTP_USER)
EMAIL_MITTENTE_NOME = _env("EMAIL_MITTENTE_NOME", "Museo Civico Digitale")

# --- Modulo Contatti: casella che riceve le domande dei visitatori ---
CONTATTI_EMAIL = _env("CONTATTI_EMAIL", "r.randazzo85@gmail.com")

# --- Upload delle immagini delle mostre ---
STATIC_DIR = Path(__file__).parent / "static"  # cartella servita all'indirizzo /static
UPLOAD_DIR = STATIC_DIR / "uploads"  # qui finiscono le immagini caricate dall'area riservata
UPLOAD_MAX_MB = int(_env("UPLOAD_MAX_MB", "5"))  # dimensione massima di ogni file
ESTENSIONI_IMMAGINI = {".jpg", ".jpeg", ".png", ".webp", ".gif"}  # formati accettati
