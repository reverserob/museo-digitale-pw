import html
import logging
import smtplib
import uuid
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

import models
import schemas
import settings
from auth import crea_token, richiedi_admin, verifica_credenziali
from database import SessionLocal, engine

logger = logging.getLogger("uvicorn.error")

# 1. Crea le tabelle nel database se non esistono
models.Base.metadata.create_all(bind=engine)

# 2. Applicazione FastAPI
app = FastAPI(title="Museo Civico Digitale - API")

# 3. Cartella statica per i file caricati.
#    Nel DB salviamo percorsi RELATIVI ("/static/uploads/<file>"): è il frontend
#    ad anteporre l'indirizzo del backend, così funziona sia in locale sia online.
STATIC_DIR = Path(__file__).parent / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# 4. CORS: solo i domini del frontend configurati
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# Error handler
@app.exception_handler(RequestValidationError)
async def errore_validazione(request: Request, exc: RequestValidationError):
    messaggi = []
    for err in exc.errors():
        campo = err["loc"][-1] if err.get("loc") else ""
        testo = str(err.get("msg", "")).replace("Value error, ", "")
        messaggi.append(f"{campo}: {testo}" if campo else testo)
    return JSONResponse(
        status_code=422,
        content={"detail": " · ".join(messaggi) or "Dati non validi."},
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Seeding iniziale ---
def inserisci_dati_iniziali():
    db = SessionLocal()
    try:
        if db.query(models.Mostra).count() == 0:
            db.add_all([
                models.Mostra(
                    titolo="Caravaggio e il suo tempo",
                    descrizione="Un viaggio tra luce e ombra nelle opere milanesi del maestro.",
                    immagini="/static/uploads/caravaggio.webp",
                    data_inizio="2026-10-10",
                    data_fine="2027-01-15",
                ),
                models.Mostra(
                    titolo="Leonardo: Il Codice Atlantico",
                    descrizione="Esposizione esclusiva dei disegni tecnici di Leonardo da Vinci.",
                    immagini="/static/uploads/leonardo-da-vinci.webp,/static/uploads/leonardo-alle-pmi.webp,/static/uploads/leonardo-da-vinci-3.webp",
                    data_inizio="2026-11-01",
                    data_fine="2027-02-28",
                ),
                models.Mostra(
                    titolo="Monet: La Natura",
                    descrizione="Le opere di Monet, i colori, le sfumature e lo spettacolo della natura.",
                    immagini="/static/uploads/monet.webp",
                    data_inizio="2026-12-01",
                    data_fine="2027-04-30",
                ),
                models.Mostra(
                    titolo="Dalí e le forme",
                    descrizione="Un viaggio nelle forme e nei colori di Dalí, dove immaginazione e colori si fondono in rappresentazioni uniche.",
                    immagini="/static/uploads/salvador-dali-.webp",
                    data_inizio="2026-12-01",
                    data_fine="2027-04-30",
                ),
            ])
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante il seeding iniziale: {e}")
    finally:
        db.close()


inserisci_dati_iniziali()


# --- Utility upload ---
def _file_presenti(immagini: Optional[List[UploadFile]]) -> List[UploadFile]:
    return [f for f in (immagini or []) if f is not None and f.filename]


async def salva_immagini(immagini: List[UploadFile]) -> List[str]:
    """Valida e salva le immagini con un nome univoco; restituisce i percorsi relativi."""
    limite = settings.UPLOAD_MAX_MB * 1024 * 1024
    da_scrivere = []
    for file in immagini:
        estensione = Path(file.filename).suffix.lower()
        if estensione not in settings.ESTENSIONI_IMMAGINI or not (file.content_type or "").startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Il file '{file.filename}' non è un'immagine supportata (jpg, png, webp, gif).",
            )
        contenuto = await file.read()
        if len(contenuto) > limite:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Il file '{file.filename}' supera il limite di {settings.UPLOAD_MAX_MB} MB.",
            )
        # Nome generato dal server: niente path traversal né sovrascritture
        da_scrivere.append((f"{uuid.uuid4().hex}{estensione}", contenuto))

    # Scrittura su disco con validazione
    percorsi = []
    for nome, contenuto in da_scrivere:
        (UPLOAD_DIR / nome).write_bytes(contenuto)
        percorsi.append(f"/static/uploads/{nome}")
    return percorsi


def _date_valide(data_inizio: str, data_fine: str) -> None:
    try:
        schemas.valida_date(data_inizio, data_fine)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


def _trova_mostra(db: Session, mostra_id: int) -> models.Mostra:
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mostra non trovata")
    return mostra


# --- AUTENTICAZIONE ---
@app.post("/api/login", response_model=schemas.TokenResponse)
def login(dati: schemas.LoginRequest):
    if not verifica_credenziali(dati.email, dati.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenziali errate.")
    return {"access_token": crea_token(dati.email.strip().lower())}


# --- API GET MOSTRE ---
@app.get("/api/mostre", response_model=List[schemas.MostraResponse])
def leggi_mostre(db: Session = Depends(get_db)):
    try:
        return db.query(models.Mostra).order_by(models.Mostra.data_inizio).all()
    except Exception as e:
        logger.error(f"Errore nel recupero delle mostre: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Errore nel recupero delle mostre dal database.")

# --- API GET MOSTRE_ID---
@app.get("/api/mostre/{mostra_id}", response_model=schemas.MostraResponse)
def leggi_singola_mostra(mostra_id: int, db: Session = Depends(get_db)):
    return _trova_mostra(db, mostra_id)


# --- API POST MOSTRE ---
@app.post("/api/mostre", response_model=schemas.MostraResponse, status_code=status.HTTP_201_CREATED)
async def crea_mostra(
    titolo: str = Form(..., min_length=3, max_length=200),
    descrizione: str = Form(..., min_length=10),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    immagini: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    _date_valide(data_inizio, data_fine)
    file_validi = _file_presenti(immagini)
    if not file_validi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Carica almeno un'immagine.")
    percorsi = await salva_immagini(file_validi)
    try:
        nuova_mostra = models.Mostra(
            titolo=titolo.strip(),
            descrizione=descrizione.strip(),
            data_inizio=data_inizio,
            data_fine=data_fine,
            immagini=",".join(percorsi),
        )
        db.add(nuova_mostra)
        db.commit()
        db.refresh(nuova_mostra)
        return nuova_mostra
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante la creazione della mostra: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile pubblicare la nuova mostra.")

# --- API PUT MOSTRE ---
@app.put("/api/mostre/{mostra_id}", response_model=schemas.MostraResponse)
async def aggiorna_mostra(
    mostra_id: int,
    titolo: str = Form(..., min_length=3, max_length=200),
    descrizione: str = Form(..., min_length=10),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    immagini: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    mostra = _trova_mostra(db, mostra_id)
    _date_valide(data_inizio, data_fine)
    file_validi = _file_presenti(immagini)
    # Le immagini sono facoltative in modifica: se non ne arrivano si tengono le attuali
    percorsi = await salva_immagini(file_validi) if file_validi else None
    try:
        mostra.titolo = titolo.strip()
        mostra.descrizione = descrizione.strip()
        mostra.data_inizio = data_inizio
        mostra.data_fine = data_fine
        if percorsi:
            mostra.immagini = ",".join(percorsi)
        db.commit()
        db.refresh(mostra)
        return mostra
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante l'aggiornamento della mostra {mostra_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile aggiornare la mostra.")

# --- API DELETE MOSTRE ---
@app.delete("/api/mostre/{mostra_id}")
def elimina_mostra(
    mostra_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    mostra = _trova_mostra(db, mostra_id)
    try:
        db.delete(mostra)  # elimina anche le prenotazioni collegate (cascade)
        db.commit()
        return {"message": "Mostra eliminata con successo"}
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante l'eliminazione della mostra {mostra_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Impossibile eliminare la mostra.")


# --- PRENOTAZIONI ---
def invia_email_background(destinatario: str, nome: str, titolo_mostra: str, data_inizio: str, data_fine: str):
    """Invia l'email di conferma. Gira in background dopo la risposta HTTP."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP non configurato: email di conferma per {destinatario} non inviata.")
        return

    nome_html = html.escape(nome)
    titolo_html = html.escape(titolo_mostra)

    html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #0f0f0f; border: 1px solid #c5a059;">
            <h2 style="color: #c5a059;">Museo Civico Digitale</h2>
            <p style="color: #fff;">Gentile <b>{nome_html}</b>,</p>
            <p style="color: #ddd;">La tua prenotazione è andata a buon fine! Ti aspettiamo per l'esposizione:</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{titolo_html}</h3>
                <p style="margin: 0; color: #ccc;"><b>Periodo:</b> Dal {data_inizio} al {data_fine}</p>
            </div>
            <p style="color: #aaa;">A presto,<br><b>La Direzione del Museo</b></p>
        </div>
    """

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = destinatario
    msg["Subject"] = f"Conferma Prenotazione: {titolo_mostra}"
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, destinatario, msg.as_string())
        logger.info(f"Email di conferma inviata a {destinatario}")
    except Exception as e:
        logger.error(f"Errore invio email a {destinatario}: {e}")

# --- API POST PRENOTA ---
@app.post("/api/prenota", status_code=status.HTTP_201_CREATED)
def crea_prenotazione(
    dati: schemas.PrenotazioneCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    mostra = _trova_mostra(db, dati.mostra_id)

    if date.fromisoformat(mostra.data_fine) < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La mostra è già conclusa: non è più possibile prenotare.")

    try:
        prenotazione = models.Prenotazione(
            mostra_id=mostra.id,
            nome=dati.nome,
            cognome=dati.cognome,
            email=dati.email,
            telefono=dati.telefono,
        )
        db.add(prenotazione)
        db.commit()
        db.refresh(prenotazione)
    except Exception as e:
        db.rollback()
        logger.error(f"Errore critico durante la prenotazione: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Errore interno durante l'elaborazione della prenotazione.")

    background_tasks.add_task(
        invia_email_background,
        destinatario=dati.email,
        nome=dati.nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine,
    )
    return {"message": "Prenotazione effettuata con successo!", "id": prenotazione.id}

# --- API POST PRENOTAZIONI ---
@app.get("/api/prenotazioni", response_model=List[schemas.PrenotazioneResponse])
def leggi_prenotazioni(
    mostra_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _admin: str = Depends(richiedi_admin),
):
    query = db.query(models.Prenotazione)
    if mostra_id is not None:
        query = query.filter(models.Prenotazione.mostra_id == mostra_id)
    return query.order_by(models.Prenotazione.creata_il.desc()).all()
