// Rileva automaticamente se siamo in locale o in produzione (Vercel)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_URL = isLocal
    ? 'http://127.0.0.1:8000'
    : 'https://museo-digitale-backend.onrender.com'; // <--- Sostituisci con il tuo URL reale di Render quando è pronto
