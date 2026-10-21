"""Prova di persistenza: i dati restano nel database dopo il riavvio del backend.

Lo script avvia il backend (uvicorn) sul database indicato da DATABASE_URL, registra un visitatore,
crea una prenotazione e una mostra con un'immagine, ferma il server, lo riavvia e controlla che
prenotazione, mostra e immagine siano ancora presenti. Alla fine elimina i dati di prova.

Uso (dalla cartella backend, con il venv attivo):

    DATABASE_URL="postgresql://utente:password@host/db" python verifica_persistenza.py

La password del database non viene mai stampata.
"""

import io
import os
import re
import subprocess
import sys
import time
import uuid
from datetime import date, timedelta

import httpx
from PIL import Image

PORTA = int(os.environ.get("PORTA_VERIFICA", "8765"))
BASE = f"http://127.0.0.1:{PORTA}"
# piccola immagine PNG vera: il backend controlla il contenuto dei file caricati
_buffer = io.BytesIO()
Image.new("RGB", (4, 3), (197, 160, 89)).save(_buffer, format="PNG")
PNG = _buffer.getvalue()


def mascherata(url: str) -> str:
    """Stringa di connessione senza password, da stampare nel resoconto."""
    return re.sub(r"://([^:/@]+):[^@]+@", r"://\1:***@", url)


def avvia_backend() -> subprocess.Popen:
    """Avvia uvicorn e aspetta che risponda."""
    processo = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORTA)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(60):
        try:
            if httpx.get(f"{BASE}/api/mostre", timeout=2).status_code == 200:
                return processo
        except httpx.HTTPError:
            pass
        time.sleep(0.5)
    processo.terminate()
    raise SystemExit("Il backend non si è avviato: controlla DATABASE_URL")


def ferma_backend(processo: subprocess.Popen) -> None:
    """Ferma il processo del backend (come un riavvio o una sospensione su Render)."""
    processo.terminate()
    processo.wait(timeout=20)


def main() -> None:
    url = os.environ.get("DATABASE_URL", "sqlite:///./museo.db")
    admin = {
        "email": os.environ.get("ADMIN_EMAIL", "admin@museo.it"),
        "password": os.environ.get("ADMIN_PASSWORD", "admin2026"),
    }
    email = f"verifica-{uuid.uuid4().hex[:8]}@esempio.it"
    print(f"Database: {mascherata(url)}")

    server = avvia_backend()
    print(f"1. Backend avviato (pid {server.pid})")
    token_admin = httpx.post(f"{BASE}/api/login", json=admin).json()["access_token"]
    h_admin = {"Authorization": f"Bearer {token_admin}"}
    dati_utente = {
        "nome": "Verifica",
        "cognome": "Persistenza",
        "email": email,
        "telefono": "3330000000",
        "password": "Museo2026",
    }
    h_utente = {
        "Authorization": f"Bearer {httpx.post(f'{BASE}/api/utenti/registrazione', json=dati_utente).json()['access_token']}"
    }
    oggi = date.today()
    mostra = httpx.post(
        f"{BASE}/api/mostre",
        data={
            "titolo": "Mostra di verifica persistenza",
            "descrizione": "Mostra creata dallo script di verifica",
            "data_inizio": str(oggi),
            "data_fine": str(oggi + timedelta(days=30)),
        },
        files={"immagini": ("verifica.png", PNG, "image/png")},
        headers=h_admin,
    ).json()
    codice = httpx.post(f"{BASE}/api/prenota", json={"mostra_id": mostra["id"]}, headers=h_utente).json()["codice"]
    print(
        f"2. Creati: visitatore {email}, mostra n. {mostra['id']} con immagine {mostra['immagini']}, prenotazione {codice}"
    )

    ferma_backend(server)
    print("3. Backend fermato: processo terminato, connessioni chiuse")
    server = avvia_backend()
    print(f"4. Backend riavviato (nuovo pid {server.pid})")

    try:
        verifica = httpx.get(f"{BASE}/api/prenotazioni/verifica/{codice}", headers=h_admin)
        immagine = httpx.get(f"{BASE}{mostra['immagini']}")
        esiti = {
            "prenotazione ancora presente": verifica.status_code == 200 and verifica.json()["email"] == email,
            "mostra ancora presente": httpx.get(f"{BASE}/api/mostre/{mostra['id']}").status_code == 200,
            "immagine ancora presente (stessi byte)": immagine.status_code == 200 and immagine.content == PNG,
        }
        for descrizione, ok in esiti.items():
            print(f"5. {descrizione}: {'OK' if ok else 'NO'}")
        # pulizia: elimino i dati di prova
        httpx.delete(f"{BASE}/api/mostre/{mostra['id']}", headers=h_admin)
        httpx.request("DELETE", f"{BASE}/api/utenti/me", json={"password": "Museo2026"}, headers=h_utente)
        print("6. Dati di prova eliminati")
    finally:
        ferma_backend(server)
    if not all(esiti.values()):
        raise SystemExit("Verifica NON superata")
    print("Verifica superata: i dati sono rimasti nel database dopo il riavvio.")


if __name__ == "__main__":
    main()
