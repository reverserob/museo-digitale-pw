import json
import logging
from datetime import date
from pathlib import Path

import models
from database import SessionLocal

logger = logging.getLogger("uvicorn.error")

# File con le mostre iniziali
SEED_FILE = Path(__file__).parent.parent / "data" / "mostre.json"


# get dat from mostre.-json
def leggi_mostre_json():
    with SEED_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def inserisci_dati_iniziali():
    db = SessionLocal()
    try:
        if db.query(models.Mostra).count() == 0:
            mostre = leggi_mostre_json()
            for m in mostre:
                mostra = models.Mostra(
                    titolo=m["titolo"],
                    descrizione=m["descrizione"],
                    # nel JSON le immagini sono una lista, nel DB una stringa separata da virgole
                    immagini=",".join(m["immagini"]),
                    data_inizio=date.fromisoformat(m["data_inizio"]),
                    data_fine=date.fromisoformat(m["data_fine"]),
                )
                # feedback iniziali (facoltativi): collegati alla mostra tramite la relazione
                for f in m.get("feedback", []):
                    mostra.feedback.append(
                        models.Feedback(nome=f["nome"], voto=f["voto"], commento=f.get("commento", ""))
                    )
                db.add(mostra)
            db.commit()
            logger.info(f"Seeding completato: {len(mostre)} mostre inserite da {SEED_FILE.name}")
    except FileNotFoundError:
        logger.error(f"File {SEED_FILE} non trovato: nessuna mostra iniziale inserita")
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"Errore nel file {SEED_FILE.name}: {e}")
    except Exception as e:
        db.rollback()
        logger.error(f"Errore durante il seeding iniziale: {e}")
    finally:
        db.close()
