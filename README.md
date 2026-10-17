# Project Work - Museo Digitale

[![CI](https://github.com/reverserob/museo-digitale-pw/actions/workflows/ci.yml/badge.svg)](https://github.com/reverserob/museo-digitale-pw/actions/workflows/ci.yml)

## Tema n. 1: La digitalizzazione dell’impresa 

### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale:
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti

**Relazione tecnica completa** (contesto, processo AS-IS/TO-BE, architettura, diagrammi UML ed ER, API, test funzionali, sviluppi futuri): [DOCUMENTATION.md](DOCUMENTATION.md)

### Documentazione
1. https://github.com/reverserob/museo-digitale-pw/blob/main/DOCUMENTATION.md

## Guida al Progetto
1. https://reverserob.github.io/museo-digitale-pw/

#### Funzionalità
- Catalogo delle mostre con galleria di immagini
- Account dei visitatori (registrazione e login) per prenotare e lasciare feedback, con area personale
- Prenotazione della visita con email di conferma
- Feedback dei visitatori (voto da 1 a 5 e commento)
- Area riservata: gestione delle mostre, prenotazioni, moderazione dei feedback
- Dashboard con indicatori (prenotazioni, mostre in corso, voto medio, prenotazioni per mostra)

#### DASHBOARD
Go To: [Museo Digitale](https://museo-digitale-pw-azure.vercel.app/)
<img width="988" height="730" alt="image" src="https://github.com/user-attachments/assets/51d487b4-a8a7-449f-956e-012e966d298e" />

#### Invio Mail Prenotazione
![img.png](backend/static/img.png)

#### Swagger API
<img width="2522" height="2118" alt="swagger" src="https://github.com/user-attachments/assets/c0ad9853-bc0a-4ed1-b2aa-0be80a9aefba" />

#### Backend Library

- FastAPI: Il framework per le API.
- Uvicorn: Il server web che farà girare FastAPI.
- SQLAlchemy: L'ORM (Object-Relational Mapper) per parlare con il database senza scrivere query SQL a mano.
- Pydantic: Serve per validare i dati JSON in entrata e uscita (FastAPI lo usa di default).
  pip install -r requirements.txt
####  Run the backend
1. `cd backend`
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `cp .env.example .env`
5. `uvicorn main:app --reload`


#### Run Tests PY
1. `cd backend`
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements-dev.txt`
4. `pytest`
5. `ruff check .` 
6. `ruff format .`


| Variabile | Descrizione |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenziali dell'area riservata |
| `SECRET_KEY` | Chiave per firmare i token di accesso (valore casuale lungo) |
| `SMTP_USER` / `SMTP_PASSWORD` | Account e "password per le app" per l'invio delle email |
| `BREVO_API_KEY` | Facoltativa: chiave API di Brevo. Se presente le email partono via API (necessario su Render free, che blocca SMTP) |
| `EMAIL_MITTENTE` / `EMAIL_MITTENTE_NOME` | Mittente delle email inviate con Brevo (indirizzo verificato su Brevo) |
| `CORS_ORIGINS` | Domini del frontend autorizzati, separati da virgola |
| `DATABASE_URL` | Facoltativa, default `sqlite:///./museo.db` |
| `LOGIN_RATE_LIMIT` | Facoltativa, tentativi di login consentiti per IP (default `5/minute`) |

#### Swagger API docs
`http://127.0.0.1:8000/docs`

#### Used Frontend Library
- Vite
- ReactJs
- Axios
- Material UI (MUI)

#### Run the WebApp Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. go to `http://localhost:5173/`

#### Run Test Frontend
1. `cd frontend`
2. `npm install`
3. `npm test`
4. `npm run lint` (ESLint) 
5. `npm run format` (Prettier)

L'indirizzo del backend si può impostare con `VITE_API_URL` (vedi `frontend/.env.example`; su Vercel
in *Settings → Environment Variables*).

#### Documentazione tecnica
La documentazione del progetto è generata dai commenti del codice e pubblicata su GitHub Pages:
[reverserob.github.io/museo-digitale-pw](https://reverserob.github.io/museo-digitale-pw/)

- **Backend**: MkDocs (tema Material) + mkdocstrings, dai docstring Python in stile Google
- **Frontend**: JSDoc, dai commenti `/** ... */` dei file React

```bash
cd frontend && npm run docs && cd ..          # JSDoc → docs/frontend-api/
pip install -r backend/requirements-docs.txt
mkdocs serve -a 127.0.0.1:8001                # anteprima del sito
```

#### Integrazione continua (GitHub Actions)
A ogni push su `main` il workflow `.github/workflows/ci.yml` esegue ruff e pytest sul backend
(Python 3.9 e 3.12) e ESLint, Prettier, Vitest e la build sul frontend. L'esito si vede nella scheda
**Actions** del repository e nel badge in cima a questo file.

#### Deploy del backend su Render
Start Command del servizio (necessario perché il limite ai tentativi di login legga l'IP reale dei visitatori):
```
uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'
```

#### Credenziali Reserved Area (solo demo in locale)
Se `ADMIN_EMAIL` e `ADMIN_PASSWORD` non sono impostate, in locale valgono:
email: `admin@museo.it` 
password: `admin2026`

In produzione vanno impostate credenziali diverse tramite variabili d'ambiente.
