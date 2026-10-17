/**
 * Client HTTP condiviso: indirizzo del backend, gestione dei token (admin e visitatore),
 * intercettori axios, percorsi delle immagini e messaggi di errore leggibili.
 *
 * Tutti gli altri servizi usano l'istanza {@link module:services/api.api} esportata da qui.
 *
 * @module services/api
 */
import axios from 'axios';
import { traduci, traduciServer } from '../i18n/lingua';

// il sito gira sul computer dello sviluppatore?
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

/**
 * Indirizzo del backend, senza barra finale.
 *
 * Vale `VITE_API_URL` se impostata (es. su Vercel), altrimenti il server locale
 * quando il sito gira su localhost, altrimenti il backend pubblicato su Render.
 *
 * @type {string}
 */
export const API_URL = (
    import.meta.env.VITE_API_URL || (isLocal ? 'http://127.0.0.1:8000' : 'https://museo-digitale-pw.onrender.com')
).replace(/\/$/, '');

// Il token dell'admin sta in sessionStorage: si cancella alla chiusura della scheda (più prudente)
const TOKEN_KEY = 'admin_token';

/**
 * Nome dell'evento del browser lanciato a ogni login o logout (admin e visitatore).
 * Gli hook {@link module:hooks/useAdmin} e {@link module:hooks/useUtente} lo ascoltano per aggiornarsi.
 *
 * @type {string}
 */
export const EVENTO_SESSIONE = 'sessione-utente-cambiata';

/**
 * Legge il token dell'amministratore salvato in `sessionStorage`.
 *
 * I try/catch servono perché lo storage può non essere disponibile (es. navigazione privata).
 *
 * @returns {?string} Il token, oppure `null` se l'admin non è collegato.
 */
export const getToken = () => {
    try {
        return sessionStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

/**
 * Salva (o cancella) il token dell'amministratore e avvisa i componenti con {@link module:services/api.EVENTO_SESSIONE}.
 *
 * @param {?string} token Token ricevuto dal login; `null` per il logout.
 * @returns {void}
 */
export const setToken = (token) => {
    try {
        if (token) sessionStorage.setItem(TOKEN_KEY, token);
        else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
        /* sessionStorage non disponibile */
    }
    // anche login e logout dell'admin aggiornano l'header e le pagine aperte
    window.dispatchEvent(new Event(EVENTO_SESSIONE));
};

// La sessione del visitatore (token + profilo) sta in localStorage: resta collegato anche riaprendo il browser
const UTENTE_KEY = 'utente_sessione';

/**
 * Legge la sessione del visitatore salvata in `localStorage`.
 *
 * @returns {?module:tipi~SessioneUtente} La sessione, oppure `null` se nessun visitatore è collegato.
 */
export const getSessioneUtente = () => {
    try {
        return JSON.parse(localStorage.getItem(UTENTE_KEY)) || null;
    } catch {
        return null;
    }
};

/**
 * Salva (o cancella) la sessione del visitatore e avvisa i componenti con {@link module:services/api.EVENTO_SESSIONE}.
 *
 * @param {?module:tipi~SessioneUtente} sessione Token e profilo; `null` per il logout.
 * @returns {void}
 */
export const setSessioneUtente = (sessione) => {
    try {
        if (sessione) localStorage.setItem(UTENTE_KEY, JSON.stringify(sessione));
        else localStorage.removeItem(UTENTE_KEY);
    } catch {
        /* localStorage non disponibile */
    }
    // avvisa i componenti (es. l'header) che la sessione è cambiata
    window.dispatchEvent(new Event(EVENTO_SESSIONE));
};

/**
 * Indica se una richiesta deve usare il token del visitatore invece di quello dell'admin.
 *
 * Usano il token del visitatore: le rotte `/api/utenti/me...`, la prenotazione, il modulo Contatti
 * e l'invio di un feedback. Tutte le altre richieste usano il token dell'amministratore.
 *
 * @param {AxiosRequestConfig} config Configurazione della richiesta axios.
 * @returns {boolean} `true` se la richiesta appartiene al visitatore.
 */
export const richiestaDelVisitatore = (config) => {
    const url = config.url || '';
    const metodo = (config.method || 'get').toLowerCase();
    return (
        url.startsWith('/api/utenti/me') ||
        url === '/api/prenota' ||
        url === '/api/contatti' ||
        (url === '/api/feedback' && metodo === 'post')
    );
};

/**
 * Istanza axios con l'indirizzo base del backend: i servizi scrivono solo il percorso (es. `/api/mostre`).
 *
 * Prima di ogni richiesta aggiunge l'header `Authorization` con il token giusto; se il server
 * risponde 401 (token scaduto o non valido) chiude la sessione corrispondente.
 *
 * @type {AxiosInstance}
 */
export const api = axios.create({ baseURL: API_URL });

// Prima di ogni richiesta: aggiunge l'header Authorization con il token giusto (visitatore o admin)
api.interceptors.request.use((config) => {
    const token = richiestaDelVisitatore(config) ? getSessioneUtente()?.token : getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Dopo ogni risposta: se il server risponde 401 (token scaduto o non valido) chiude la sessione
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (error.config && richiestaDelVisitatore(error.config)) {
                // token del visitatore scaduto o non valido: lo scollego
                if (getSessioneUtente()) setSessioneUtente(null);
            } else if (getToken()) {
                // token dell'admin scaduto: logout e ritorno alla pagina di login dell'area riservata
                setToken(null);
                if (window.location.pathname.startsWith('/admin')) window.location.assign('/admin');
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Trasforma un percorso salvato nel database in un indirizzo completo.
 *
 * @example
 * imageUrl('/static/uploads/foto.webp'); // 'https://museo-digitale-pw.onrender.com/static/uploads/foto.webp'
 * imageUrl('https://esempio.it/a.jpg'); // invariato
 *
 * @param {string} percorso Percorso relativo (`/static/uploads/...`) o indirizzo completo.
 * @returns {string} Indirizzo completo dell'immagine, oppure `''` se il percorso è vuoto.
 */
export const imageUrl = (percorso) => {
    const p = (percorso || '').trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

/**
 * Trasforma il campo `immagini` di una mostra (percorsi separati da virgola) in un array di URL completi.
 *
 * @param {string} immagini Percorsi separati da virgola.
 * @returns {string[]} Indirizzi completi, senza elementi vuoti.
 */
export const splitImmagini = (immagini) =>
    (immagini || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(imageUrl);

/**
 * Restituisce il messaggio di errore da mostrare all'utente a partire da un errore axios.
 *
 * I messaggi del server vengono tradotti in inglese se l'utente ha scelto EN
 * (vedi {@link module:i18n/lingua.traduciServer}).
 *
 * @param {AxiosError} err Errore ricevuto da axios.
 * @param {string} [fallback] Messaggio da usare se il server non ne fornisce uno.
 * @returns {string} Messaggio leggibile.
 */
export const messaggioErrore = (err, fallback = traduci('comune.erroreGenerico')) => {
    // nessuna risposta: il server non è raggiungibile (rete assente o backend spento)
    if (!err.response) return traduci('comune.erroreRete');
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return traduciServer(detail);
    if (Array.isArray(detail)) return traduciServer(detail.map((d) => d.msg).join(' · '));
    return fallback;
};
