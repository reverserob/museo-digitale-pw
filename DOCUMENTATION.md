# RELAZIONE TECNICA DI PROGETTO
## Project Work - MUSEO DIGITALE
## Tema n. 1: La digitalizzazione dell’impresa
### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale:
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti

### 1. Analisi dei Requisiti e Obiettivi
Il presente Project Work ha come obiettivo la progettazione e lo sviluppo di una piattaforma informatica full-stack orientata alla digitalizzazione dei processi aziendali e culturali di un'impresa culturale (nella fattispecie, un museo civico).

La piattaforma copre tre esigenze principali:
- **Visitatori**: consultare il catalogo delle mostre, vederne il dettaglio con la galleria di immagini e prenotare una visita, ricevendo un'email di conferma.
- **Amministrazione**: accedere a un'area riservata per pubblicare, modificare ed eliminare le mostre e consultare le prenotazioni ricevute.
- **Gestione dei dati**: conservare in modo strutturato mostre e prenotazioni in un database relazionale.

Per soddisfare i requisiti di scalabilità, manutenibilità e separazione delle responsabilità, si è optato per un’architettura disaccoppiata (Client-Server):

Back-end: Sviluppato in Python mediante il framework FastAPI, ad alte prestazioni e basato su Type Hints nativi. Gestisce la logica di business, l'interazione con il database relazionale e i servizi di comunicazione asincrona.

Front-end: Sviluppato in React (con Vite come bundler) e la libreria di componenti grafici Material-UI (MUI). Offre un'interfaccia utente reattiva, fluida e accessibile, comunicando con il back-end esclusivamente tramite chiamate asincrone basate su API REST (axios).

Questa separazione garantisce che il client e il server possano evolvere indipendentemente, riducendo l'accoppiamento strutturale e migliorando la sicurezza complessiva del sistema.

#### 1.1. Struttura del Back-end e Separazione delle Responsabilità
Anche all'interno del back-end è stato applicato il principio della separazione delle responsabilità (Separation of Concerns): ogni modulo ha un compito preciso e il file principale si limita a configurare l'applicazione e a unire i moduli. Le rotte sono organizzate con gli `APIRouter` di FastAPI, mentre la logica riutilizzabile è raccolta nella cartella `services/`.

```
backend/
├── main.py                 → crea l'app, configura CORS, file statici e gestore errori, include i router
├── settings.py             → configurazione letta dalle variabili d'ambiente (.env / .env.local)
├── database.py             → connessione SQLAlchemy e dipendenza get_db()
├── models.py               → modelli ORM (Mostra, Prenotazione)
├── schemas.py              → schemi Pydantic per la validazione di input e output
├── auth.py                 → login dell'area riservata e verifica dei token
├── routers/
│   ├── login.py            → POST /api/login
│   ├── mostre.py           → CRUD delle mostre (/api/mostre)
│   └── prenotazioni.py     → POST /api/prenota, GET /api/prenotazioni
├── services/
│   ├── mostre_service.py   → ricerca di una mostra e controllo delle date (usato da più router)
│   ├── email_service.py    → invio dell'email di conferma (SMTP)
│   ├── immagini_service.py → validazione e salvataggio delle immagini caricate
│   ├── rate_limit_service.py → limite ai tentativi di login (slowapi)
│   ├── error_service.py    → formattazione degli errori di validazione (422)
│   └── seed_service.py     → inserimento delle mostre iniziali lette da data/mostre.json
├── data/mostre.json        → dati delle mostre iniziali
├── static/uploads/         → immagini delle mostre
└── tests/                  → test automatici (pytest)
```

I vantaggi di questa organizzazione sono:
- **Leggibilità**: chi cerca le rotte delle mostre apre `routers/mostre.py`, chi deve modificare il testo dell'email apre `services/email_service.py`.
- **Riutilizzo**: i servizi sono funzioni indipendenti dalle rotte; ad esempio `trova_mostra` (in `services/mostre_service.py`) è usata sia dal router delle mostre sia da quello delle prenotazioni, senza che un router dipenda dall'altro.
- **Manutenibilità**: aggiungere una nuova area funzionale significa creare un nuovo router e registrarlo in `main.py` con `app.include_router(...)`, senza toccare il codice esistente.
- **Documentazione**: ogni router ha un proprio tag, quindi nella Swagger UI le rotte compaiono raggruppate in *Area riservata*, *Mostre* e *Prenotazioni*.

### 2. Architettura del Database e Diagramma ER (Entità-Relazione)
Il sistema si appoggia a un database relazionale SQLite, interfacciato tramite l'ORM SQLAlchemy per la gestione trasparente delle entità in oggetti Python. Le tabelle vengono create automaticamente all'avvio e, se il database è vuoto, vengono inserite le mostre dimostrative descritte nel file `data/mostre.json` (seeding): per aggiungere o modificare le mostre iniziali basta modificare il file JSON, senza toccare il codice.

Struttura delle Entità:
Tabella mostre: Memorizza le informazioni relative alle esposizioni culturali.

`id (Integer, Primary Key)
titolo (String)
descrizione (Text)
data_inizio (Date)
data_fine (Date)
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

I dati di prenotazione inseriti dagli utenti vengono validati a livello di schema (Pydantic con espressioni regolari e validatori personalizzati) prima di essere salvati e di attivare l'invio dell'email di conferma. Non è possibile prenotare una mostra già conclusa.

### 3. Documentazione delle API (Swagger UI)
FastAPI genera in modo automatico e nativo la documentazione interattiva delle API basata sullo standard OpenAPI. All'indirizzo [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) è possibile esplorare e testare gli endpoint in tempo reale (Swagger UI), raggruppati per router.

Principali rotte implementate ( = richiede il token dell'area riservata):

| Router | Metodo e percorso | Descrizione |
|---|---|---|
| Area riservata | POST /api/login | Verifica le credenziali dell'amministratore e restituisce un token di accesso firmato a tempo. |
| Mostre | GET /api/mostre | Restituisce la lista di tutte le esposizioni, ordinate per data di inizio. |
| Mostre | GET /api/mostre/{mostra_id} | Recupera i dettagli di una singola mostra (404 Not Found in caso di assenza). |
| Mostre |  POST /api/mostre | Caricamento di una nuova mostra e delle relative immagini (multipart/form-data). |
| Mostre |  PUT /api/mostre/{mostra_id} | Aggiornamento di un'esposizione esistente; le immagini sono facoltative. |
| Mostre |  DELETE /api/mostre/{mostra_id} | Eliminazione di un'esposizione e delle sue prenotazioni. |
| Prenotazioni | POST /api/prenota | Salva la prenotazione validata e avvia in background l'invio dell'email di conferma. |
| Prenotazioni | GET /api/prenotazioni | Elenco delle prenotazioni, filtrabile per mostra (`?mostra_id=`). |

Lo screenshot della Swagger UI è riportato nel README del progetto.

### 4. Scelte Tecnologiche e Sicurezza
####  4.1. Scelta di FastAPI e Performance
FastAPI è stato preferito a framework tradizionali (come Django o Flask) per la sua estrema velocità, paragonabile a NodeJS e Go, grazie alla gestione asincrona nativa (async/await) e alla validazione automatica dei dati gestita da Pydantic. Il sistema di dipendenze (`Depends`) permette inoltre di riutilizzare in modo pulito la sessione del database (`get_db`) e il controllo di autenticazione (`richiedi_admin`) in tutte le rotte.

#### 4.2. Gestione del CORS (Cross-Origin Resource Sharing)
Poiché il client React gira su un'origine diversa dal server FastAPI (porta 5173 contro 8000 in sviluppo, Vercel contro Render in produzione), è stato configurato un middleware CORS (CORSMiddleware). Le origini autorizzate non sono "aperte a tutti" ma elencate esplicitamente nella variabile d'ambiente CORS_ORIGINS.

#### 4.3. Invio Asincrono tramite BackgroundTasks
Per evitare che l'invio delle email di conferma (tramite protocollo SMTP con autenticazione TLS) blocchi la risposta HTTP — evitando così timeout o blocchi imputabili ai firewall aziendali o di rete — l'applicazione sfrutta i BackgroundTasks di FastAPI. La funzione `invia_email_background`, contenuta in `services/email_service.py`, viene registrata dal router delle prenotazioni con `background_tasks.add_task(...)`: la risposta di successo viene restituita immediatamente al client React e l'email viene inviata subito dopo. Se le credenziali SMTP non sono configurate, la prenotazione viene comunque salvata e l'evento viene registrato nei log.

#### 4.4. Sicurezza e Variabili Sensibili
Le credenziali del server SMTP, quelle dell'amministratore e la chiave di firma dei token non sono scritte nel codice: vengono lette da variabili d'ambiente tramite il modulo `settings.py`. In locale i valori si trovano nei file `.env` o `.env.local`, esclusi dal versionamento tramite `.gitignore`; in produzione si impostano dal pannello Environment di Render. Il file `.env.example` documenta le variabili necessarie senza contenere valori reali.

Una variabile assente o lasciata vuota assume un valore di default pensato solo per lo sviluppo locale; all'avvio il server segnala nei log se sono in uso la chiave o la password dimostrative, in modo che vengano sostituite prima della messa online.

#### 4.5. Autenticazione dell'Area Riservata
Il controllo delle credenziali avviene sul server e non nel browser. L'endpoint POST /api/login confronta le credenziali con quelle configurate (con confronto a tempo costante, per evitare attacchi basati sui tempi di risposta) e restituisce un token che contiene la scadenza ed è firmato con HMAC-SHA256 tramite la SECRET_KEY. Il token non è cifrato ma firmato: il server può leggerne il contenuto e verificare che non sia stato alterato. Il client invia il token nell'header `Authorization: Bearer`; le rotte di scrittura usano la dipendenza FastAPI `richiedi_admin` (modulo `auth.py`), che rifiuta con 401 Unauthorized le richieste senza un token valido o scaduto.

#### 4.6. Gestione Sicura del Caricamento File
Il caricamento delle immagini è gestito da `services/immagini_service.py`. Le immagini vengono accettate solo se hanno un'estensione e un tipo MIME da immagine (jpg, png, webp, gif) e non superano la dimensione massima configurata. Il nome del file su disco viene generato dal server (UUID), evitando sia la sovrascrittura di file esistenti sia attacchi di tipo path traversal. Nel database si salvano percorsi relativi: è il frontend ad anteporre l'indirizzo del backend, così l'applicazione funziona sia in locale sia in produzione. I dati inseriti dagli utenti vengono inoltre "escapati" prima di essere inseriti nel corpo HTML dell'email di conferma.

#### 4.7. Limite ai Tentativi di Accesso
Per impedire attacchi "a forza bruta" (provare molte password in sequenza), l'endpoint di login è protetto dalla libreria `slowapi`: ogni indirizzo IP può effettuare un numero limitato di tentativi (di default 5 al minuto, configurabile con la variabile `LOGIN_RATE_LIMIT`). Superato il limite il server risponde 429 Too Many Requests con un messaggio leggibile, che il frontend mostra nel form di accesso. Poiché in produzione il backend si trova dietro il proxy di Render, uvicorn viene avviato con l'opzione `--proxy-headers`, così da leggere l'indirizzo IP reale del visitatore.

### 5. Implementazione del Front-end in React e Validazione End-to-End
####   5.1. Architettura dei Componenti e Single Page Application (SPA)
Il front-end è stato sviluppato come una Single Page Application (SPA) modulare basata su React e React Router. Il codice è organizzato per responsabilità:

```
frontend/src/
├── App.jsx        → tema, router e rotte
├── config/        → routes.json (elenco delle rotte) e background.json (immagine di sfondo)
├── pages/         → una pagina per rotta: Home, GalleriaMostra, FormPrenotazione, AdminDashboard, AdminForm, NotFound
├── components/    → componenti riutilizzabili: AppHeader, ProtectedRoute
├── services/      → api.js (istanza Axios) e un servizio per area: mostreService, prenotazioniService, authService
├── styles/        → fogli di stile del layout
└── tests/         → test automatici (Vitest)
```

Le rotte non sono scritte nel codice ma lette da `config/routes.json`: ogni rotta indica il percorso e il nome della pagina da mostrare. Le rotte riservate all'amministratore sono contrassegnate con `"protected": true` e vengono racchiuse nel componente `ProtectedRoute`, che rimanda alla pagina di accesso chi non ha effettuato il login. Un indirizzo inesistente mostra la pagina `NotFound` (errore 404), collegata alla rotta jolly `*`.

Per alleggerire il primo caricamento, le pagine diverse dalla Home vengono caricate solo quando servono (`React.lazy` e `Suspense`): il browser scarica il codice dell'area riservata solo se l'utente la apre.

Per la progettazione dell'interfaccia grafica è stata adottata la libreria Material-UI (MUI), personalizzando i componenti tramite la prop `sx` e un tema grafico coerente con l'identità visiva dell'istituzione culturale (palette cromatica basata su toni scuri e dettagli color oro). Il layout utilizza il componente `Grid` con dimensioni responsive, così da adattarsi anche ai dispositivi mobili.

Le pagine non contengono gli indirizzi delle API: usano le funzioni dei servizi (ad esempio `getMostre()`, `prenota(dati)`, `login(email, password)`), così ogni indirizzo è definito in un solo punto, in modo analogo ai servizi del backend. I servizi si appoggiano a un client Axios centralizzato (`services/api.js`), che:
- determina l'indirizzo del backend (variabile `VITE_API_URL`, oppure backend locale in sviluppo e Render in produzione);
- aggiunge automaticamente il token dell'amministratore a ogni richiesta e, se il token è scaduto, riporta l'utente alla pagina di login;
- costruisce l'indirizzo completo delle immagini a partire dai percorsi relativi salvati nel database.

Gli stati locali dei componenti (useState, useEffect) garantiscono feedback visivi immediati all'utente, ad esempio gli indicatori di caricamento tramite CircularProgress.

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
L'utilizzo del tipo nativo EmailStr e di validatori custom garantisce che nessun dato anomalo o non conforme possa violare i vincoli del database SQLite. In caso di errore di validazione il server risponde con 422 Unprocessable Entity e un messaggio leggibile: il gestore `errore_validazione` (`services/error_service.py`), registrato in `main.py` con `app.add_exception_handler`, trasforma l'elenco di errori di Pydantic in un testo mostrabile direttamente all'utente. Gli errori di logica applicativa, come date incoerenti o file non validi, restituiscono 400 Bad Request.

#### 5.3. Gestione Globale degli Errori (Error Handling) nel Client
Al fine di evitare schermate bloccate o silenziose in caso di problemi di rete o disservizi del server:

Le chiamate asincrone sono protette dal metodo .catch() di Axios, che intercetta i codici di errore HTTP restituiti dal back-end (401, 404, 422, 500).
È stato implementato un sistema di notifica basato sul componente Alert di Material-UI: in caso di errori di connessione o fallimenti nelle operazioni di scrittura, un messaggio descrittivo compare in modo dinamico all'utente, migliorando sensibilmente la resilienza e l'usabilità complessiva dell'applicazione.

### 6. Qualità del Codice e Test Automatici
Per mantenere il codice uniforme e individuare gli errori prima della pubblicazione sono stati adottati strumenti di controllo automatico:

| | Back-end | Front-end |
|---|---|---|
| Controllo del codice (linter) | Ruff | ESLint |
| Formattazione | Ruff format | Prettier |
| Test automatici | pytest + TestClient di FastAPI | Vitest + React Testing Library |

**Test del back-end** (cartella `backend/tests/`): verificano le API in modo completo — login corretto ed errato, rifiuto di token assenti, falsi, manomessi o scaduti, limite ai tentativi di accesso, creazione, modifica ed eliminazione delle mostre, controllo degli upload (tipo, dimensione, nomi di file malevoli), prenotazioni valide e non valide, mostre concluse, invio dell'email di conferma. I test usano un database temporaneo e sostituiscono l'invio delle email con una funzione simulata, quindi non modificano i dati reali.

**Test del front-end** (cartella `frontend/src/tests/`): montano le pagine in un browser simulato (jsdom) e sostituiscono le risposte del backend con dati finti. Verificano la visualizzazione delle mostre, la validazione dei form, l'invio delle prenotazioni, login e logout dell'area riservata, la protezione delle rotte, la pagina 404 e il caricamento delle pagine "lazy".

**Integrazione continua (GitHub Actions)**: il file `.github/workflows/ci.yml` esegue automaticamente, a ogni push e pull request, linter, controllo della formattazione e test di entrambe le parti, oltre alla build di produzione del front-end. Il back-end viene verificato con due versioni di Python. Se un controllo fallisce, GitHub lo segnala accanto al commit, impedendo che un errore passi inosservato.

### 7. Deploy
L'applicazione è pubblicata con due servizi separati, coerentemente con l'architettura disaccoppiata:
- **Front-end** su Vercel: [museo-digitale-pw-azure.vercel.app](https://museo-digitale-pw-azure.vercel.app/)
- **Back-end** su Render: `museo-digitale-pw.onrender.com`

Su Render le variabili d'ambiente (SECRET_KEY, credenziali dell'amministratore, credenziali SMTP, CORS_ORIGINS) sono impostate dal pannello Environment del servizio. Il backend viene avviato con il comando `uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'`, che permette al server di conoscere l'indirizzo IP reale dei visitatori (necessario per il limite ai tentativi di login). Le versioni delle librerie Python sono fissate in `requirements.txt`, così il server installa sempre le stesse versioni verificate in locale.

Limiti noti della soluzione attuale, accettabili per un prototipo:
- Sul piano gratuito di Render il disco non è persistente: a ogni riavvio il database SQLite e le immagini caricate dall'area riservata vengono azzerati. Le mostre iniziali vengono ricreate automaticamente dal seeding, insieme alle loro immagini incluse nel repository. In un contesto reale si utilizzerebbero un database gestito (es. PostgreSQL, già supportato tramite la variabile DATABASE_URL) e uno storage esterno per i file.
- L'area riservata prevede un solo amministratore configurato tramite variabili d'ambiente; un'evoluzione naturale sarebbe una tabella utenti con password cifrate e ruoli.

