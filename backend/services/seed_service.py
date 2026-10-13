import logging

import models
from database import SessionLocal

logger = logging.getLogger("uvicorn.error")


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
