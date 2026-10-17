---
hide:
  - navigation
---

# Museo Civico Digitale

Piattaforma web per la **digitalizzazione dei processi di un museo civico**: catalogo delle mostre, prenotazione delle visite con email di conferma, account dei visitatori, feedback e un'area riservata con dashboard per il personale.

Questo sito raccoglie la documentazione tecnica del Project Work. La reference del codice viene **generata automaticamente dai commenti** dei sorgenti, quindi resta allineata al codice a ogni modifica.

<div class="grid cards" markdown>

-   :material-rocket-launch: **Guida**

    ---

    Come avviare il progetto in locale, le funzionalità con gli screenshot, l'architettura e l'elenco delle API.

    [:octicons-arrow-right-24: Avvio in locale](guida/avvio.md)

-   :material-language-python: **Backend (FastAPI)**

    ---

    Reference di moduli, router, servizi, modelli e schemi generata dai docstring con **mkdocstrings**.

    [:octicons-arrow-right-24: Backend](backend/index.md)

-   :material-react: **Frontend (React)**

    ---

    Pagine, componenti, hook e servizi documentati con **JSDoc**.

    [:octicons-arrow-right-24: Frontend](frontend.md)

-   :material-api: **API REST**

    ---

    Tutti gli endpoint con metodo, permessi e codici di risposta, e la Swagger UI generata dallo schema OpenAPI.

    [:octicons-arrow-right-24: API](guida/api.md) · [:octicons-arrow-right-24: Swagger UI](guida/swagger.md)

</div>

## Il progetto in breve

| | |
| --- | --- |
| **Backend** | Python · FastAPI · SQLAlchemy · SQLite · Pydantic v2 · slowapi |
| **Frontend** | React 18 · Vite · Material UI · React Router · axios |
| **Email** | API Brevo (HTTPS) oppure SMTP |
| **Qualità** | pytest, Vitest + Testing Library, ruff, ESLint, Prettier, GitHub Actions |
| **Deploy** | Backend su Render, frontend su Vercel |
| **Sito pubblico** | [museo-digitale-pw-azure.vercel.app](https://museo-digitale-pw-azure.vercel.app/) |
| **API (Swagger)** | [museo-digitale-pw.onrender.com/docs](https://museo-digitale-pw.onrender.com/docs) |

![Home del sito](screenshots/26-home.webp){ .screenshot loading=lazy }
