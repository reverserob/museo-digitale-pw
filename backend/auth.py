"""Autenticazione dell'area riservata"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import settings

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


def crea_token(email: str) -> str:
    scadenza = int(time.time()) + settings.TOKEN_DURATA_ORE * 3600
    payload = _b64(json.dumps({"sub": email, "exp": scadenza}).encode())
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


def richiedi_admin(credenziali: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> str:
    """Dipendenza FastAPI: blocca la richiesta se manca un token valido."""
    dati = _leggi_token(credenziali.credentials) if credenziali else None
    if dati is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Accesso non autorizzato: effettua il login nell'area riservata.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return dati["sub"]
