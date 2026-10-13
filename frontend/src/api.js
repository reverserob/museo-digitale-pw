import axios from 'axios';

// Indirizzo del backend: si può impostare con la variabile VITE_API_URL
// (file .env in locale, pannello "Environment Variables" su Vercel).
// Se manca, si usa il backend locale in sviluppo e quello su Render in produzione.
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

// Istanza axios condivisa: aggiunge da sola il token admin quando presente
export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Se il token è scaduto o non valido lo eliminiamo e torniamo al login
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

// Le immagini nel DB sono percorsi relativi ("/static/uploads/x.webp"):
// qui anteponiamo l'indirizzo del backend. Gli URL assoluti restano invariati.
export const imageUrl = (percorso) => {
    const p = (percorso || '').trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

export const splitImmagini = (immagini) =>
    (immagini || '').split(',').map((s) => s.trim()).filter(Boolean).map(imageUrl);

// Messaggio leggibile da mostrare all'utente a partire da un errore axios
export const messaggioErrore = (err, fallback = 'Si è verificato un errore. Riprova.') => {
    if (!err.response) return 'Impossibile contattare il server. Controlla la connessione.';
    const detail = err.response.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(' · ');
    return fallback;
};
