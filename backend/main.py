import shutil
import os
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import models
import schemas
from database import SessionLocal, engine

# 1. Crea le tabelle nel database SQLite se non esistono
models.Base.metadata.create_all(bind=engine)

# 2. INIZIALIZZA SUBITO L'APPLICAZIONE FASTAPI
app = FastAPI()

# 3. Configurazione della cartella statica per i file caricati
UPLOAD_DIR = Path("static/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 4. Configurazione CORS per permettere le chiamate da React (porta 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Seeding iniziale dei dati con immagini di default dedicate
def inserisci_dati_iniziali():
    db = SessionLocal()
    try:
        if db.query(models.Mostra).count() == 0:
            mostre_di_prova = [
                # Caravaggio
                models.Mostra(
                    titolo="Caravaggio e il suo tempo",
                    descrizione="Un viaggio tra luce e ombra nelle opere milanesi del maestro.",
                    immagini="http://127.0.0.1:8000/static/uploads/caravaggio.webp",
                    data_inizio="2026-10-10",
                    data_fine="2027-01-15"
                ),
                # Leonardo
                models.Mostra(
                    titolo="Leonardo: Il Codice Atlantico",
                    descrizione="Esposizione esclusiva dei disegni tecnici di Leonardo da Vinci.",
                    immagini="http://127.0.0.1:8000/static/uploads/leonardo-da-vinci.webp",
                    data_inizio="2026-11-01",
                    data_fine="2027-02-28"
                ),
                # MONET
                models.Mostra(
                    titolo="Monet: The Immersive Experience",
                    descrizione="Le opere più affascinanti di Monet in un'esposizione avvolgente e spettacolare con uno show di luci e suoni.",
                    immagini="http://127.0.0.1:8000/static/uploads/monet.webp",
                    data_inizio="2026-12-01",
                    data_fine="2027-04-30"
                ),
                # Dalí
                models.Mostra(
                    titolo="DALÍ E LA MODA",
                    descrizione="""Un viaggio tra arte e moda, dove immaginazione, identità e desiderio si fondono in un unico linguaggio visivo. Con oltre 200 opere e documenti — dipinti, disegni, fotografie, abiti, filmati, gioielli e oggetti — la mostra esplora il legame tra l’artista catalano e il mondo della moda, rivelando una dimensione meno nota ma straordinariamente fertile della sua ricerca.
Nell'opera di Dalí ricorre un ricco immaginario simbolico legato all’universo: scarpe, abiti, giacche, guanti e gioielli diventano elementi chiave del suo linguaggio surrealista. Protagonista nella creazione di nuovi codici estetici, l'artista ha collaborato con stilisti, fotografi e maison, ridefinendo i confini tra arte e moda e dimostrando una straordinaria capacità di intuire e sfruttare in anticipo le dinamiche di questo mondo.
Il percorso espositivo spazia dalla pittura alla scultura e al design, dal manichino al corpo, restituendo l'impatto di Dalí sull'immaginario della moda e documentando la tensione costante verso l'innovazione e la libertà creativa che ha guidato tutta la sua ricerca.""",
                    immagini="http://127.0.0.1:8000/static/uploads/salvador-dali-.webp",
                    data_inizio="2026-12-01",
                    data_fine="2027-04-30"
                )
            ]
            db.add_all(mostre_di_prova)
            db.commit()
    finally:
        db.close()

inserisci_dati_iniziali()

# --- ROTTE API ---

@app.get("/api/mostre", response_model=list[schemas.MostraResponse])
def leggi_mostre(db: Session = Depends(get_db)):
    return db.query(models.Mostra).all()

@app.get("/api/mostre/{mostra_id}", response_model=schemas.MostraResponse)
def leggi_singola_mostra(mostra_id: int, db: Session = Depends(get_db)):
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=404, detail="Mostra non trovata")
    return mostra

@app.post("/api/mostre", response_model=schemas.MostraResponse)
async def crea_mostra(
    titolo: str = Form(...),
    descrizione: str = Form(...),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    immagini: list[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    percorsi_salvati = []
    for file in immagini:
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        percorsi_salvati.append(f"http://127.0.0.1:8000/static/uploads/{file.filename}")

    immagini_str = ",".join(percorsi_salvati)

    nuova_mostra = models.Mostra(
        titolo=titolo,
        descrizione=descrizione,
        data_inizio=data_inizio,
        data_fine=data_fine,
        immagini=immagini_str
    )
    db.add(nuova_mostra)
    db.commit()
    db.refresh(nuova_mostra)
    return nuova_mostra

@app.put("/api/mostre/{mostra_id}", response_model=schemas.MostraResponse)
async def aggiorna_mostra(
    mostra_id: int,
    titolo: str = Form(...),
    descrizione: str = Form(...),
    data_inizio: str = Form(...),
    data_fine: str = Form(...),
    immagini: list[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=404, detail="Mostra non trovata")

    mostra.titolo = titolo
    mostra.descrizione = descrizione
    mostra.data_inizio = data_inizio
    mostra.data_fine = data_fine

    if immagini and len(immagini) > 0 and immagini[0].filename != "":
        percorsi_salvati = []
        for file in immagini:
            file_path = UPLOAD_DIR / file.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            percorsi_salvati.append(f"http://127.0.0.1:8000/static/uploads/{file.filename}")
        mostra.immagini = ",".join(percorsi_salvati)

    db.commit()
    db.refresh(mostra)
    return mostra

@app.delete("/api/mostre/{mostra_id}")
def elimina_mostra(mostra_id: int, db: Session = Depends(get_db)):
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=404, detail="Mostra non trovata")

    db.delete(mostra)
    db.commit()
    return {"message": "Mostra eliminata con successo"}


# Funzione di invio email in background (non blocca la risposta HTTP)
def invia_email_background(destinatario: str, nome: str, titolo_mostra: str, data_inizio: str, data_fine: str):
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    mittente = "r.randazzo85@gmail.com"
    password_app = "rwcgvgpxgfwlevcp"

    oggetto = f"Conferma Prenotazione: {titolo_mostra}"

    html_content = f"""
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #0f0f0f; border: 1px solid #c5a059;">
            <h2 style="color: #c5a059;">Museo Civico Digitale</h2>
            <p style="color: #fff;">Gentile <b>{nome}</b>,</p>
            <p style="color: #ddd;">La tua prenotazione è andata a buon fine! Ti aspettiamo per l'esposizione:</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{titolo_mostra}</h3>
                <p style="margin: 0; color: #ccc;"><b>Periodo:</b> Dal {data_inizio} al {data_fine}</p>
            </div>
            <p style="color: #aaa;">A presto,<br><b>La Direzione del Museo</b></p>
        </div>
    """

    msg = MIMEMultipart()
    msg['From'] = mittente
    msg['To'] = destinatario
    msg['Subject'] = oggetto
    msg.attach(MIMEText(html_content, 'html'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.starttls()
        server.login(mittente, password_app)
        server.sendmail(mittente, destinatario, msg.as_string())
        server.quit()
        print(f"\n[EMAIL REALE INVIATA CON SUCCESSO A]: {destinatario}\n")
    except Exception as e:
        print(f"\n[ERRORE INVIO EMAIL BACKGROUND]: {e}\n")

@app.post("/api/prenota")
async def crea_prenotazione(
    dati: schemas.PrenotazioneCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    mostra = db.query(models.Mostra).filter(models.Mostra.id == dati.mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=404, detail="Mostra non trovata")

    # Accoda l'invio dell'email in background usando i dati validati
    background_tasks.add_task(
        invia_email_background,
        destinatario=dati.email,
        nome=dati.nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine
    )

    return {"message": "Prenotazione effettuata con successo e email in elaborazione!"}

"""
@app.post("/api/prenota")
async def crea_prenotazione(
    background_tasks: BackgroundTasks,
    mostra_id: int = Form(...),
    nome: str = Form(...),
    cognome: str = Form(...),
    email: str = Form(...),
    telefono: str = Form(...),
    db: Session = Depends(get_db)
):
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=404, detail="Mostra non trovata")

    # Accoda l'invio dell'email in background e risponde immediatamente al front-end
    background_tasks.add_task(
        invia_email_background,
        destinatario=email,
        nome=nome,
        titolo_mostra=mostra.titolo,
        data_inizio=mostra.data_inizio,
        data_fine=mostra.data_fine
    )

    return {"message": "Prenotazione effettuata con successo e email in elaborazione!"}
 """
