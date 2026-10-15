import { api, getSessioneUtente, setSessioneUtente } from './api';

// Account dei visitatori: registrazione, login, profilo e prenotazioni personali

const salvaSessione = (res) => {
    setSessioneUtente({ token: res.data.access_token, utente: res.data.utente });
    return res.data.utente;
};

export const registrazione = (dati) => api.post('/api/utenti/registrazione', dati).then(salvaSessione);

export const loginUtente = (email, password) => api.post('/api/utenti/login', { email, password }).then(salvaSessione);

export const logoutUtente = () => setSessioneUtente(null);

// visitatore collegato (o null), letto dalla sessione salvata nel browser
export const getUtente = () => getSessioneUtente()?.utente || null;

export const getMiePrenotazioni = () => api.get('/api/utenti/me/prenotazioni').then((res) => res.data);
