import { api, getSessioneUtente, setSessioneUtente, setToken } from './api';

// Account dei visitatori: registrazione, login, profilo, prenotazioni personali e reset della password

const salvaSessione = (res) => {
    // un visitatore collegato non può restare collegato anche all'area riservata
    setToken(null);
    setSessioneUtente({ token: res.data.access_token, utente: res.data.utente });
    return res.data.utente;
};

export const registrazione = (dati) => api.post('/api/utenti/registrazione', dati).then(salvaSessione);

export const loginUtente = (email, password) => api.post('/api/utenti/login', { email, password }).then(salvaSessione);

export const logoutUtente = () => setSessioneUtente(null);

// visitatore collegato (o null), letto dalla sessione salvata nel browser
export const getUtente = () => getSessioneUtente()?.utente || null;

export const getMiePrenotazioni = () => api.get('/api/utenti/me/prenotazioni').then((res) => res.data);

// password dimenticata: il backend invia per email un link con un token valido per poco tempo
export const passwordDimenticata = (email) =>
    api.post('/api/utenti/password-dimenticata', { email }).then((res) => res.data.message);

export const reimpostaPassword = (token, password) =>
    api.post('/api/utenti/reimposta-password', { token, password }).then((res) => res.data.message);
