# Project Work - Museo Digitale

## Tema n. 1: La digitalizzazione dell’impresa 

### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale:
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti

#### DASHBOARD
Go To: [Museo Digitale](https://museo-digitale-pw-azure.vercel.app/)
<img width="988" height="730" alt="image" src="https://github.com/user-attachments/assets/51d487b4-a8a7-449f-956e-012e966d298e" />

#### Invio Mail Prenotazione
![img.png](backend/static/img.png)

#### Swagger API
<img width="2522" height="2118" alt="swagger" src="https://github.com/user-attachments/assets/c0ad9853-bc0a-4ed1-b2aa-0be80a9aefba" />

#### Used Backend Library

- FastAPI: Il framework per le API.
- Uvicorn: Il server web che farà girare FastAPI.
- SQLAlchemy: L'ORM (Object-Relational Mapper) per parlare con il database senza scrivere query SQL a mano.
- Pydantic: Serve per validare i dati JSON in entrata e uscita (FastAPI lo usa di default).
  pip install -r requirements.txt
####  Run the backend
1. `cd backend`
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `cp .env.example .env` e compila i valori (credenziali admin, `SECRET_KEY`, SMTP)
5. `uvicorn main:app --reload`

#### Run Tests PY
1. `cd backend`
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements-dev.txt`
4. `pytest`

Le credenziali e le chiavi si leggono **solo** da variabili d'ambiente (file `backend/.env` in locale,
pannello *Environment* su Render): nessun segreto è scritto nel codice. Se le variabili SMTP non sono
impostate, le prenotazioni vengono comunque salvate ma l'email di conferma non viene inviata.

| Variabile | Descrizione |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenziali dell'area riservata |
| `SECRET_KEY` | Chiave per firmare i token di accesso (valore casuale lungo) |
| `SMTP_USER` / `SMTP_PASSWORD` | Account e "password per le app" per l'invio delle email |
| `CORS_ORIGINS` | Domini del frontend autorizzati, separati da virgola |
| `DATABASE_URL` | Facoltativa, default `sqlite:///./museo.db` |

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

L'indirizzo del backend si può impostare con `VITE_API_URL` (vedi `frontend/.env.example`; su Vercel
in *Settings → Environment Variables*).

#### Credenziali Reserved Area (solo demo in locale)
Se `ADMIN_EMAIL` e `ADMIN_PASSWORD` non sono impostate, in locale valgono:
email: `admin@museo.it` 
password: `admin2026`

In produzione vanno impostate credenziali diverse tramite variabili d'ambiente.
