/**
 * Tipi dei dati scambiati con il backend, descritti con JSDoc.
 *
 * Il file contiene solo documentazione: corrisponde agli schemi Pydantic di `backend/schemas.py`
 * e non viene importato dall'applicazione. Le date arrivano come testo ISO
 * (`AAAA-MM-GG` per le date, `AAAA-MM-GGThh:mm:ss` in UTC per data e ora).
 *
 * @module tipi
 */

/**
 * Una mostra del catalogo.
 *
 * @typedef {object} Mostra
 * @property {number} id Identificativo della mostra.
 * @property {string} titolo Titolo (da 3 a 200 caratteri).
 * @property {string} descrizione Descrizione (almeno 10 caratteri).
 * @property {string} immagini Percorsi delle immagini separati da virgola (es. `/static/uploads/a.webp,/static/uploads/b.webp`).
 * @property {string} data_inizio Data di apertura (`AAAA-MM-GG`).
 * @property {string} data_fine Data di chiusura (`AAAA-MM-GG`).
 */

/**
 * Profilo di un visitatore registrato.
 *
 * @typedef {object} Utente
 * @property {number} id Identificativo dell'account.
 * @property {string} nome Nome.
 * @property {string} cognome Cognome.
 * @property {string} email Email (in minuscolo, unica).
 * @property {string} telefono Telefono (da 6 a 15 cifre).
 */

/**
 * Sessione del visitatore salvata nel browser dopo login o registrazione.
 *
 * @typedef {object} SessioneUtente
 * @property {string} token Token firmato con ruolo `utente`.
 * @property {Utente} utente Profilo del visitatore.
 */

/**
 * Prenotazione vista dall'amministratore (`GET /api/prenotazioni`).
 *
 * @typedef {object} Prenotazione
 * @property {number} id Identificativo della prenotazione.
 * @property {number} mostra_id Mostra prenotata.
 * @property {string} nome Nome del visitatore.
 * @property {string} cognome Cognome del visitatore.
 * @property {string} email Email del visitatore.
 * @property {string} telefono Telefono indicato nella prenotazione.
 * @property {string} creata_il Data e ora della prenotazione (UTC).
 */

/**
 * Prenotazione vista dal visitatore nella sua area personale (`GET /api/utenti/me/prenotazioni`).
 *
 * @typedef {object} MiaPrenotazione
 * @property {number} id Identificativo della prenotazione.
 * @property {number} mostra_id Mostra prenotata.
 * @property {string} titolo_mostra Titolo della mostra.
 * @property {string} data_inizio Data di apertura della mostra.
 * @property {string} data_fine Data di chiusura della mostra.
 * @property {string} creata_il Data e ora della prenotazione (UTC).
 */

/**
 * Feedback (recensione) lasciato da un visitatore su una mostra.
 *
 * @typedef {object} Feedback
 * @property {number} id Identificativo del feedback.
 * @property {number} mostra_id Mostra recensita.
 * @property {string} nome Nome pubblico: nome e iniziale del cognome (es. `Mario R.`).
 * @property {number} voto Voto da 1 a 5.
 * @property {string} commento Commento (facoltativo, massimo 500 caratteri).
 * @property {string} creato_il Data e ora di pubblicazione (UTC).
 */

/**
 * Indicatori di una singola mostra nella dashboard.
 *
 * @typedef {object} StatisticheMostra
 * @property {number} mostra_id Identificativo della mostra.
 * @property {string} titolo Titolo della mostra.
 * @property {('in corso'|'futura'|'conclusa')} stato Stato rispetto alla data di oggi.
 * @property {number} prenotazioni Numero di prenotazioni.
 * @property {number} feedback Numero di feedback.
 * @property {?number} voto_medio Voto medio arrotondato a un decimale, `null` senza feedback.
 */

/**
 * Indicatori della dashboard amministratore (`GET /api/statistiche`).
 *
 * @typedef {object} Statistiche
 * @property {number} totale_mostre Numero di mostre.
 * @property {number} mostre_in_corso Mostre aperte oggi.
 * @property {number} mostre_future Mostre non ancora iniziate.
 * @property {number} mostre_concluse Mostre terminate.
 * @property {number} totale_prenotazioni Numero totale di prenotazioni.
 * @property {number} prenotazioni_ultimi_7_giorni Prenotazioni create negli ultimi 7 giorni.
 * @property {number} totale_feedback Numero totale di feedback.
 * @property {?number} voto_medio Voto medio generale, `null` senza feedback.
 * @property {StatisticheMostra[]} per_mostra Dettaglio per ogni mostra.
 */

/**
 * Dati del modulo Contatti (`POST /api/contatti`).
 *
 * @typedef {object} RichiestaContatto
 * @property {string} titolo Oggetto della domanda (da 3 a 120 caratteri).
 * @property {string} descrizione Testo della domanda (da 10 a 2000 caratteri).
 * @property {string} nome Nome.
 * @property {string} cognome Cognome.
 * @property {string} email Email a cui il museo risponderà.
 * @property {string} telefono Telefono (da 6 a 15 cifre).
 */

export {};
