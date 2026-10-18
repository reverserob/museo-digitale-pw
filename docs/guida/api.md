# API REST

FastAPI genera in automatico la documentazione interattiva delle API secondo lo standard **OpenAPI**:
con il backend avviato è disponibile su `/docs` (Swagger UI) e `/redoc`, ad esempio
[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). Il codice di ogni endpoint è descritto nella
[reference dei router](../backend/router.md).
Una copia della Swagger UI è pubblicata anche in questo sito: [Swagger UI](swagger.md).

## Elenco degli endpoint

| Router | Metodo e percorso | Descrizione | Risposte principali |
|---|---|---|---|
| Area riservata | POST /api/login | Verifica le credenziali dell'amministratore e restituisce un token di accesso firmato a tempo. | 200, 401, 429 |
| Visitatori | POST /api/utenti/registrazione | Crea l'account del visitatore (password salvata come hash), invia l'email di conferma e restituisce subito il token e il profilo. Con un'email già registrata risponde 409 "Utente già registrato" e avvisa per email il titolare dell'account. | 201, 409, 422, 429 |
| Visitatori | POST /api/utenti/login | Verifica email e password del visitatore e restituisce token e profilo. | 200, 401, 429 |
| Visitatori | POST /api/utenti/password-dimenticata | Se l'email è registrata invia un link per reimpostare la password (valido 30 minuti, usabile una volta). La risposta è sempre la stessa, così non si rivela quali email sono registrate. | 200, 429 |
| Visitatori | POST /api/utenti/reimposta-password | Riceve il token del link e la nuova password (stessa regola della registrazione) e aggiorna l'hash. | 200, 400, 422, 429 |
| Visitatori | 👤 GET /api/utenti/me | Profilo del visitatore collegato. | 200, 401, 403 |
| Visitatori | 👤 GET /api/utenti/me/prenotazioni | Prenotazioni del visitatore collegato, con titolo e periodo della mostra. | 200, 401, 403 |
| Contatti | 👤 POST /api/contatti | Riceve titolo, descrizione, nome, cognome, email e telefono del visitatore registrato e li invia per email alla casella del museo (con l'email del visitatore come indirizzo di risposta). Senza servizio email configurato (sviluppo locale) la richiesta viene scritta nel log. | 200, 401, 403, 422, 429, 503 |
| Visitatori | 👤 DELETE /api/utenti/me/prenotazioni/{prenotazione_id} | Annulla una prenotazione del visitatore collegato e invia in background l'email di conferma dell'annullamento. La prenotazione di un altro visitatore risulta "non trovata"; una prenotazione già usata per l'ingresso non si può annullare (409). | 200, 401, 403, 404, 409 |
| Visitatori | 👤 GET /api/utenti/me/feedback | Feedback già lasciati dal visitatore collegato (il frontend nasconde il form sulle mostre già recensite). | 200, 401, 403 |
| Area riservata | 🔒 GET /api/statistiche | Indicatori per la dashboard: conteggi di mostre, prenotazioni e feedback, voto medio, dettaglio per mostra. | 200, 401 |
| Mostre | GET /api/mostre | Restituisce la lista di tutte le esposizioni, ordinate per data di inizio. | 200 |
| Mostre | GET /api/mostre/{mostra_id} | Recupera i dettagli di una singola mostra. | 200, 404 |
| Mostre | 🔒 POST /api/mostre | Caricamento di una nuova mostra e delle relative immagini (multipart/form-data). | 201, 400, 401, 422 |
| Mostre | 🔒 PUT /api/mostre/{mostra_id} | Aggiornamento di un'esposizione esistente. Il campo `immagini_esistenti` (lista JSON) indica quali immagini attuali tenere; le nuove immagini caricate si aggiungono in coda. Deve restare almeno un'immagine. | 200, 400, 401, 404 |
| Mostre | 🔒 DELETE /api/mostre/{mostra_id} | Eliminazione di un'esposizione, delle sue prenotazioni e dei suoi feedback. | 200, 401, 404 |
| Prenotazioni | 👤 POST /api/prenota | Salva la prenotazione con i dati dell'account e un codice di riferimento, restituito nella risposta, e avvia in background l'invio dell'email di conferma con codice e QR code. Una sola prenotazione per visitatore su ogni mostra. | 201, 400, 401, 403, 404, 409, 422 |
| Prenotazioni | 🔒 GET /api/prenotazioni | Elenco delle prenotazioni (con codice e ingresso), filtrabile per mostra (`?mostra_id=`). | 200, 401 |
| Prenotazioni | GET /api/prenotazioni/qr/{codice} | Immagine PNG del QR code di una prenotazione, usata nell'email e nell'area personale. Contiene solo l'indirizzo della pagina di verifica. | 200, 404 |
| Prenotazioni | 🔒 GET /api/prenotazioni/verifica/{riferimento} | Verifica all'ingresso: dati della prenotazione e della mostra e stato (`valida`, `gia_entrato`, `non_iniziata`, `conclusa`). Il riferimento è il codice (anche in minuscolo o senza trattini) o il numero della prenotazione. | 200, 401, 404 |
| Prenotazioni | 🔒 POST /api/prenotazioni/verifica/{riferimento}/ingresso | Registra l'ingresso del visitatore: una sola volta e solo mentre la mostra è aperta. | 200, 400, 401, 404, 409 |
| Feedback | 👤 POST /api/feedback | Salva il feedback del visitatore su una mostra già iniziata (uno per mostra). | 201, 400, 401, 403, 404, 409, 422 |
| Feedback | GET /api/feedback | Elenco pubblico dei feedback, filtrabile per mostra (`?mostra_id=`), dal più recente. | 200 |
| Feedback | 🔒 DELETE /api/feedback/{feedback_id} | Eliminazione di un feedback (moderazione). | 200, 401, 404 |

## Codici di stato
| Codice | Significato nel progetto |
|---|---|
| 200 OK / 201 Created | Operazione riuscita / risorsa creata |
| 400 Bad Request | Errore di logica: date incoerenti, mostra conclusa o non iniziata, file non valido o troppo grande, mostra senza immagini |
| 401 Unauthorized | Credenziali errate, token assente, manomesso, scaduto o del ruolo sbagliato per l'area riservata |
| 403 Forbidden | Token valido ma del ruolo sbagliato (l'amministratore che prova a prenotare), oppure feedback di un visitatore non prenotato alla mostra |
| 404 Not Found | Mostra, feedback o prenotazione inesistente |
| 409 Conflict | Email già registrata, seconda prenotazione o secondo feedback dello stesso visitatore sulla stessa mostra, ingresso già registrato, annullamento di una prenotazione già usata |
| 422 Unprocessable Entity | Dati che non rispettano lo schema (con messaggio leggibile) |
| 429 Too Many Requests | Troppi tentativi di login, registrazione, reset password o invio contatti dallo stesso indirizzo IP |
| 500 Internal Server Error | Errore imprevisto nel salvataggio (la transazione viene annullata con rollback) |
| 503 Service Unavailable | Il servizio email non è riuscito a inviare la richiesta del modulo Contatti |
