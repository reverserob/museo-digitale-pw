from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas
from database import SessionLocal, engine

# Crea le tabelle nel database SQLite se non esistono
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configurazione CORS per permettere le chiamate da React (porta 5173)
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

# Seeding iniziale dei dati con le immagini per la galleria
def inserisci_dati_iniziali():
    db = SessionLocal()
    try:
        if db.query(models.Mostra).count() == 0:
            immagini_default = (
                "https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=800,"
                "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=600,"
                "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=600,"
                "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?q=80&w=600,"
                "https://images.unsplash.com/photo-1518998053401-b33c898cb9b6?q=80&w=600"
            )
            mostre_di_prova = [
                models.Mostra(
                    titolo="Caravaggio e il suo tempo", 
                    descrizione="Un viaggio tra luce e ombra nelle opere milanesi del maestro.", 
                    capienza_massima=100,
                    immagini=immagini_default
                ),
                models.Mostra(
                    titolo="Leonardo: Il Codice Atlantico", 
                    descrizione="Esposizione esclusiva dei disegni tecnici di Leonardo da Vinci.", 
                    capienza_massima=50,
                    immagini=immagini_default
                ),
                models.Mostra(
                    titolo="Arte Contemporanea in Lombardia", 
                    descrizione="Le nuove correnti artistiche dal 2000 a oggi.", 
                    capienza_massima=200,
                    immagini=immagini_default
                )
            ]
            db.add_all(mostre_di_prova)
            db.commit()
    finally:
        db.close()

# Esegue il seeding all'avvio
inserisci_dati_iniziali()

@app.get("/api/mostre", response_model=list[schemas.MostraResponse])
def leggi_mostre(db: Session = Depends(get_db)):
    return db.query(models.Mostra).all()

@app.get("/api/mostre/{mostra_id}", response_model=schemas.MostraResponse)
def leggi_singola_mostra(mostra_id: int, db: Session = Depends(get_db)):
    mostra = db.query(models.Mostra).filter(models.Mostra.id == mostra_id).first()
    if mostra is None:
        raise HTTPException(status_code=404, detail="Mostra non trovata")
    return mostra

# API per CREARE una nuova mostra dall'Area Riservata Admin
@app.post("/api/mostre", response_model=schemas.MostraResponse)
def crea_mostra(mostra: schemas.MostraCreate, db: Session = Depends(get_db)):
    nuova_mostra = models.Mostra(
        titolo=mostra.titolo,
        descrizione=mostra.descrizione,
        capienza_massima=mostra.capienza_massima,
        immagini=mostra.immagini
    )
    db.add(nuova_mostra)
    db.commit()
    db.refresh(nuova_mostra)
    return nuova_mostra
