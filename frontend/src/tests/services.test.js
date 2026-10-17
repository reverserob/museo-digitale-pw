// Test dei servizi: ogni funzione chiama l'API giusta con i parametri giusti (axios simulato)
import { describe, it, expect, vi } from 'vitest';
import { api, getToken, setToken } from '../services/api';
import { getMostre, getMostra, creaMostra, aggiornaMostra, eliminaMostra } from '../services/mostreService';
import { prenota, getPrenotazioni } from '../services/prenotazioniService';
import { login, logout, isLoggedIn } from '../services/authService';
import { inviaFeedback, getFeedback, eliminaFeedback } from '../services/feedbackService';
import { getStatistiche } from '../services/statisticheService';
import {
    registrazione,
    loginUtente,
    logoutUtente,
    getUtente,
    getMiePrenotazioni,
    annullaPrenotazione,
    passwordDimenticata,
    reimpostaPassword,
} from '../services/utentiService';
import { collegaUtente } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// ogni chiamata finta risponde come axios: { data: ... }
const risponde = (metodo, data) => api[metodo].mockResolvedValue({ data });

describe('mostreService', () => {
    it('getMostre chiama GET /api/mostre e restituisce i dati', async () => {
        risponde('get', [{ id: 1 }]);
        expect(await getMostre()).toEqual([{ id: 1 }]);
        expect(api.get).toHaveBeenCalledWith('/api/mostre');
    });

    it('getMostra chiama GET /api/mostre/:id', async () => {
        risponde('get', { id: 3 });
        expect(await getMostra(3)).toEqual({ id: 3 });
        expect(api.get).toHaveBeenCalledWith('/api/mostre/3');
    });

    it('creaMostra, aggiornaMostra ed eliminaMostra usano POST, PUT e DELETE', async () => {
        const formData = new FormData();
        risponde('post', { id: 5 });
        risponde('put', { id: 5 });
        risponde('delete', { message: 'ok' });

        await creaMostra(formData);
        await aggiornaMostra(5, formData);
        await eliminaMostra(5);

        expect(api.post).toHaveBeenCalledWith('/api/mostre', formData);
        expect(api.put).toHaveBeenCalledWith('/api/mostre/5', formData);
        expect(api.delete).toHaveBeenCalledWith('/api/mostre/5');
    });

    it('gli errori del backend arrivano al componente', async () => {
        api.get.mockRejectedValue({ response: { status: 404 } });
        await expect(getMostra(999)).rejects.toEqual({ response: { status: 404 } });
    });
});

describe('prenotazioniService', () => {
    it('prenota invia i dati a POST /api/prenota', async () => {
        risponde('post', { message: 'ok' });
        const dati = { mostra_id: 1, nome: 'Mario' };
        await prenota(dati);
        expect(api.post).toHaveBeenCalledWith('/api/prenota', dati);
    });

    it('getPrenotazioni filtra per mostra solo se indicata', async () => {
        risponde('get', []);
        await getPrenotazioni();
        await getPrenotazioni(2);
        expect(api.get).toHaveBeenNthCalledWith(1, '/api/prenotazioni', { params: {} });
        expect(api.get).toHaveBeenNthCalledWith(2, '/api/prenotazioni', { params: { mostra_id: 2 } });
    });
});

describe('authService', () => {
    it('login salva il token ricevuto dal backend', async () => {
        risponde('post', { access_token: 'token-123' });
        await login('admin@museo.it', 'password');
        expect(api.post).toHaveBeenCalledWith('/api/login', { email: 'admin@museo.it', password: 'password' });
        expect(getToken()).toBe('token-123');
        expect(isLoggedIn()).toBe(true);
    });

    it('login fallito non salva nessun token', async () => {
        api.post.mockRejectedValue({ response: { status: 401 } });
        await expect(login('admin@museo.it', 'sbagliata')).rejects.toBeTruthy();
        expect(isLoggedIn()).toBe(false);
    });

    it('logout cancella il token', () => {
        setToken('token-123');
        logout();
        expect(isLoggedIn()).toBe(false);
    });
});

describe('feedbackService e statisticheService', () => {
    it('inviaFeedback, getFeedback ed eliminaFeedback chiamano le rotte giuste', async () => {
        risponde('post', { id: 1 });
        risponde('get', []);
        risponde('delete', { message: 'ok' });
        const dati = { mostra_id: 1, nome: 'Giulia', voto: 5 };

        await inviaFeedback(dati);
        await getFeedback();
        await getFeedback(3);
        await eliminaFeedback(1);

        expect(api.post).toHaveBeenCalledWith('/api/feedback', dati);
        expect(api.get).toHaveBeenNthCalledWith(1, '/api/feedback', { params: {} });
        expect(api.get).toHaveBeenNthCalledWith(2, '/api/feedback', { params: { mostra_id: 3 } });
        expect(api.delete).toHaveBeenCalledWith('/api/feedback/1');
    });

    it('getStatistiche chiama GET /api/statistiche', async () => {
        risponde('get', { totale_mostre: 6 });
        expect(await getStatistiche()).toEqual({ totale_mostre: 6 });
        expect(api.get).toHaveBeenCalledWith('/api/statistiche');
    });
});

describe('utentiService', () => {
    const SESSIONE = { access_token: 'tok', utente: { id: 1, nome: 'Mario' } };

    it('registrazione e login salvano la sessione del visitatore', async () => {
        risponde('post', SESSIONE);
        expect(await registrazione({ nome: 'Mario' })).toEqual(SESSIONE.utente);
        expect(api.post).toHaveBeenCalledWith('/api/utenti/registrazione', { nome: 'Mario' });
        expect(getUtente()).toEqual(SESSIONE.utente);

        logoutUtente();
        expect(getUtente()).toBeNull();

        await loginUtente('m@test.it', 'pw');
        expect(api.post).toHaveBeenCalledWith('/api/utenti/login', { email: 'm@test.it', password: 'pw' });
        expect(getUtente()).toEqual(SESSIONE.utente);
    });

    it('getMiePrenotazioni chiama GET /api/utenti/me/prenotazioni', async () => {
        risponde('get', []);
        await getMiePrenotazioni();
        expect(api.get).toHaveBeenCalledWith('/api/utenti/me/prenotazioni');
    });

    it("il login del visitatore chiude la sessione dell'area riservata", async () => {
        setToken('token-admin');
        risponde('post', { access_token: 'tok', utente: { id: 1, nome: 'Mario' } });
        await loginUtente('m@test.it', 'Museo2026');
        expect(getToken()).toBeNull();
        expect(isLoggedIn()).toBe(false);
    });

    it('passwordDimenticata e reimpostaPassword chiamano le rotte giuste', async () => {
        risponde('post', { message: 'ok' });
        expect(await passwordDimenticata('m@test.it')).toBe('ok');
        expect(api.post).toHaveBeenCalledWith('/api/utenti/password-dimenticata', { email: 'm@test.it' });
        await reimpostaPassword('tok', 'Nuova1');
        expect(api.post).toHaveBeenCalledWith('/api/utenti/reimposta-password', { token: 'tok', password: 'Nuova1' });
    });
});

describe('authService con un visitatore collegato', () => {
    it('il login admin viene rifiutato finché il visitatore non esce', async () => {
        collegaUtente();
        await expect(login('admin@museo.it', 'admin2026')).rejects.toThrow(/esci dal tuo account/);
        expect(api.post).not.toHaveBeenCalled();
        expect(getToken()).toBeNull();
    });

    it("con un visitatore collegato l'area riservata risulta chiusa anche se c'è un token admin", () => {
        setToken('token-admin');
        collegaUtente();
        expect(isLoggedIn()).toBe(false);
        logoutUtente();
        expect(isLoggedIn()).toBe(true);
    });

    describe('annullamento', () => {
        it('annullaPrenotazione chiama DELETE /api/utenti/me/prenotazioni/:id', async () => {
            risponde('delete', { message: 'Prenotazione annullata.' });
            expect(await annullaPrenotazione(5)).toBe('Prenotazione annullata.');
            expect(api.delete).toHaveBeenCalledWith('/api/utenti/me/prenotazioni/5');
        });
    });
});
