/**
 * Autenticazione dell'amministratore (area riservata).
 *
 * @module services/authService
 */
import { api, getToken, setToken, getSessioneUtente } from './api';

/**
 * Messaggio mostrato se un visitatore collegato prova ad accedere all'area riservata.
 *
 * @type {string}
 */
export const MESSAGGIO_VISITATORE_COLLEGATO =
    "Sei collegato come visitatore: esci dal tuo account per accedere all'area riservata.";

/**
 * Login dell'area riservata (`POST /api/login`): se le credenziali sono giuste salva il token.
 * Non è permesso mentre un visitatore è collegato: prima deve fare il logout.
 *
 * @param {string} email Email dell'amministratore.
 * @param {string} password Password dell'amministratore.
 * @returns {Promise<{access_token: string, token_type: string}>} Il token rilasciato dal backend.
 * @throws {Error} Con {@link module:services/authService.MESSAGGIO_VISITATORE_COLLEGATO} se un visitatore è collegato.
 */
export const login = (email, password) => {
    if (getSessioneUtente()) return Promise.reject(new Error(MESSAGGIO_VISITATORE_COLLEGATO));
    return api.post('/api/login', { email, password }).then((res) => {
        setToken(res.data.access_token);
        return res.data;
    });
};

/**
 * Logout dell'amministratore: basta cancellare il token salvato nel browser.
 *
 * @returns {void}
 */
export const logout = () => setToken(null);

/**
 * Indica se l'area riservata è accessibile: serve il token admin e nessun visitatore collegato.
 *
 * @returns {boolean} `true` se l'amministratore è collegato.
 */
export const isLoggedIn = () => Boolean(getToken()) && !getSessioneUtente();
