# Avvio in locale

## Prerequisiti

- Python 3.9 o successivo
- Node.js 20 o successivo (con npm)
- Git

## Backend

```bash
git clone https://github.com/reverserob/museo-digitale-pw.git
cd museo-digitale-pw/backend
python -m venv venv
source venv/bin/activate          # su Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # poi compilare i valori necessari
uvicorn main:app --reload
```

Il backend risponde su `http://127.0.0.1:8000`. Al primo avvio viene creato il file `museo.db` con le mostre iniziali lette da `data/mostre.json`.

!!! tip "Swagger UI"
    FastAPI genera da solo la documentazione interattiva delle API: con il backend avviato apri
    [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) per provare gli endpoint dal browser.
    Online la trovi sul [backend pubblicato](https://museo-digitale-pw.onrender.com/docs) e, in sola lettura,
    nella pagina [Swagger UI](swagger.md) di questo sito.

## Frontend

In un secondo terminale:

```bash
cd museo-digitale-pw/frontend
npm install
npm run dev
```

L'applicazione è su `http://localhost:5173` e, in locale, chiama automaticamente il backend su `http://127.0.0.1:8000`. Per provare prenotazioni e feedback basta creare un account dalla pagina **Accedi → Registrati**.

## Variabili d'ambiente

Il backend legge la configurazione da `backend/.env` (e da `.env.local`, che ha la precedenza). I segreti non vanno mai scritti nel codice né in `.env.example`: in produzione si impostano nel pannello *Environment* di Render.

| Variabile | Descrizione |
| --- | --- |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenziali dell'area riservata |
| `SECRET_KEY` | Chiave per firmare i token di accesso (valore casuale lungo) |
| `TOKEN_DURATA_ORE` | Durata dei token di accesso (default 8) |
| `BREVO_API_KEY` | Chiave API di Brevo: se presente le email partono via API HTTPS |
| `SMTP_USER` / `SMTP_PASSWORD` | In alternativa a Brevo: account e "password per le app" per l'invio via SMTP |
| `EMAIL_MITTENTE` / `EMAIL_MITTENTE_NOME` | Mittente delle email (indirizzo verificato su Brevo) |
| `CONTATTI_EMAIL` | Casella che riceve le richieste del modulo Contatti |
| `CORS_ORIGINS` | Domini del frontend autorizzati, separati da virgola |
| `FRONTEND_URL` | Indirizzo del sito usato nel link di reset password |
| `RESET_PASSWORD_MINUTI` | Durata del link per reimpostare la password (default 30) |
| `DATABASE_URL` | Database (default `sqlite:///./museo.db`) |
| `LOGIN_RATE_LIMIT` | Tentativi consentiti per IP su login, registrazione, reset e contatti (default `5/minute`) |
| `UPLOAD_MAX_MB` | Dimensione massima di ogni immagine caricata (default 5) |
| `VITE_API_URL` | *(frontend)* indirizzo del backend, se diverso da quello predefinito |

Senza servizio email configurato l'applicazione funziona lo stesso: le email non partono e il loro contenuto (ad esempio il link di reset) viene scritto nel log del server.

## Test e controlli

=== "Backend"

    ```bash
    cd backend
    pip install -r requirements-dev.txt
    pytest                # test automatici
    ruff check .          # linter
    ruff format --check . # formattazione
    ```

=== "Frontend"

    ```bash
    cd frontend
    npm test              # test automatici (Vitest)
    npm run lint          # ESLint
    npm run format:check  # Prettier
    npm run build         # build di produzione
    ```

Gli stessi controlli vengono eseguiti da **GitHub Actions** a ogni pull request e a ogni push su `main`,
insieme alla generazione di questa documentazione ([come si genera](../documentazione.md)).
