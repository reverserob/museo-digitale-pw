import axios from 'axios';
import { traduci, traduciServer } from '../i18n/lingua';

// backend address
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_URL = (
    import.meta.env.VITE_API_URL || (isLocal ? 'http://127.0.0.1:8000' : 'https://museo-digitale-pw.onrender.com')
).replace(/\/$/, '');

const TOKEN_KEY = 'admin_token';
export const EVENTO_SESSIONE = 'sessione-utente-cambiata';

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
    return url.startsWith('/api/utenti/me') || url === '/api/prenota' || (url === '/api/feedback' && metodo === 'post');
};

// axios instance
export const api = axios.create({ baseURL: API_URL });

// api request logic
api.interceptors.request.use((config) => {
    const token = richiestaDelVisitatore(config) ? getSessioneUtente()?.token : getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// api response logic
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (error.config && richiestaDelVisitatore(error.config)) {
                // token del visitatore scaduto o non valido: lo scollego
                if (getSessioneUtente()) setSessioneUtente(null);
            } else if (getToken()) {
                setToken(null);
                if (window.location.pathname.startsWith('/admin')) window.location.assign('/admin');
            }
        }
        return Promise.reject(error);
    }
);

// images path
export const imageUrl = (percorso) => {
    const p = (percorso || '').trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

export const splitImmagini = (immagini) =>
    (immagini || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map(imageUrl);

// api axios error message
// (i messaggi del server vengono tradotti in inglese se l'utente ha scelto EN)
export const messaggioErrore = (err, fallback = traduci('comune.erroreGenerico')) => {
    if (!err.response) return traduci('comune.erroreRete');
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return traduciServer(detail);
    if (Array.isArray(detail)) return traduciServer(detail.map((d) => d.msg).join(' · '));
    return fallback;
};
