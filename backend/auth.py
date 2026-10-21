"""Autenticazione: area riservata (admin) e account dei visitatori.

Contiene tre meccanismi, tutti basati solo sulla libreria standard di Python:
- hash delle password dei visitatori con PBKDF2-HMAC-SHA256;
- token di accesso firmati con HMAC-SHA256 (struttura simile a un JWT: dati.firma);
- token monouso per reimpostare la password.
"""

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

# legge l'header "Authorization: Bearer <token>"; auto_error=False permette di
# restituire messaggi personalizzati invece dell'errore predefinito di FastAPI
_bearer = HTTPBearer(auto_error=False)


# --- Funzioni di supporto: codifica Base64 "URL safe" e firma ---
def _b64(data: bytes) -> str:
    """Codifica in Base64 senza i caratteri "=" finali (il token resta compatto)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    """Decodifica Base64 rimettendo il padding "=" tolto da _b64."""
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _firma(payload: str) -> str:
    """Firma HMAC-SHA256 del contenuto con la chiave segreta del server.

    Senza la SECRET_KEY nessuno può produrre una firma valida, quindi un token
    modificato (es. cambiando il ruolo) viene riconosciuto e rifiutato.
    """
    return _b64(hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())


def verifica_credenziali(email: str, password: str) -> bool:
    """Controlla email e password dell'amministratore (lette dalle variabili d'ambiente).

    Args:
        email: Email inserita nel form (maiuscole e spazi ignorati).
        password: Password inserita nel form.

    Returns:
        True se coincidono con ADMIN_EMAIL e ADMIN_PASSWORD.
    """
    # compare_digest evita attacchi basati sui tempi di risposta
    email_ok = secrets.compare_digest(email.strip().lower(), settings.ADMIN_EMAIL.lower())
    password_ok = secrets.compare_digest(password, settings.ADMIN_PASSWORD)
    return email_ok and password_ok


# --- Password dei visitatori ---
# numero di iterazioni di PBKDF2: rende lento (e quindi costoso) provare molte password
ITERAZIONI_PASSWORD = 200_000


def hash_password(password: str) -> str:
    """Calcola l'hash PBKDF2-SHA256 della password con un sale casuale.

    Args:
        password: Password in chiaro.

    Returns:
        Stringa da salvare nel database, nel formato `algoritmo$iterazioni$sale$hash`.
    """
    # sale casuale diverso per ogni utente: due password uguali producono hash diversi
    sale = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), sale, ITERAZIONI_PASSWORD)
    return f"pbkdf2_sha256${ITERAZIONI_PASSWORD}${_b64(sale)}${_b64(digest)}"


def verifica_password(password: str, hash_salvato: str) -> bool:
    """Ricalcola l'hash della password inserita con lo stesso sale e lo confronta con quello salvato.

    Args:
        password: Password inserita dall'utente.
        hash_salvato: Valore prodotto da `hash_password`.

    Returns:
        True se la password è corretta; False anche se l'hash salvato non è leggibile.
    """
    try:
        algoritmo, iterazioni, sale, digest = hash_salvato.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        calcolato = hashlib.pbkdf2_hmac("sha256", password.encode(), _unb64(sale), int(iterazioni))
        return hmac.compare_digest(_b64(calcolato), digest)
    except ValueError:
        # hash salvato in un formato inatteso: la password non può essere verificata
        return False


# --- Token di accesso ---
def impronta_admin() -> str:
    """Impronta delle credenziali attuali dell'amministratore, inserita nei suoi token.

    È un HMAC (con la chiave segreta) di email e password: non rivela la password, ma cambia quando la
    password viene cambiata su Render, e da quel momento tutti i token dell'amministratore già emessi
    vengono rifiutati, anche se non sono ancora scaduti.

    Returns:
        Prime 16 cifre esadecimali dell'HMAC-SHA256.
    """
    credenziali = f"{settings.ADMIN_EMAIL}:{settings.ADMIN_PASSWORD}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), credenziali, hashlib.sha256).hexdigest()[:16]


def crea_token(
    email: str, ruolo: str = "admin", utente_id: Optional[int] = None, impronta: Optional[str] = None
) -> str:
    """Crea un token firmato con scadenza; il ruolo distingue l'amministratore dai visitatori.

    Args:
        email: Email del titolare del token.
        ruolo: `"admin"`, `"utente"` oppure `"reset"`.
        utente_id: Id del visitatore (solo per i ruoli dei visitatori).
        impronta: Impronta della password attuale (per l'amministratore, se omessa, `impronta_admin()`):
            quando la password cambia, i token già emessi smettono di valere.

    Returns:
        Token nel formato `contenuto.firma`, entrambi in Base64.
    """
    scadenza = int(time.time()) + settings.TOKEN_DURATA_ORE * 3600
    # "sub" = soggetto (chi è), "exp" = scadenza in secondi dal 1970 (come nei JWT)
    dati = {"sub": email, "ruolo": ruolo, "exp": scadenza}
    if utente_id is not None:
        dati["uid"] = utente_id
    if impronta is None and ruolo == "admin":
        impronta = impronta_admin()
    if impronta is not None:
        dati["pw"] = impronta
    payload = _b64(json.dumps(dati).encode())
    # il token è "contenuto.firma": il contenuto è leggibile, ma non modificabile senza la chiave
    return f"{payload}.{_firma(payload)}"


def _leggi_token(token: str) -> Optional[dict]:
    """Restituisce i dati del token se la firma è valida e non è scaduto, altrimenti None."""
    try:
        payload, firma = token.split(".", 1)
        if not hmac.compare_digest(firma, _firma(payload)):
            return None  # firma non valida: token falso o manomesso
        dati = json.loads(_unb64(payload))
        if dati.get("exp", 0) < time.time():
            return None  # token scaduto
        return dati
    except (ValueError, json.JSONDecodeError):
        return None  # stringa che non ha la forma di un token


def _non_autorizzato(messaggio: str) -> HTTPException:
    """Errore 401 con l'header standard che indica al client di autenticarsi con un token Bearer."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=messaggio, headers={"WWW-Authenticate": "Bearer"}
    )


def richiedi_admin(credenziali: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> str:
    """Dipendenza FastAPI: lascia passare solo l'amministratore e restituisce la sua email.

    Si usa nelle rotte riservate con `_admin: str = Depends(richiedi_admin)`.

    Args:
        credenziali: Header `Authorization: Bearer <token>` letto da FastAPI.

    Returns:
        Email dell'amministratore contenuta nel token.

    Raises:
        HTTPException: 401 se il token manca, non è valido, è scaduto, non ha ruolo `admin` o è stato
            emesso prima di un cambio della password dell'amministratore.
    """
    dati = _leggi_token(credenziali.credentials) if credenziali else None
    # il token deve avere ruolo admin ed essere stato emesso con la password attuale dell'amministratore
    if (
        dati is None
        or dati.get("ruolo") != "admin"
        or not hmac.compare_digest(str(dati.get("pw", "")), impronta_admin())
    ):
        raise _non_autorizzato("Accesso non autorizzato: effettua il login nell'area riservata.")
    return dati["sub"]


def richiedi_utente(
    credenziali: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> models.Utente:
    """Dipendenza FastAPI: lascia passare solo un visitatore registrato e restituisce il suo account.

    Args:
        credenziali: Header `Authorization: Bearer <token>` letto da FastAPI.
        db: Sessione del database.

    Returns:
        L'account del visitatore indicato nel token.

    Raises:
        HTTPException: 401 se il token manca, non è valido, è scaduto, l'account non esiste più o la
            password è cambiata dopo l'emissione del token;
            403 se il token è valido ma di un altro ruolo (es. l'amministratore che prova a prenotare).
    """
    dati = _leggi_token(credenziali.credentials) if credenziali else None
    if dati is None:
        # nessun token o token non valido: il visitatore deve accedere (401)
        raise _non_autorizzato("Accedi o registrati per continuare.")
    if dati.get("ruolo") != "utente":
        # token valido ma di un altro ruolo (es. l'amministratore che prova a prenotare): 403
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Questa operazione è riservata ai visitatori registrati.",
        )
    utente = db.get(models.Utente, dati.get("uid"))
    if utente is None:
        # l'account non esiste più (es. eliminato dopo l'emissione del token)
        raise _non_autorizzato("Account non trovato: accedi di nuovo.")
    if not hmac.compare_digest(str(dati.get("pw", "")), impronta_password(utente)):
        # la password è stata reimpostata dopo l'emissione del token: le vecchie sessioni non valgono più
        raise _non_autorizzato("Sessione scaduta: accedi di nuovo.")
    return utente


# --- Token per reimpostare la password ---
def impronta_password(utente: models.Utente) -> str:
    """Breve impronta dell'hash attuale della password."""
    # cambia quando cambia la password: così il link di reset si può usare una sola volta
    return hashlib.sha256(utente.password_hash.encode()).hexdigest()[:16]


def crea_token_reset(utente: models.Utente) -> str:
    """Crea il token da inserire nel link di reimpostazione della password.

    Il token ha ruolo `reset`, scade dopo `RESET_PASSWORD_MINUTI` minuti e contiene un'impronta
    della password attuale: dopo il cambio della password lo stesso link non funziona più.

    Args:
        utente: Account del visitatore.

    Returns:
        Token firmato.
    """
    scadenza = int(time.time()) + settings.RESET_PASSWORD_MINUTI * 60
    dati = {"sub": utente.email, "ruolo": "reset", "uid": utente.id, "pw": impronta_password(utente), "exp": scadenza}
    payload = _b64(json.dumps(dati).encode())
    return f"{payload}.{_firma(payload)}"


def leggi_token_reset(token: str, db: Session) -> Optional[models.Utente]:
    """Restituisce il visitatore se il link di reset è valido, non scaduto e non ancora usato.

    Args:
        token: Token ricevuto nel link.
        db: Sessione del database.

    Returns:
        L'account del visitatore, oppure None se il token non è valido.
    """
    dati = _leggi_token(token)
    # un token di accesso normale non può essere usato come token di reset (e viceversa)
    if dati is None or dati.get("ruolo") != "reset":
        return None
    utente = db.get(models.Utente, dati.get("uid"))
    # se la password è già stata cambiata l'impronta non corrisponde più: link già usato
    if utente is None or not hmac.compare_digest(dati.get("pw", ""), impronta_password(utente)):
        return None
    return utente
