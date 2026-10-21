/**
 * Account dei visitatori: registrazione, login, profilo, prenotazioni personali e reset della password.
 *
 * @module services/utentiService
 */
import { api, getSessioneUtente, setSessioneUtente, setToken } from './api';

// Salva token e profilo restituiti da registrazione o login
const salvaSessione = (res) => {
    // un visitatore collegato non può restare collegato anche all'area riservata
    setToken(null);
    setSessioneUtente({ token: res.data.access_token, utente: res.data.utente });
    return res.data.utente;
};

/**
 * Crea un account visitatore (`POST /api/utenti/registrazione`).
 * Dopo la registrazione il visitatore è già collegato e riceve un'email di benvenuto.
 *
 * @param {{nome: string, cognome: string, email: string, conferma_email: string, telefono: string, password: string}} dati
 *     Dati del nuovo account; `conferma_email` è la seconda digitazione dell'email, ricontrollata dal backend.
 * @returns {Promise<module:tipi~Utente>} Il profilo creato (errore 409 se l'email è già registrata).
 */
export const registrazione = (dati) => api.post('/api/utenti/registrazione', dati).then(salvaSessione);

/**
 * Login del visitatore (`POST /api/utenti/login`).
 *
 * @param {string} email Email dell'account.
 * @param {string} password Password dell'account.
 * @returns {Promise<module:tipi~Utente>} Il profilo del visitatore collegato.
 */
export const loginUtente = (email, password) => api.post('/api/utenti/login', { email, password }).then(salvaSessione);

/**
 * Logout del visitatore: cancella la sessione salvata nel browser.
 *
 * @returns {void}
 */
export const logoutUtente = () => setSessioneUtente(null);

/**
 * Visitatore collegato, letto dalla sessione salvata nel browser.
 *
 * @returns {?module:tipi~Utente} Il profilo, oppure `null` se nessun visitatore è collegato.
 */
export const getUtente = () => getSessioneUtente()?.utente || null;

/**
 * Prenotazioni del visitatore collegato (`GET /api/utenti/me/prenotazioni`).
 *
 * @returns {Promise<module:tipi~MiaPrenotazione[]>} Le prenotazioni, dalla più recente.
 */
export const getMiePrenotazioni = () => api.get('/api/utenti/me/prenotazioni').then((res) => res.data);

/**
 * Feedback lasciati dal visitatore collegato (`GET /api/utenti/me/feedback`).
 *
 * @returns {Promise<module:tipi~Feedback[]>} I feedback del visitatore.
 */
export const getMieiFeedback = () => api.get('/api/utenti/me/feedback').then((res) => res.data);

/**
 * Richiede il link per reimpostare la password (`POST /api/utenti/password-dimenticata`).
 * Il backend invia per email un link con un token valido per poco tempo.
 *
 * @param {string} email Email dell'account.
 * @returns {Promise<string>} Messaggio di conferma (uguale anche se l'email non è registrata).
 */
export const passwordDimenticata = (email) =>
    api.post('/api/utenti/password-dimenticata', { email }).then((res) => res.data.message);

/**
 * Imposta una nuova password (`POST /api/utenti/reimposta-password`).
 *
 * @param {string} token Token ricevuto nel link dell'email.
 * @param {string} password Nuova password.
 * @returns {Promise<string>} Messaggio di conferma (errore 400 se il link è scaduto o già usato).
 */
export const reimpostaPassword = (token, password) =>
    api.post('/api/utenti/reimposta-password', { token, password }).then((res) => res.data.message);

/**
 * Annulla una propria prenotazione (`DELETE /api/utenti/me/prenotazioni/{id}`).
 * Il backend invia l'email di conferma dell'annullamento.
 *
 * @param {number} id Identificativo della prenotazione.
 * @returns {Promise<string>} Messaggio di conferma.
 */
export const annullaPrenotazione = (id) =>
    api.delete(`/api/utenti/me/prenotazioni/${id}`).then((res) => res.data.message);

/**
 * Modifica nome, cognome e telefono del visitatore collegato (`PUT /api/utenti/me`).
 * Aggiorna anche il profilo salvato nella sessione, così header e pagine mostrano subito i nuovi dati.
 *
 * @param {{nome: string, cognome: string, telefono: string}} dati Nuovi dati del profilo.
 * @returns {Promise<module:tipi~Utente>} Il profilo aggiornato.
 */
export const aggiornaProfilo = (dati) =>
    api.put('/api/utenti/me', dati).then((res) => {
        const sessione = getSessioneUtente();
        if (sessione) setSessioneUtente({ ...sessione, utente: res.data });
        return res.data;
    });

/**
 * Elimina l'account del visitatore collegato (`DELETE /api/utenti/me`) e chiude la sessione.
 * Le prenotazioni non ancora usate vengono annullate; quelle già usate restano anonime.
 * Il backend invia l'email di conferma dell'eliminazione.
 *
 * @param {string} password Password dell'account, richiesta come conferma.
 * @returns {Promise<string>} Messaggio di conferma (errore 400 se la password è errata).
 */
export const eliminaAccount = (password) =>
    api.delete('/api/utenti/me', { data: { password } }).then((res) => {
        logoutUtente();
        return res.data.message;
    });

/**
 * Elenco degli account registrati, solo amministratore (`GET /api/utenti`).
 *
 * @returns {Promise<module:tipi~UtenteAdmin[]>} Gli account, dal più recente.
 */
export const getUtenti = () => api.get('/api/utenti').then((res) => res.data);

/**
 * L'amministratore modifica nome, cognome e telefono di un account (`PUT /api/utenti/{id}`).
 *
 * @param {number} id Identificativo dell'account.
 * @param {{nome: string, cognome: string, telefono: string}} dati Nuovi dati.
 * @returns {Promise<module:tipi~UtenteAdmin>} L'account aggiornato.
 */
export const aggiornaUtente = (id, dati) => api.put(`/api/utenti/${id}`, dati).then((res) => res.data);

/**
 * L'amministratore elimina un account (`DELETE /api/utenti/{id}`).
 *
 * @param {number} id Identificativo dell'account.
 * @returns {Promise<string>} Messaggio di conferma.
 */
export const eliminaUtente = (id) => api.delete(`/api/utenti/${id}`).then((res) => res.data.message);
