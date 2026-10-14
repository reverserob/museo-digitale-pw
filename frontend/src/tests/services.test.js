import { describe, it, expect, vi } from 'vitest';
import { api, getToken, setToken } from '../services/api';
import { getMostre, getMostra, creaMostra, aggiornaMostra, eliminaMostra } from '../services/mostreService';
import { prenota, getPrenotazioni } from '../services/prenotazioniService';
import { login, logout, isLoggedIn } from '../services/authService';

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
