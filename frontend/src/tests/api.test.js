// Test del client HTTP: indirizzo del backend, token, intercettori, immagini e messaggi di errore
import { describe, it, expect } from 'vitest';
import {
    API_URL,
    api,
    getToken,
    setToken,
    imageUrl,
    splitImmagini,
    messaggioErrore,
    richiestaDelVisitatore,
    getSessioneUtente,
    setSessioneUtente,
} from '../services/api';

describe('services/api - immagini', () => {
    it("aggiunge l'indirizzo del backend ai percorsi relativi", () => {
        expect(imageUrl('/static/uploads/a.webp')).toBe(`${API_URL}/static/uploads/a.webp`);
        expect(imageUrl('static/uploads/a.webp')).toBe(`${API_URL}/static/uploads/a.webp`);
    });

    it('lascia invariati gli indirizzi completi', () => {
        expect(imageUrl('https://esempio.it/foto.jpg')).toBe('https://esempio.it/foto.jpg');
    });

    it('restituisce stringa vuota se il percorso manca', () => {
        expect(imageUrl('')).toBe('');
        expect(imageUrl(null)).toBe('');
    });

    it('divide la stringa delle immagini separate da virgola', () => {
        const risultato = splitImmagini('/static/uploads/a.webp, /static/uploads/b.webp,');
        expect(risultato).toEqual([`${API_URL}/static/uploads/a.webp`, `${API_URL}/static/uploads/b.webp`]);
        expect(splitImmagini('')).toEqual([]);
        expect(splitImmagini(undefined)).toEqual([]);
    });
});

describe('services/api - messaggi di errore', () => {
    it('server non raggiungibile', () => {
        expect(messaggioErrore({})).toMatch(/Impossibile contattare il server/);
    });

    it('usa il messaggio "detail" inviato dal backend', () => {
        expect(messaggioErrore({ response: { data: { detail: 'Mostra non trovata' } } })).toBe('Mostra non trovata');
    });

    it('unisce gli errori se "detail" è una lista', () => {
        const err = { response: { data: { detail: [{ msg: 'campo A' }, { msg: 'campo B' }] } } };
        expect(messaggioErrore(err)).toBe('campo A · campo B');
    });

    it('usa il testo di riserva se il backend non manda dettagli', () => {
        expect(messaggioErrore({ response: { data: {} } }, 'Errore generico')).toBe('Errore generico');
    });
});

describe('services/api - token', () => {
    it('salva, legge e cancella il token', () => {
        expect(getToken()).toBeNull();
        setToken('abc.123');
        expect(getToken()).toBe('abc.123');
        setToken(null);
        expect(getToken()).toBeNull();
    });

    it("aggiunge l'header Authorization solo se c'è il token", () => {
        const aggiungiToken = api.interceptors.request.handlers[0].fulfilled;

        expect(aggiungiToken({ headers: {} }).headers.Authorization).toBeUndefined();

        setToken('abc.123');
        expect(aggiungiToken({ headers: {} }).headers.Authorization).toBe('Bearer abc.123');
    });

    it('cancella il token se il backend risponde 401', async () => {
        const gestisciErrore = api.interceptors.response.handlers[0].rejected;
        setToken('scaduto');
        await expect(gestisciErrore({ response: { status: 401 } })).rejects.toBeTruthy();
        expect(getToken()).toBeNull();
    });
});

describe('token giusto per ogni chiamata', () => {
    it('le chiamate del visitatore usano il suo token, le altre quello admin', () => {
        expect(richiestaDelVisitatore({ url: '/api/prenota', method: 'post' })).toBe(true);
        expect(richiestaDelVisitatore({ url: '/api/feedback', method: 'post' })).toBe(true);
        expect(richiestaDelVisitatore({ url: '/api/contatti', method: 'post' })).toBe(true);
        expect(richiestaDelVisitatore({ url: '/api/utenti/me/prenotazioni', method: 'get' })).toBe(true);
        expect(richiestaDelVisitatore({ url: '/api/feedback', method: 'get' })).toBe(false);
        expect(richiestaDelVisitatore({ url: '/api/prenotazioni', method: 'get' })).toBe(false);
        // la gestione utenti dell'amministratore usa il token dell'admin, il profilo quello del visitatore
        expect(richiestaDelVisitatore({ url: '/api/utenti', method: 'get' })).toBe(false);
        expect(richiestaDelVisitatore({ url: '/api/utenti/3', method: 'delete' })).toBe(false);
        expect(richiestaDelVisitatore({ url: '/api/utenti/me', method: 'delete' })).toBe(true);
        expect(richiestaDelVisitatore({ url: '/api/feedback/3', method: 'delete' })).toBe(false);
        expect(richiestaDelVisitatore({ url: '/api/utenti/login', method: 'post' })).toBe(false);
    });

    it('la sessione del visitatore si salva e si cancella', () => {
        setSessioneUtente({ token: 't', utente: { nome: 'Mario' } });
        expect(getSessioneUtente()).toEqual({ token: 't', utente: { nome: 'Mario' } });
        setSessioneUtente(null);
        expect(getSessioneUtente()).toBeNull();
    });
});
