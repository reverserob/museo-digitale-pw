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
data_inizio (String / Date)
data_fine (String / Date)
immagini (String - URL o percorsi multipli separati da virgola)`

Tabella / Logica di Prenotazione (prenotazioni o validazione tramite schema Pydantic):

I dati di prenotazione inseriti dagli utenti (nome, cognome, email, telefono, mostra_id) vengono validati rigorosamente a livello di schema (Pydantic con espressioni regolari e validatori personalizzati) prima di attivare i flussi di notifica ed eventuale persistenza.



### 3. Documentazione delle API (Swagger UI)
   FastAPI genera in modo automatico e nativo la documentazione interattiva delle API basata sullo standard OpenAPI. All'indirizzo [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) è possibile esplorare e testare gli endpoint in tempo reale (Swagger UI).

Principali rotte implementate:
1. GET /api/mostre: Restituisce la lista completa di tutte le esposizioni museali presenti a catalogo.
2. GET /api/mostre/{mostra_id}: Recupera i dettagli di una singola mostra tramite il suo ID numerico (con gestione dell'eccezione 404 Not Found in caso di assenza).
3. POST /api/mostre: Endpoint protetto per il caricamento di una nuova mostra e dei relativi file multimediali (multipart/form-data).
4. PUT /api/mostre/{mostra_id}: Aggiornamento dei dati descrittivi o visivi di un'esposizione esistente.
5. DELETE /api/mostre/{mostra_id}: Eliminazione logica/fisica di un'esposizione dal catalogo.
6. POST /api/prenota: Gestisce la ricezione dei dati di prenotazione validati, attivando contestualmente l'invio automatizzato dell'email di conferma.

(Suggerimento: Inserisci qui lo screenshot della schermata Swagger UI presa dal browser).

### 4. Scelte Tecnologiche e Sicurezza
####  4.1. Scelta di FastAPI e Performance
   FastAPI è stato preferito a framework tradizionali (come Django o Flask) per la sua estrema velocità, paragonabile a NodeJS e Go, grazie alla gestione asincrona nativa (async/await) e alla validazione automatica dei dati gestita da Pydantic.

#### 4.2. Gestione del CORS (Cross-Origin Resource Sharing)
Poiché il client React gira sulla porta di sviluppo 5173 e il server FastAPI risiede sulla porta 8000, è stato configurato un middleware CORS dedicato (CORSMiddleware) per autorizzare in sicurezza il flusso di richieste asincrone tra origini differenti.

#### 4.3. Invio Asincrono tramite BackgroundTasks
Per evitare che l'invio delle email di conferma (tramite protocollo SMTP con autenticazione TLS) blocchi il thread principale della risposta HTTP — evitando così fastidiosi timeout o blocchi imputabili ai firewall aziendali o di rete — l'applicazione sfrutta i BackgroundTasks di FastAPI. La risposta di successo viene restituita immediatamente al client React, mentre l'invio della mail viene eseguito in background in modo asincrono.

#### 4.4. Sicurezza e Variabili Sensibili
Le credenziali di accesso al server SMTP di posta e le configurazioni di sicurezza sono state isolate e strutturate per evitare l'hardcoding diretto nei moduli esposti, garantendo la conformità alle buone norme di protezione dei dati applicativi.

### 5. Implementazione del Front-end in React e Validazione End-to-End
####   5.1. Architettura dei Componenti e Single Page Application (SPA)
   Il front-end è stato sviluppato come una Single Page Application (SPA) modulare basata su React e React Router per la gestione delle rotte dinamiche (es. visualizzazione catalogo, dettaglio mostra, form di prenotazione e pannello amministrativo).

Per la progettazione dell'interfaccia grafica è stata adottata la libreria Material-UI (MUI), personalizzando i componenti tramite fogli di stile inline (sx prop) e un tema grafico coerente con l'identità visiva dell'istituzione culturale (palette cromatica basata su toni scuri e dettagli color oro).
L'interazione con le API REST del back-end avviene in modo asincrono mediante la libreria Axios, gestendo gli stati locali dei componenti (useState, useEffect) per garantire feedback visivi immediati all'utente (indicatori di caricamento tramite CircularProgress).

#### 5.2. Strategia di Validazione End-to-End (Client-Server)
Per garantire la massima integrità dei dati e prevenre l'invio di informazioni errate o malevole, il sistema adotta una strategia di validazione a doppio livello:

Validazione lato Client (Real-time Feedback):

Nel form di prenotazione e gestione, i campi di input sono associati a espressioni regolari (RegEx) e controlli di lunghezza logici in tempo reale.
Nome e Cognome: Richiedono una lunghezza minima di 3 caratteri (.length >= 3) per evitare stringhe vuote o frammentarie.
Telefono: Viene filtrato tramite RegEx (/^\d+$/) per accettare esclusivamente cifre numeriche.
Email: Viene verificata attraverso un pattern formale di validazione sintattica.
Il pulsante di invio della form (PRENOTA / PUBBLICA MOSTRA) rimane disattivato (disabled) fino a quando tutte le condizioni di validità non risultano pienamente soddisfatte, guidando l'utente verso la corretta compilazione.
Validazione lato Server (Pydantic & FastAPI):


Indipendentemente dai controlli effettuati nel browser, il payload ricevuto viene intercettato da schemi di validazione Pydantic (BaseModel e @field_validator).
L'utilizzo del tipo nativo EmailStr e di validatori custom garantisce che nessun dato anomalo o non conforme possa violare i vincoli del database SQLite, restituendo in caso di errore un codice HTTP chiaro (400 Bad Request).

#### 5.3. Gestione Globale degli Errori (Error Handling) nel Client
Al fine di evitare schermate bloccate o silenziose in caso di problemi di rete o disservizi del server:

Le chiamate asincrone sono protette da blocchi try-catch (o .catch() di Axios) che intercettano i codici di errore HTTP restituiti dal back-end (404, 500).
È stato implementato un componente visivo di notifica basato su Snackbar e Alert di Material-UI: in caso di errori di connessione o fallimenti nelle operazioni di scrittura, un messaggio descrittivo compare in modo dinamico all'utente, migliorando sensibilmente la resilienza e l'usabilità complessiva dell'applicazione.



