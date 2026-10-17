# Frontend del Museo Civico Digitale

Documentazione generata automaticamente con **JSDoc** a partire dai commenti `/** ... */` del codice in `frontend/src`.

Il frontend è un'applicazione **React 18** creata con **Vite** e **Material UI**. Comunica con il backend FastAPI tramite le funzioni dei moduli `services/*`, che sono gli unici a conoscere gli indirizzi delle API.

## Come è organizzato il codice

| Cartella      | Contenuto                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/`      | Una pagina per ogni rotta di `config/routes.json` (Home, Esposizioni, dettaglio mostra, prenotazione, area personale, area riservata...) |
| `components/` | Parti riutilizzate: header, footer, sezione feedback, indicatori della dashboard, protezione delle rotte, gestione degli errori          |
| `services/`   | Chiamate HTTP al backend (axios) e gestione dei token di admin e visitatori                                                              |
| `hooks/`      | Hook React: visitatore collegato, admin collegato, lingua scelta                                                                         |
| `i18n/`       | Testi in italiano e inglese e funzioni di traduzione                                                                                     |
| `utils/`      | Regole della password condivise da registrazione e reset                                                                                 |
| `tipi.js`     | Forma dei dati scambiati con il backend (`Mostra`, `Utente`, `Feedback`...)                                                              |

## Da dove iniziare

- **[services/api](module-services_api.html)**: client HTTP, token e messaggi di errore.
- **[components/ProtectedRoute](module-components_ProtectedRoute.html)**: come vengono protette le pagine.
- **[tipi](module-tipi.html)**: i dati restituiti dalle API.

## Rigenerare questa documentazione

```bash
cd frontend
npm run docs        # crea la cartella docs/frontend-api/ nella radice del progetto
```
