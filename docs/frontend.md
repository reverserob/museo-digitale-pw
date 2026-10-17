# Frontend

La documentazione del frontend React è generata con **[JSDoc](https://jsdoc.app/)** dai commenti `/** ... */`
del codice in `frontend/src` ed è pubblicata insieme a questo sito.

[:material-react: Apri la documentazione del frontend](frontend-api/index.html){ .md-button .md-button--primary }

## Cosa contiene

| Sezione | Moduli |
| --- | --- |
| **Pagine** | `pages/Home`, `pages/Esposizioni`, `pages/GalleriaMostra`, `pages/FormPrenotazione`, `pages/Accedi`, `pages/AreaPersonale`, `pages/Contatti`, `pages/AdminDashboard`, `pages/AdminForm`, ... |
| **Componenti** | `components/AppHeader`, `components/AppFooter`, `components/SezioneFeedback`, `components/IndicatoriDashboard`, `components/ProtectedRoute`, `components/ErrorBoundary` |
| **Servizi** | `services/api` (client HTTP e token), `services/mostreService`, `services/prenotazioniService`, `services/feedbackService`, `services/utentiService`, `services/authService`, `services/statisticheService`, `services/contattiService` |
| **Hook** | `hooks/useUtente`, `hooks/useAdmin`, `hooks/useLingua` |
| **Lingua** | `i18n/lingua` (traduzione), `i18n/testi` (testi IT/EN) |
| **Tipi** | `tipi`: forma dei dati restituiti dal backend (`Mostra`, `Utente`, `Prenotazione`, `Feedback`, `Statistiche`...) |

## Esempio di commento JSDoc

```js
/**
 * Prenota una mostra (`POST /api/prenota`). Solo visitatori registrati:
 * nome, cognome ed email vengono presi dall'account; il backend invia l'email di conferma.
 *
 * @param {object} dati Dati della prenotazione.
 * @param {number} dati.mostra_id Mostra da prenotare.
 * @param {string} [dati.telefono] Telefono, se diverso da quello dell'account.
 * @returns {Promise<{message: string, id: number}>} Conferma con l'id della prenotazione.
 */
export const prenota = (dati) => api.post('/api/prenota', dati).then((res) => res.data);
```

!!! info "In locale"
    Il pulsante funziona dopo aver generato la documentazione del frontend con `npm run docs`
    (vedi [Come si genera](documentazione.md)).
