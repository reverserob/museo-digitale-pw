import { api, getToken, setToken, getSessioneUtente } from './api';

export const MESSAGGIO_VISITATORE_COLLEGATO =
    "Sei collegato come visitatore: esci dal tuo account per accedere all'area riservata.";

// Login dell'area riservata: se le credenziali sono giuste salva il token.
// Non è permesso mentre un visitatore è collegato: prima deve fare il logout.
export const login = (email, password) => {
    if (getSessioneUtente()) return Promise.reject(new Error(MESSAGGIO_VISITATORE_COLLEGATO));
    return api.post('/api/login', { email, password }).then((res) => {
        setToken(res.data.access_token);
        return res.data;
    });
};

export const logout = () => setToken(null);

// l'area riservata è aperta solo con il token admin e nessun visitatore collegato
export const isLoggedIn = () => Boolean(getToken()) && !getSessioneUtente();
