"""Logica degli account dei visitatori condivisa tra area personale e area riservata."""

from sqlalchemy.orm import Session

import models
import schemas

# valori che sostituiscono i dati personali nelle prenotazioni già usate per l'ingresso
NOME_ANONIMO = "Account"
COGNOME_ANONIMO = "eliminato"
# nome pubblico mostrato sui feedback di un account eliminato
FEEDBACK_ANONIMO = "Visitatore"


def riepilogo(utente: models.Utente) -> dict:
    """Profilo dell'account con il numero di prenotazioni e di feedback (per l'area riservata).

    Args:
        utente: Account del visitatore.

    Returns:
        Dizionario compatibile con `schemas.UtenteAdminResponse`.
    """
    return {
        "id": utente.id,
        "nome": utente.nome,
        "cognome": utente.cognome,
        "email": utente.email,
        "telefono": utente.telefono,
        "creato_il": utente.creato_il,
        "prenotazioni": len(utente.prenotazioni),
        "feedback": len(utente.feedback),
    }


def aggiorna_profilo(db: Session, utente: models.Utente, dati: schemas.ProfiloUpdateRequest) -> models.Utente:
    """Aggiorna nome, cognome e telefono dell'account.

    Le prenotazioni già fatte conservano i dati copiati al momento della prenotazione (storico),
    mentre le prenotazioni future useranno i nuovi dati.

    Args:
        db: Sessione del database.
        utente: Account da modificare.
        dati: Nuovi valori, già validati dallo schema.

    Returns:
        L'account aggiornato.
    """
    utente.nome = dati.nome
    utente.cognome = dati.cognome
    utente.telefono = dati.telefono
    db.commit()
    db.refresh(utente)
    return utente


def elimina_account(db: Session, utente: models.Utente) -> dict:
    """Elimina l'account applicando il diritto alla cancellazione (art. 17 GDPR).

    - le prenotazioni non ancora usate vengono annullate (eliminate);
    - le prenotazioni già usate per l'ingresso restano nello storico del museo, ma senza dati personali;
    - i feedback restano visibili con un nome generico e senza collegamento all'account.

    Tutto avviene in un'unica transazione: se qualcosa fallisce non viene modificato nulla.

    Args:
        db: Sessione del database.
        utente: Account da eliminare.

    Returns:
        Quante prenotazioni sono state annullate e quante rese anonime.
    """
    annullate = anonimizzate = 0
    try:
        for prenotazione in list(utente.prenotazioni):
            if prenotazione.ingresso_il is None:
                db.delete(prenotazione)
                annullate += 1
            else:
                prenotazione.nome = NOME_ANONIMO
                prenotazione.cognome = COGNOME_ANONIMO
                prenotazione.email = ""
                prenotazione.telefono = ""
                prenotazione.utente_id = None
                anonimizzate += 1
        for feedback in list(utente.feedback):
            feedback.nome = FEEDBACK_ANONIMO
            feedback.utente_id = None
        db.delete(utente)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"prenotazioni_annullate": annullate, "prenotazioni_anonimizzate": anonimizzate}
