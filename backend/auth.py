"""Autenticazione: area riservata (admin) e account dei visitatori"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import models
import settings
from database import get_db

_bearer = HTTPBearer(auto_error=False)


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _firma(payload: str) -> str:
    return _b64(hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())


def verifica_credenziali(email: str, password: str) -> bool:
    # compare_digest evita attacchi basati sui tempi di risposta
    email_ok = secrets.compare_digest(email.strip().lower(), settings.ADMIN_EMAIL.lower())
    password_ok = secrets.compare_digest(password, settings.ADMIN_PASSWORD)
    return email_ok and password_ok


# --- password dei visitatori ---
# PBKDF2-HMAC-SHA256 (libreria standard): la password non viene mai salvata, solo il suo hash
# calcolato con un "sale" casuale e molte iterazioni, così è lento da indovinare per forza bruta.
ITERAZIONI_PASSWORD = 200_000


def hash_password(password: str) -> str:
    sale = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), sale, ITERAZIONI_PASSWORD)
    return f"pbkdf2_sha256${ITERAZIONI_PASSWORD}${_b64(sale)}${_b64(digest)}"


def verifica_password(password: str, hash_salvato: str) -> bool:
    try:
        algoritmo, iterazioni, sale, digest = hash_salvato.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        calcolato = hashlib.pbkdf2_hmac("sha256", password.encode(), _unb64(sale), int(iterazioni))
        return hmac.compare_digest(_b64(calcolato), digest)
    except ValueError:
        return False


# --- token ---
def crea_token(email: str, ruolo: str = "admin", utente_id: Optional[int] = None) -> str:
    """Token firmato con scadenza; il ruolo distingue l'amministratore dai visitatori."""
    scadenza = int(time.time()) + settings.TOKEN_DURATA_ORE * 3600
    dati = {"sub": email, "ruolo": ruolo, "exp": scadenza}
    if utente_id is not None:
        dati["uid"] = utente_id
    payload = _b64(json.dumps(dati).encode())
    return f"{payload}.{_firma(payload)}"


def _leggi_token(token: str) -> Optional[dict]:
    try:
        payload, firma = token.split(".", 1)
        if not hmac.compare_digest(firma, _firma(payload)):
            return None
        dati = json.loads(_unb64(payload))
        if dati.get("exp", 0) < time.time():
            return None
        return dati
    except (ValueError, json.JSONDecodeError):
        return None


def _non_autorizzato(messaggio: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=messaggio, headers={"WWW-Authenticate": "Bearer"}
    )


def richiedi_admin(credenziali: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> str:
    """Dipendenza FastAPI: lascia passare solo il token dell'amministratore."""
    dati = _leggi_token(credenziali.credentials) if credenziali else None
    if dati is None or dati.get("ruolo") != "admin":
        raise _non_autorizzato("Accesso non autorizzato: effettua il login nell'area riservata.")
    return dati["sub"]


def richiedi_utente(
    credenziali: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Utente:
    """Dipendenza FastAPI: lascia passare solo un visitatore registrato e restituisce il suo account."""
    dati = _leggi_token(credenziali.credentials) if credenziali else None
    if dati is None:
        raise _non_autorizzato("Accedi o registrati per continuare.")
    if dati.get("ruolo") != "utente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Questa operazione è riservata ai visitatori registrati.",
        )
    utente = db.get(models.Utente, dati.get("uid"))
    if utente is None:
        raise _non_autorizzato("Account non trovato: accedi di nuovo.")
    return utente
