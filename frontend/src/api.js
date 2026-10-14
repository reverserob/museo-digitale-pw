import axios from 'axios';

// backend address
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_URL = (
    import.meta.env.VITE_API_URL ||
    (isLocal ? 'http://127.0.0.1:8000' : 'https://museo-digitale-pw.onrender.com')
).replace(/\/$/, '');

const TOKEN_KEY = 'admin_token';

export const getToken = () => {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setToken = (token) => {
    try {
        if (token) sessionStorage.setItem(TOKEN_KEY, token);
        else sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* sessionStorage non disponibile */ }
};

// axios instance
export const api = axios.create({ baseURL: API_URL });

// api request logic
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// api response logic
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && getToken()) {
            setToken(null);
            if (window.location.pathname.startsWith('/admin')) window.location.assign('/admin');
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
    (immagini || '').split(',').map((s) => s.trim()).filter(Boolean).map(imageUrl);

// api axios error message
export const messaggioErrore = (err, fallback = 'Si è verificato un errore. Riprova.') => {
    if (!err.response) return 'Impossibile contattare il server. Controlla la connessione.';
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(' · ');
    return fallback;
};
