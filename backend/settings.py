"""Configurazione dell'applicazione letta dalle variabili d'ambiente.
In locale i valori arrivano dai file .env.local e .env (esclusi da Git);
in produzione i valori sono settati su Environment in Render
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
def normalizza_database_url(url: str) -> str:
    """Adatta la stringa di connessione al driver psycopg 3 usato per PostgreSQL.

    I servizi cloud (Neon, Render, Supabase) forniscono indirizzi come `postgres://...` o
    `postgresql://...`; SQLAlchemy ha bisogno del nome del driver: `postgresql+psycopg://...`.
    Le stringhe SQLite e quelle che indicano già un driver restano invariate.

    Args:
        url: Stringa di connessione letta dalla variabile `DATABASE_URL`.

    Returns:
        Stringa di connessione per SQLAlchemy.
    """
    for prefisso in ("postgres://", "postgresql://"):
        if url.startswith(prefisso):
            return "postgresql+psycopg://" + url[len(prefisso) :]
    return url


# In sviluppo SQLite in un file locale mentre in produzione PostgreSQL Neon con DATABASE_URL
DATABASE_URL = normalizza_database_url(_env("DATABASE_URL", "sqlite:///./museo.db"))

# getione CORS indirizzi del front-end autorizzati per richiamare le API dal browser
CORS_ORIGINS = _lista(
    _env(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,https://museo-digitale-pw-azure.vercel.app",
    )
)

# Ambiente: sviluppo oppure produzione
# Render imposta da solo la variabile RENDER mentre online l'ambiente produzione
AMBIENTE = _env("AMBIENTE", "produzione" if os.getenv("RENDER") else "sviluppo").lower()

# -Area riservata iqui  valori predefiniti valgono solo per la demo locale
ADMIN_EMAIL_DEMO = "admin@museo.it"
ADMIN_PASSWORD_DEMO = "admin2026"
SECRET_KEY_DEMO = "dev-secret-cambiami"
ADMIN_EMAIL = _env("ADMIN_EMAIL", ADMIN_EMAIL_DEMO)
ADMIN_PASSWORD = _env("ADMIN_PASSWORD", ADMIN_PASSWORD_DEMO)
# chiave segreta con cui vengono firmati i token di accesso (HMAC-SHA256)
SECRET_KEY = _env("SECRET_KEY", SECRET_KEY_DEMO)
# lunghezza minima della chiave in produzione (es. python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY_MIN = 32
# durata dei token di accesso, in ore
TOKEN_DURATA_ORE = int(_env("TOKEN_DURATA_ORE", "8"))

# Reset della password con durata del link e indirizzo del front-end
RESET_PASSWORD_MINUTI = int(_env("RESET_PASSWORD_MINUTI", "30"))
FRONTEND_URL = _env("FRONTEND_URL", "https://museo-digitale-pw-azure.vercel.app").rstrip("/")
# indirizzo pubblico del backend usato per l'immagine del QR code nelle email di conferma
BACKEND_URL = _env("BACKEND_URL").rstrip("/")

# Limite ai tentativi di login di slowapi
LOGIN_RATE_LIMIT = _env("LOGIN_RATE_LIMIT", "5/minute")

# Invio email tramite SMTP (usato in locale)
SMTP_SERVER = _env("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", "587"))
SMTP_USER = _env("SMTP_USER")
# la password per le app di Google viene mostrata con gli spazi: li tolgo
SMTP_PASSWORD = _env("SMTP_PASSWORD").replace(" ", "")

# Invio tramite API di Brevo su porta HTTPS 443
# Da usare dove le porte SMTP sono bloccate come da  piano gratuito di Render
# Se BREVO_API_KEY è impostata ha la precedenza su SMTP
BREVO_API_KEY = _env("BREVO_API_KEY")
# indirizzo mittente verificato su Brevo e nome visualizzato
EMAIL_MITTENTE = _env("EMAIL_MITTENTE", SMTP_USER)
EMAIL_MITTENTE_NOME = _env("EMAIL_MITTENTE_NOME", "Museo Civico Digitale")

# Modulo Contatti casella email che riceve le domande dei visitatori
CONTATTI_EMAIL = _env("CONTATTI_EMAIL", "r.randazzo85@gmail.com")

# Fuso orario del museo  per apertura, chiusura, prenotazioni e ingressi
# Il server (Render, CI) lavora in UTC senza fuso esplicito
FUSO_ORARIO = _env("FUSO_ORARIO", "Europe/Rome")

# Upload delle immagini delle mostre
STATIC_DIR = Path(__file__).parent / "static"  # cartella servita all'indirizzo /static
UPLOAD_DIR = STATIC_DIR / "uploads"  # qui finiscono le immagini caricate dall'area riservata
UPLOAD_MAX_MB = int(_env("UPLOAD_MAX_MB", "5"))  # dimensione massima di ogni file
ESTENSIONI_IMMAGINI = {".jpg", ".jpeg", ".png", ".webp", ".gif"}  # formati accettati
IMMAGINI_MAX_PER_RICHIESTA = 10  # file caricabili in una sola creazione o modifica di mostra
IMMAGINE_MAX_PIXEL = 40_000_000  # larghezza X altezza massima


def problemi_configurazione() -> list[str]:
    """Elenca i valori di sicurezza non accettabili in produzione.

    In sviluppo i valori dimostrativi sono ammessi mentre in produzione
    main.py rifiuta l'avvio se questo elenco non è vuoto

    Returns:
        Messaggi di errore
    """
    problemi = []
    if SECRET_KEY == SECRET_KEY_DEMO:
        problemi.append("SECRET_KEY non impostata (valore dimostrativo)")
    elif len(SECRET_KEY) < SECRET_KEY_MIN:
        problemi.append(f"SECRET_KEY troppo corta: servono almeno {SECRET_KEY_MIN} caratteri casuali")
    if ADMIN_PASSWORD == ADMIN_PASSWORD_DEMO:
        problemi.append("ADMIN_PASSWORD non impostata (password dimostrativa)")
    return problemi
