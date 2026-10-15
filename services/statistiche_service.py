from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import models

# Indicatori per la dashboard dell'area riservata


def stato_mostra(mostra: models.Mostra, oggi: date) -> str:
    if mostra.data_fine < oggi:
        return "conclusa"
    if mostra.data_inizio > oggi:
        return "futura"
    return "in corso"


def _arrotonda(valore) -> Optional[float]:
    return round(float(valore), 1) if valore is not None else None


def calcola_statistiche(db: Session) -> dict:
    oggi = date.today()
    mostre = db.query(models.Mostra).order_by(models.Mostra.data_inizio).all()

    # conteggi raggruppati per mostra: una query per tabella invece di una per mostra
    prenotazioni_per_mostra = dict(
        db.query(models.Prenotazione.mostra_id, func.count(models.Prenotazione.id))
        .group_by(models.Prenotazione.mostra_id)
        .all()
    )
    feedback_per_mostra = {
        mostra_id: (totale, media)
        for mostra_id, totale, media in db.query(
            models.Feedback.mostra_id, func.count(models.Feedback.id), func.avg(models.Feedback.voto)
        )
        .group_by(models.Feedback.mostra_id)
        .all()
    }

    per_mostra = []
    stati = {"in corso": 0, "futura": 0, "conclusa": 0}
    for m in mostre:
        stato = stato_mostra(m, oggi)
        stati[stato] += 1
        totale_fb, media_fb = feedback_per_mostra.get(m.id, (0, None))
        per_mostra.append(
            {
                "mostra_id": m.id,
                "titolo": m.titolo,
                "stato": stato,
                "prenotazioni": prenotazioni_per_mostra.get(m.id, 0),
                "feedback": totale_fb,
                "voto_medio": _arrotonda(media_fb),
            }
        )

    # creata_il è salvata in UTC senza fuso nel DB SQLite: confronto con un datetime "naive"
    limite = (datetime.now(timezone.utc) - timedelta(days=7)).replace(tzinfo=None)
    ultimi_7 = db.query(models.Prenotazione).filter(models.Prenotazione.creata_il >= limite).count()

    return {
        "totale_mostre": len(mostre),
        "mostre_in_corso": stati["in corso"],
        "mostre_future": stati["futura"],
        "mostre_concluse": stati["conclusa"],
        "totale_prenotazioni": sum(prenotazioni_per_mostra.values()),
        "prenotazioni_ultimi_7_giorni": ultimi_7,
        "totale_feedback": db.query(models.Feedback).count(),
        "voto_medio": _arrotonda(db.query(func.avg(models.Feedback.voto)).scalar()),
        "per_mostra": per_mostra,
    }
