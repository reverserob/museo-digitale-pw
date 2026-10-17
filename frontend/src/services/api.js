// Client HTTP condiviso: indirizzo del backend, gestione dei token (admin e visitatore),
// intercettori axios, percorsi delle immagini e messaggi di errore leggibili.
import axios from 'axios';
import { traduci, traduciServer } from '../i18n/lingua';

// Indirizzo del backend: VITE_API_URL se impostata (es. su Vercel), altrimenti il server locale
// quando il sito gira su localhost, altrimenti il backend pubblicato su Render.
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// la barra finale viene tolta per poter scrivere sempre `${API_URL}/api/...`
export const API_URL = (
    import.meta.env.VITE_API_URL || (isLocal ? 'http://127.0.0.1:8000' : 'https://museo-digitale-pw.onrender.com')
).replace(/\/$/, '');

// Il token dell'admin sta in sessionStorage: si cancella alla chiusura della scheda (più prudente)
const TOKEN_KEY = 'admin_token';
// evento del browser lanciato a ogni login/logout, ascoltato dagli hook useAdmin e useUtente
export const EVENTO_SESSIONE = 'sessione-utente-cambiata';

// I try/catch servono perché lo storage può non essere disponibile (es. navigazione privata)
export const getToken = () => {
    try {
        return sessionStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

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

export const getSessioneUtente = () => {
    try {
        return JSON.parse(localStorage.getItem(UTENTE_KEY)) || null;
    } catch {
        return null;
    }
};

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

// Le chiamate del visitatore usano il suo token, tutte le altre quello dell'admin
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

// Istanza axios con l'indirizzo base: i servizi scrivono solo il percorso (es. '/api/mostre')
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

// Trasforma un percorso salvato nel database (/static/uploads/...) in un indirizzo completo;
// gli indirizzi che iniziano già con http(s) restano invariati.
export const imageUrl = (percorso) => {
    const p = (percorso || '').trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

// Nel database le immagini sono una stringa separata da virgole: la trasformo in un array di URL
export const splitImmagini = (immagini) =>
    (immagini || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(imageUrl);

// Messaggio di errore da mostrare all'utente a partire da un errore axios
// (i messaggi del server vengono tradotti in inglese se l'utente ha scelto EN)
export const messaggioErrore = (err, fallback = traduci('comune.erroreGenerico')) => {
    // nessuna risposta: il server non è raggiungibile (rete assente o backend spento)
    if (!err.response) return traduci('comune.erroreRete');
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return traduciServer(detail);
    if (Array.isArray(detail)) return traduciServer(detail.map((d) => d.msg).join(' · '));
    return fallback;
};
