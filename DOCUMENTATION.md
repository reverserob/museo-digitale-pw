# RELAZIONE TECNICA DI PROGETTO
## Project Work - MUSEO DIGITALE
## Tema n. 1: La digitalizzazione dell’impresa
### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale:
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti

### 1. Analisi dei Requisiti e Obiettivi
   Il presente Project Work ha come obiettivo la progettazione e lo sviluppo di una piattaforma informatica full-stack orientata alla digitalizzazione dei processi aziendali e culturali di un'impresa culturale (nella fattispecie, un museo civico).

Per soddisfare i requisiti di scalabilità, manutenibilità e separazione delle responsabilità, si è optato per un’architettura disaccoppiata (Client-Server):

Back-end: Sviluppato in Python mediante il framework FastAPI, ad alte prestazioni e basato su Type Hints nativi. Gestisce la logica di business, l'interazione con il database relazionale e i servizi di comunicazione asincrona.

Front-end: Sviluppato in React (con Vite come bundler) e la libreria di componenti grafici Material-UI (MUI). Offre un'interfaccia utente reattiva, fluida e accessibile, comunicando con il back-end esclusivamente tramite chiamate asincrone basate su API REST (axios).

Questa separazione garantisce che il client e il server possano evolvere indipendentemente, riducendo l'accoppiamento strutturale e migliorando la sicurezza complessiva del sistema.

### 2. Architettura del Database e Diagramma ER (Entità-Relazione)
   Il sistema si appoggia a un database relazionale SQLite, interfacciato tramite l'ORM SQLAlchemy per la gestione trasparente delle entità in oggetti Python.

Struttura delle Entità:
Tabella mostre: Memorizza le informazioni relative alle esposizioni culturali.

`id (Integer, Primary Key)
titolo (String)
descrizione (Text)
data_inizio (String, formato ISO AAAA-MM-GG)
data_fine (String, formato ISO AAAA-MM-GG)
immagini (String - percorsi relativi multipli separati da virgola, es. /static/uploads/<file>)`

Tabella prenotazioni: Memorizza le prenotazioni effettuate dai visitatori.

`id (Integer, Primary Key)
mostra_id (Integer, Foreign Key → mostre.id)
nome (String)
cognome (String)
email (String)
telefono (String)
creata_il (DateTime)`

Relazione: una mostra ha zero o più prenotazioni (1:N); ogni prenotazione appartiene a una sola mostra. Eliminando una mostra vengono eliminate anche le sue prenotazioni (cascade).

I dati di prenotazione inseriti dagli utenti vengono validati a livello di schema (Pydantic con espressioni regolari e validatori personalizzati) prima di essere salvati e di attivare l'invio dell'email di conferma.



### 3. Documentazione delle API (Swagger UI)
   FastAPI genera in modo automatico e nativo la documentazione interattiva delle API basata sullo standard OpenAPI. All'indirizzo [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) è possibile esplorare e testare gli endpoint in tempo reale (Swagger UI).

Principali rotte implementate (🔒 = richiede il token dell'area riservata):
1. POST /api/login: Verifica le credenziali dell'amministratore e restituisce un token di accesso firmato a tempo.
2. GET /api/mostre: Restituisce la lista completa di tutte le esposizioni museali presenti a catalogo.
3. GET /api/mostre/{mostra_id}: Recupera i dettagli di una singola mostra tramite il suo ID numerico (404 Not Found in caso di assenza).
4. 🔒 POST /api/mostre: Caricamento di una nuova mostra e delle relative immagini (multipart/form-data).
5. 🔒 PUT /api/mostre/{mostra_id}: Aggiornamento dei dati di un'esposizione esistente; le immagini sono facoltative.
6. 🔒 DELETE /api/mostre/{mostra_id}: Eliminazione fisica di un'esposizione e delle sue prenotazioni.
7. POST /api/prenota: Salva la prenotazione validata e avvia in background l'invio dell'email di conferma.
8. 🔒 GET /api/prenotazioni: Elenco delle prenotazioni, filtrabile per mostra (`?mostra_id=`).

Lo screenshot della Swagger UI è riportato nel README del progetto.

### 4. Scelte Tecnologiche e Sicurezza
####  4.1. Scelta di FastAPI e Performance
   FastAPI è stato preferito a framework tradizionali (come Django o Flask) per la sua estrema velocità, paragonabile a NodeJS e Go, grazie alla gestione asincrona nativa (async/await) e alla validazione automatica dei dati gestita da Pydantic.

#### 4.2. Gestione del CORS (Cross-Origin Resource Sharing)
Poiché il client React gira su un'origine diversa dal server FastAPI (porta 5173 contro 8000 in sviluppo, Vercel contro Render in produzione), è stato configurato un middleware CORS (CORSMiddleware). Le origini autorizzate non sono "aperte a tutti" ma elencate esplicitamente nella variabile d'ambiente CORS_ORIGINS.

#### 4.3. Invio Asincrono tramite BackgroundTasks
Per evitare che l'invio delle email di conferma (tramite protocollo SMTP con autenticazione TLS) blocchi il thread principale della risposta HTTP — evitando così fastidiosi timeout o blocchi imputabili ai firewall aziendali o di rete — l'applicazione sfrutta i BackgroundTasks di FastAPI. La risposta di successo viene restituita immediatamente al client React, mentre l'invio della mail viene eseguito in background in modo asincrono.

#### 4.4. Sicurezza e Variabili Sensibili
Le credenziali del server SMTP, quelle dell'amministratore e la chiave di firma dei token non sono scritte nel codice: vengono lette da variabili d'ambiente (modulo settings.py, file .env escluso dal versionamento in locale e pannello Environment su Render in produzione). Il file .env.example documenta le variabili necessarie senza contenere valori reali.

#### 4.5. Autenticazione dell'Area Riservata
Il controllo delle credenziali avviene sul server e non nel browser. L'endpoint POST /api/login confronta le credenziali con quelle configurate (con confronto a tempo costante) e restituisce un token che contiene la scadenza ed è firmato con HMAC-SHA256 tramite la SECRET_KEY. Il client invia il token nell'header Authorization: Bearer; le rotte di scrittura usano una dipendenza FastAPI (richiedi_admin) che rifiuta con 401 Unauthorized le richieste senza un token valido o scaduto.

#### 4.6. Gestione Sicura del Caricamento File
Le immagini caricate vengono accettate solo se hanno un'estensione e un tipo MIME da immagine (jpg, png, webp, gif) e non superano la dimensione massima configurata. Il nome del file su disco viene generato dal server (UUID), evitando sia la sovrascrittura di file esistenti sia attacchi di tipo path traversal. Nel database si salvano percorsi relativi: è il frontend ad anteporre l'indirizzo del backend, così l'applicazione funziona sia in locale sia in produzione. I dati inseriti dagli utenti vengono inoltre "escapati" prima di essere inseriti nel corpo HTML dell'email di conferma.

### 5. Implementazione del Front-end in React e Validazione End-to-End
####   5.1. Architettura dei Componenti e Single Page Application (SPA)
   Il front-end è stato sviluppato come una Single Page Application (SPA) modulare basata su React e React Router per la gestione delle rotte dinamiche (es. visualizzazione catalogo, dettaglio mostra, form di prenotazione e pannello amministrativo).

Per la progettazione dell'interfaccia grafica è stata adottata la libreria Material-UI (MUI), personalizzando i componenti tramite fogli di stile inline (sx prop) e un tema grafico coerente con l'identità visiva dell'istituzione culturale (palette cromatica basata su toni scuri e dettagli color oro).
L'interazione con le API REST del back-end avviene in modo asincrono mediante la libreria Axios, gestendo gli stati locali dei componenti (useState, useEffect) per garantire feedback visivi immediati all'utente (indicatori di caricamento tramite CircularProgress).

#### 5.2. Strategia di Validazione End-to-End (Client-Server)
Per garantire la massima integrità dei dati e prevenire l'invio di informazioni errate o malevole, il sistema adotta una strategia di validazione a doppio livello:

Validazione lato Client (Real-time Feedback):

Nel form di prenotazione e gestione, i campi di input sono associati a espressioni regolari (RegEx) e controlli di lunghezza logici in tempo reale.
Nome e Cognome: Richiedono una lunghezza minima di 3 caratteri (.length >= 3) per evitare stringhe vuote o frammentarie.
Telefono: Viene filtrato tramite RegEx (/^\d{6,15}$/) per accettare esclusivamente da 6 a 15 cifre numeriche.
Date della mostra: la data di fine non può precedere quella di inizio.
Email: Viene verificata attraverso un pattern formale di validazione sintattica.
Il pulsante di invio della form (PRENOTA / PUBBLICA MOSTRA) rimane disattivato (disabled) fino a quando tutte le condizioni di validità non risultano pienamente soddisfatte, guidando l'utente verso la corretta compilazione.
Validazione lato Server (Pydantic & FastAPI):


Indipendentemente dai controlli effettuati nel browser, il payload ricevuto viene intercettato da schemi di validazione Pydantic (BaseModel e @field_validator).
L'utilizzo del tipo nativo EmailStr e di validatori custom garantisce che nessun dato anomalo o non conforme possa violare i vincoli del database SQLite. In caso di errore di validazione il server risponde con 422 Unprocessable Entity e un messaggio leggibile (un gestore personalizzato di RequestValidationError lo rende mostrabile direttamente all'utente); gli errori di logica applicativa, come date incoerenti o file non validi, restituiscono 400 Bad Request.

#### 5.3. Gestione Globale degli Errori (Error Handling) nel Client
Al fine di evitare schermate bloccate o silenziose in caso di problemi di rete o disservizi del server:

Le chiamate asincrone sono protette da blocchi try-catch (o .catch() di Axios) che intercettano i codici di errore HTTP restituiti dal back-end (401, 404, 422, 500).
È stato implementato un sistema di notifica basato sul componente Alert di Material-UI: in caso di errori di connessione o fallimenti nelle operazioni di scrittura, un messaggio descrittivo compare in modo dinamico all'utente, migliorando sensibilmente la resilienza e l'usabilità complessiva dell'applicazione.



