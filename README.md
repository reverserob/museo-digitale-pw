# Project Work - Museo Digitale

## Tema n. 1: La digitalizzazione dell’impresa 

### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale:
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti

#### DASHBOARD
Go To: [Museo Digitale](https://museo-digitale-pw-azure.vercel.app/)
<img width="988" height="730" alt="image" src="https://github.com/user-attachments/assets/51d487b4-a8a7-449f-956e-012e966d298e" />

#### Swagger API
<img width="2522" height="2118" alt="swagger" src="https://github.com/user-attachments/assets/c0ad9853-bc0a-4ed1-b2aa-0be80a9aefba" />

#### Used Backend Library

- FastAPI: Il framework per le API.
- Uvicorn: Il server web che farà girare FastAPI.
- SQLAlchemy: L'ORM (Object-Relational Mapper) per parlare con il database senza scrivere query SQL a mano.
- Pydantic: Serve per validare i dati JSON in entrata e uscita (FastAPI lo usa di default).

####  Run the db
1. `cd /backend`
2. `source venv/bin/activate`
3. `uvicorn main:app --reload`

#### Swagger API docs
`http://127.0.0.1:8000/docs`

#### Used Frontend Library
- Vite
- ReactJs
- Axios

#### Run the WebApp Frontend
1. `cd /frontend`
2. `npm run dev`
3. go to `http://localhost:5173/`

#### Credenziali Reserved Area
email: `admin@museo.it` 
password: `admin2026`
