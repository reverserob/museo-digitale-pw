# Project Work - Museo Civico Digitale

[![CI](https://github.com/reverserob/museo-digitale-pw/actions/workflows/ci.yml/badge.svg)](https://github.com/reverserob/museo-digitale-pw/actions/workflows/ci.yml)
[![Documentazione](https://github.com/reverserob/museo-digitale-pw/actions/workflows/docs.yml/badge.svg)](https://reverserob.github.io/museo-digitale-pw/)

## Tema n. 1: La digitalizzazione dell’impresa

### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti.

Piattaforma web per un museo civico: catalogo delle mostre, account dei visitatori, prenotazione della visita
con email di conferma, **codice di prenotazione e QR code** per la verifica all'ingresso, feedback e un'area
riservata con dashboard per il personale.

**Relazione tecnica completa** (contesto, processo AS-IS/TO-BE, architettura, diagrammi UML ed ER, API, test
funzionali, sviluppi futuri): [DOCUMENTATION.md](DOCUMENTATION.md)

### Prototipo online
Vai a: [Museo Civico Digitale](https://museo-digitale-pw-azure.vercel.app/)

## Indice
- [Documentazione](#documentazione)
- [Funzionalità](#funzionalità)
- [Stack tecnologico](#stack-tecnologico)
- [Struttura del progetto](#struttura-del-progetto)
- [Avvio in locale](#avvio-in-locale)
- [Variabili d'ambiente](#variabili-dambiente)
- [Email (Brevo) e risoluzione dei problemi](#email-brevo-e-risoluzione-dei-problemi)
- [API REST e Swagger](#api-rest-e-swagger)
- [Test e controlli di qualità](#test-e-controlli-di-qualità)
- [Documentazione tecnica](#documentazione-tecnica)
- [Integrazione continua](#integrazione-continua-github-actions)
- [Deploy](#deploy)
- [Credenziali dell'area riservata](#credenziali-dellarea-riservata-solo-demo-in-locale)

## Documentazione
| Dettaglio | Link |
|---|---|
| Relazione tecnica | [DOCUMENTATION.md](DOCUMENTATION.md) |
| Sito di documentazione (guida, architettura, reference del backend) | [reverserob.github.io/museo-digitale-pw](https://reverserob.github.io/museo-digitale-pw/) |
| Documentazione del frontend (JSDoc) | [reverserob.github.io/museo-digitale-pw/frontend-api](https://reverserob.github.io/museo-digitale-pw/frontend-api/) |
| Swagger UI online (sola lettura) | [reverserob.github.io/museo-digitale-pw/guida/swagger](https://reverserob.github.io/museo-digitale-pw/guida/swagger/) |
| Swagger UI del backend (per provare le API) | [museo-digitale-pw.onrender.com/docs](https://museo-digitale-pw.onrender.com/docs) |
| Sito del museo | [museo-digitale-pw-azure.vercel.app](https://museo-digitale-pw-azure.vercel.app/) |

## Funzionalità

### Visitatori
- **Catalogo delle mostre** con dettaglio, periodo e galleria di immagini (pubblico, senza account).
- **Account**: registrazione con controllo dei dati mentre si scrive ed email di benvenuto; ogni email si registra
  una sola volta. Recupero password con link valido 30 minuti e utilizzabile una sola volta.
- **Prenotazione** della visita (una per visitatore su ogni mostra) con email di conferma che contiene:
  - un **codice di riferimento** nel formato `MCD-XXXX-XXXX` (es. `MCD-68ZY-MT8U`);
  - un **QR code**, sempre in allegato PNG e, con il backend online, anche come immagine nel testo dell'email.
- **Area personale**: elenco delle prenotazioni con il codice, pulsante **Mostra QR code** da presentare
  all'ingresso, annullamento con email di conferma (non possibile se l'ingresso è già stato registrato).
  Da qui il visitatore **modifica i propri dati** (nome, cognome, telefono) ed **elimina l'account** confermando la
  password: le prenotazioni non usate vengono annullate, quelle già usate restano in forma anonima.
- **Feedback**: un voto da 1 a 5 con commento facoltativo per ogni mostra già iniziata a cui si è prenotati.
- **Contatti**: modulo (per utenti registrati) che invia la domanda per email alla casella del museo.
- **Lingua**: interfaccia in italiano o in inglese.

### Amministratore (Area Riservata)
- **Dashboard** con indicatori (prenotazioni, mostre in corso, voto medio, prenotazioni per mostra).
- **Gestione delle mostre**: creazione, modifica ed eliminazione con caricamento delle immagini.
- **Prenotazioni e moderazione dei feedback** per ogni mostra.
- **Gestione utenti** (`/admin/utenti`): elenco degli account con ricerca, numero di prenotazioni e feedback,
  modifica dei dati ed eliminazione. Insieme alla registrazione completa il **CRUD degli utenti**.
- **Verifica all'ingresso** (`/admin/verifica`): il personale inserisce il codice comunicato dal visitatore (anche
  in minuscolo o senza trattini) o il numero della prenotazione, **oppure inquadra il QR code con la fotocamera
  del telefono**. La pagina indica se la prenotazione è *valida*, *già usata*, per una mostra *non ancora
  iniziata* o *conclusa*; con **Registra ingresso** segna l'entrata (ogni prenotazione vale per un solo ingresso).

### Cosa contiene il QR code
Il QR code contiene solo un link alla pagina di verifica, ad esempio
`https://museo-digitale-pw-azure.vercel.app/admin/verifica?codice=MCD-68ZY-MT8U`. Nessun dato personale è scritto
nel QR: inquadrandolo, il personale del museo apre la pagina di verifica con il codice già inserito (se serve
viene chiesto prima il login dell'amministratore); un visitatore qualsiasi vede solo la richiesta di login.

### Mostre di partenza
Al primo avvio il database viene popolato con 7 mostre lette da `backend/data/mostre.json`, ognuna con
descrizione completa e immagini:

| Mostra | Periodo |
|---|---|
| Van Gogh: la Notte stellata e il colore | 15/09/2026 – 28/02/2027 |
| Caravaggio e il suo tempo | 10/10/2026 – 15/01/2027 |
| Leonardo: Il Codice Atlantico | 01/11/2026 – 28/02/2027 |
| Hokusai: la Grande onda | 15/11/2026 – 31/03/2027 |
| Monet: La Natura | 01/12/2026 – 30/04/2027 |
| Dalí e le forme | 01/12/2026 – 30/04/2027 |
| Munch: l'Urlo e l'anima moderna | 20/01/2027 – 31/05/2027 |

### Screenshot

#### Dashboard
<img width="988" height="730" alt="Dashboard dell'area riservata" src="https://github.com/user-attachments/assets/51d487b4-a8a7-449f-956e-012e966d298e" />

#### Prenotazione con codice e QR code
![Prenotazione con codice e QR code](docs/screenshots/35-prenotazione-qr.webp)

#### Email di conferma della prenotazione
![Email di conferma con QR code](docs/screenshots/39-email-qr.webp)

![Invio mail prenotazione](backend/static/img.png)

#### Verifica all'ingresso
![Verifica della prenotazione](docs/screenshots/37-verifica-prenotazione.webp)

![Ingresso registrato](docs/screenshots/38-ingresso-registrato.webp)

#### Swagger API
<img width="2522" height="2118" alt="Swagger UI" src="https://github.com/user-attachments/assets/c0ad9853-bc0a-4ed1-b2aa-0be80a9aefba" />

Altri screenshot (catalogo, registrazione, area personale, feedback, contatti, versione inglese) sono nella
pagina [Funzionalità](https://reverserob.github.io/museo-digitale-pw/guida/funzionalita/) del sito di
documentazione e nella cartella [`docs/screenshots`](docs/screenshots).

## Stack tecnologico

### Backend
- **FastAPI**: il framework per le API REST (con documentazione OpenAPI/Swagger automatica).
- **Uvicorn**: il server web che esegue FastAPI.
- **SQLAlchemy** + **SQLite**: l'ORM per parlare con il database senza scrivere query SQL a mano.
- **Pydantic v2**: valida i dati JSON in entrata e in uscita.
- **segno**: genera i QR code delle prenotazioni (PNG), senza dipendenze esterne.
- **slowapi**: limita i tentativi di login, registrazione, reset password e invio dei moduli.
- **Brevo** (API HTTPS) oppure **SMTP**: invio delle email.

### Frontend
- **Vite** + **React 18**
- **Material UI (MUI)**
- **React Router**
- **Axios**

### Qualità e documentazione
- pytest, Vitest + Testing Library, ruff, ESLint, Prettier
- MkDocs (tema Material) + mkdocstrings, JSDoc, Swagger UI
- GitHub Actions (CI e pubblicazione della documentazione su GitHub Pages)

## Struttura del progetto
```
museo-digitale-pw/
├── backend/                 # API FastAPI
│   ├── main.py              # avvio dell'app, CORS, router, creazione del database
│   ├── settings.py          # configurazione letta da .env / variabili d'ambiente
│   ├── models.py            # tabelle SQLAlchemy (Mostra, Prenotazione, Utente, Feedback…)
│   ├── schemas.py           # schemi Pydantic di richieste e risposte
│   ├── auth.py              # token firmati (HMAC) e controllo dei ruoli
│   ├── routers/             # endpoint: mostre, prenotazioni, utenti, feedback, contatti, statistiche, login
│   ├── services/            # logica: email, QR e codici di prenotazione, immagini, migrazioni, seed…
│   ├── data/mostre.json     # mostre di partenza
│   ├── static/uploads/      # immagini delle mostre
│   ├── tests/               # test pytest
│   └── esporta_openapi.py   # esporta lo schema OpenAPI per la Swagger UI statica
├── frontend/                # applicazione React
│   └── src/
│       ├── pages/           # Home, Esposizioni, FormPrenotazione, AreaPersonale, AdminDashboard, AdminVerifica…
│       ├── components/      # header, footer, QrPrenotazione, IconaMuseo, ProtectedRoute…
│       ├── services/        # chiamate alle API (axios)
│       ├── hooks/           # sessione dell'utente e dell'amministratore, lingua
│       ├── i18n/            # testi in italiano e inglese
│       └── tests/           # test Vitest
├── docs/                    # sorgenti del sito di documentazione (MkDocs)
├── mkdocs.yml
├── DOCUMENTATION.md         # relazione tecnica
└── .github/workflows/       # ci.yml e docs.yml
```

## Avvio in locale

### Prerequisiti
- **Python 3.9 o successivo**: il progetto funziona con qualunque versione recente ed è verificato in CI su 3.9,
  3.12 e 3.15 (i requisiti indicano intervalli di versione, non versioni fisse).
- **Node.js 20 o successivo** (con npm)
- Git

### Backend
```bash
git clone https://github.com/reverserob/museo-digitale-pw.git
cd museo-digitale-pw/backend
python -m venv venv
source venv/bin/activate          # su Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # poi compilare i valori necessari
uvicorn main:app --reload
```

Il backend risponde su `http://127.0.0.1:8000`. Al primo avvio viene creato il file `museo.db` con le mostre di
partenza; i database già esistenti vengono aggiornati da soli (ad esempio con le colonne del codice di
prenotazione e dell'ingresso).

> **Attiva sempre il venv** (`source venv/bin/activate`) prima di avviare il backend: senza, Python non trova i
> pacchetti installati e le variabili del `.env` non vengono lette.
>
> **macOS**: se compare `CERTIFICATE_VERIFY_FAILED`, esegui una volta
> `/Applications/Python 3.x/Install Certificates.command` (con la tua versione di Python).

### Frontend
In un secondo terminale:
```bash
cd museo-digitale-pw/frontend
npm install
npm run dev
```

L'applicazione è su `http://localhost:5173/` e, in locale, chiama automaticamente il backend su
`http://127.0.0.1:8000`. Per provare prenotazioni e feedback basta creare un account da **Accedi → Registrati**.

L'indirizzo del backend si può cambiare con `VITE_API_URL` (vedi `frontend/.env.example`; su Vercel in
*Settings → Environment Variables*).

## Variabili d'ambiente
Il backend legge la configurazione da `backend/.env` (e da `.env.local`, che ha la precedenza). Il file
`backend/.env.example` contiene l'elenco delle variabili **senza valori segreti**.

> I segreti (password, chiavi API, `SECRET_KEY`) non vanno mai scritti nel codice né in `.env.example`: stanno
> solo nel `.env` locale (escluso da Git) e, in produzione, nel pannello *Environment* di Render.

| Variabile | Descrizione |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenziali dell'area riservata |
| `SECRET_KEY` | Chiave per firmare i token di accesso (valore casuale lungo) |
| `TOKEN_DURATA_ORE` | Durata dei token di accesso (default 8) |
| `BREVO_API_KEY` | Chiave API di Brevo: se presente le email partono via API HTTPS (necessario su Render free, che blocca SMTP) |
| `SMTP_USER` / `SMTP_PASSWORD` | In alternativa a Brevo: account e "password per le app" per l'invio via SMTP |
| `EMAIL_MITTENTE` / `EMAIL_MITTENTE_NOME` | Mittente delle email (indirizzo **verificato** su Brevo) |
| `CONTATTI_EMAIL` | Casella che riceve le richieste del modulo Contatti |
| `CORS_ORIGINS` | Domini del frontend autorizzati, separati da virgola |
| `FRONTEND_URL` | Indirizzo del sito usato nel link di reset password e nel QR code delle prenotazioni |
| `BACKEND_URL` | Facoltativa: indirizzo pubblico del backend per l'immagine del QR code nel testo delle email |
| `RESET_PASSWORD_MINUTI` | Durata del link per reimpostare la password (default 30) |
| `DATABASE_URL` | Database (default `sqlite:///./museo.db`) |
| `LOGIN_RATE_LIMIT` | Tentativi consentiti per IP su login, registrazione, reset e contatti (default `5/minute`) |
| `UPLOAD_MAX_MB` | Dimensione massima di ogni immagine caricata (default 5) |
| `VITE_API_URL` | *(frontend)* indirizzo del backend, se diverso da quello predefinito |

Senza servizio email configurato l'applicazione funziona lo stesso: le email non partono e il loro contenuto (ad
esempio il link di reset) viene scritto nel log del server.

## Email (Brevo) e risoluzione dei problemi

### Configurazione di Brevo
1. Su Brevo, nella sezione dei mittenti (*Senders*), aggiungi e **verifica** l'indirizzo mittente.
2. Nella sezione *SMTP & API → API Keys* genera una nuova chiave API (è visibile solo al momento della creazione: copiala subito).
3. In *Sicurezza → IP autorizzati* disattiva il blocco degli IP sconosciuti (Render cambia IP).
4. Inserisci `BREVO_API_KEY`, `EMAIL_MITTENTE` (identico all'indirizzo verificato) ed `EMAIL_MITTENTE_NOME`
   nel `.env` locale e nell'*Environment* di Render, poi riavvia il backend.

### Email della prenotazione
L'email di conferma contiene il codice `MCD-XXXX-XXXX`, i dati della mostra e il QR code:
- **sempre in allegato** (`prenotazione-MCD-XXXX-XXXX.png`), quindi funziona anche in locale;
- **come immagine nel testo** solo quando il backend ha un indirizzo pubblico (`BACKEND_URL` o il backend su
  Render), perché il programma di posta scarica l'immagine da `/api/prenotazioni/qr/{codice}`. In locale
  (`127.0.0.1`) l'immagine nel testo non viene inserita, così non compare un'immagine rotta.

### Se le email non arrivano
Il motivo è sempre scritto nel log del backend, nella riga `Errore invio email a ...`.

| Messaggio | Soluzione |
|---|---|
| `Email non configurata` | Inserire `BREVO_API_KEY` ed `EMAIL_MITTENTE` nel `.env` (o su Render) e riavviare |
| Variabili vuote anche se il `.env` c'è | Attivare il venv (`source venv/bin/activate`) e `pip install -r requirements-dev.txt` |
| `Connection unexpectedly closed` | SMTP rifiutato: usare Brevo anche in locale |
| `CERTIFICATE_VERIFY_FAILED` | Su macOS eseguire `/Applications/Python 3.x/Install Certificates.command` |
| `400 ... valid sender email required` | `EMAIL_MITTENTE` scritto male (es. manca il punto in `.com`) o non verificato su Brevo |
| `401 ... unrecognised IP` | Su Brevo disattivare il blocco degli IP (*Sicurezza → IP autorizzati*) |
| Log "inviata" ma nessuna email | Controllare che l'indirizzo del destinatario sia scritto bene e la posta indesiderata |

Maggiori dettagli in [DOCUMENTATION.md §13.7](DOCUMENTATION.md#137-risoluzione-dei-problemi-con-le-email).

## API REST e Swagger
- In locale, con il backend avviato: `http://127.0.0.1:8000/docs` (e `/redoc`)
- Backend pubblicato (per provare le chiamate): https://museo-digitale-pw.onrender.com/docs
- Copia di sola lettura nel sito di documentazione: https://reverserob.github.io/museo-digitale-pw/guida/swagger/

Endpoint principali (🔒 = amministratore, 👤 = visitatore registrato):

| Metodo e percorso | Descrizione |
|---|---|
| `GET /api/mostre`, `GET /api/mostre/{id}` | Catalogo e dettaglio delle mostre |
| 🔒 `POST` / `PUT` / `DELETE /api/mostre…` | Gestione delle mostre e delle immagini |
| `POST /api/utenti/registrazione`, `POST /api/utenti/login` | Registrazione e login del visitatore |
| `POST /api/utenti/password-dimenticata`, `POST /api/utenti/reimposta-password` | Recupero della password |
| 👤 `GET` / `PUT` / `DELETE /api/utenti/me` | Profilo del visitatore: lettura, modifica, eliminazione dell'account (con password) |
| 👤 `GET /api/utenti/me/prenotazioni`, 👤 `DELETE /api/utenti/me/prenotazioni/{id}` | Prenotazioni del visitatore e annullamento |
| 🔒 `GET /api/utenti`, 🔒 `GET` / `PUT` / `DELETE /api/utenti/{id}` | Gestione degli account dall'area riservata |
| 👤 `POST /api/prenota` | Prenotazione: restituisce il `codice` e invia l'email con il QR code |
| `GET /api/prenotazioni/qr/{codice}` | Immagine PNG del QR code (contiene solo il link di verifica) |
| 🔒 `GET /api/prenotazioni/verifica/{riferimento}` | Verifica per codice o numero: dati e stato della prenotazione |
| 🔒 `POST /api/prenotazioni/verifica/{riferimento}/ingresso` | Registra l'ingresso (una sola volta, solo a mostra aperta) |
| 👤 `POST /api/feedback`, `GET /api/feedback` | Feedback dei visitatori |
| 👤 `POST /api/contatti` | Modulo Contatti |
| 🔒 `GET /api/statistiche` | Indicatori della dashboard |
| `POST /api/login` | Login dell'amministratore |

L'elenco completo, con permessi e codici di risposta, è nella pagina
[API REST](https://reverserob.github.io/museo-digitale-pw/guida/api/) del sito di documentazione.

## Test e controlli di qualità

### Backend (206 test pytest)
```bash
cd backend
source venv/bin/activate
pip install -r requirements-dev.txt
pytest                # test automatici
ruff check .          # linter
ruff format --check . # formattazione (ruff format . per correggere)
```

### Frontend (163 test Vitest)
```bash
cd frontend
npm install
npm test              # test automatici (Vitest + Testing Library)
npm run lint          # ESLint
npm run format:check  # Prettier (npm run format per correggere)
npm run build         # build di produzione
```

## Documentazione tecnica
La documentazione del progetto è generata dai commenti del codice e pubblicata su GitHub Pages:
[reverserob.github.io/museo-digitale-pw](https://reverserob.github.io/museo-digitale-pw/)

- **Backend**: MkDocs (tema Material) + mkdocstrings, dai docstring Python in stile Google
- **Frontend**: JSDoc, dai commenti `/** ... */` dei file React
- **Swagger UI**: schema OpenAPI esportato da FastAPI con `backend/esporta_openapi.py`

```bash
cd frontend && npm run docs && cd ..                                            # JSDoc → docs/frontend-api/
cd backend && python esporta_openapi.py ../docs/swagger/openapi.json && cd ..   # schema per la Swagger UI
pip install -r backend/requirements-docs.txt
mkdocs serve -a 127.0.0.1:8001                                                  # anteprima del sito
```

A ogni push su `main` il workflow `.github/workflows/docs.yml` rigenera tutto e pubblica il sito su GitHub Pages
(requisito una tantum: *Settings → Pages → Source: GitHub Actions*).

## Integrazione continua (GitHub Actions)
A ogni push su `main` e a ogni pull request il workflow `.github/workflows/ci.yml` esegue:
- **backend**: ruff e pytest su Python 3.9, 3.12 e 3.15;
- **frontend**: ESLint, Prettier, Vitest e la build;
- **documentazione**: JSDoc, esportazione dello schema OpenAPI e `mkdocs build --strict`.

L'esito si vede nella scheda **Actions** del repository e nel badge in cima a questo file.

## Deploy

### Backend su Render
Start Command del servizio (necessario perché il limite ai tentativi di login legga l'IP reale dei visitatori):
```
uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'
```

Variabili da impostare in *Environment*: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SECRET_KEY`, `BREVO_API_KEY`,
`EMAIL_MITTENTE`, `EMAIL_MITTENTE_NOME`, `CONTATTI_EMAIL`, `CORS_ORIGINS` (dominio Vercel), `FRONTEND_URL`
(dominio Vercel, usato nel QR code) e, facoltativa, `BACKEND_URL`. Dopo ogni modifica Render riavvia il servizio.

### Frontend su Vercel
Progetto Vite con cartella principale `frontend` (build `npm run build`). Se il backend non è quello
predefinito, impostare `VITE_API_URL` in *Settings → Environment Variables*.

### Documentazione su GitHub Pages
Pubblicata automaticamente dal workflow `docs.yml` a ogni push su `main`.

## Credenziali dell'area riservata (solo demo in locale)
Se `ADMIN_EMAIL` e `ADMIN_PASSWORD` non sono impostate, in locale valgono:
- email: `admin@museo.it`
- password: `admin2026`

In produzione vanno impostate credenziali diverse tramite variabili d'ambiente.

## Licenza
[MIT](LICENSE) © 2026 Roberta Randazzo
