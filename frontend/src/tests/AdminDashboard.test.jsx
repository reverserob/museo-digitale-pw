import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../pages/AdminDashboard';
import { api, getToken, setToken } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const PRENOTAZIONE = {
    id: 10,
    mostra_id: 1,
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario@test.it',
    telefono: '3331234567',
    creata_il: '2026-10-14T09:00:00',
};

function rispostaDati() {
    api.get.mockImplementation((url) => Promise.resolve({ data: url === '/api/mostre' ? [MOSTRA] : [PRENOTAZIONE] }));
}

const apriDashboard = () => renderConRouter(<AdminDashboard />, { percorso: '/admin', indirizzo: '/admin' });

describe('AdminDashboard - login', () => {
    it('senza token mostra il form di login', () => {
        apriDashboard();
        expect(screen.getByText('Area Riservata - Accesso Admin')).toBeInTheDocument();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('login corretto: salva il token e carica la dashboard', async () => {
        api.post.mockResolvedValue({ data: { access_token: 'token-valido' } });
        rispostaDati();
        const user = userEvent.setup();
        apriDashboard();

        await user.type(screen.getByLabelText(/Email Amministratore/), 'admin@museo.it');
        await user.type(screen.getByLabelText(/Password/), 'admin2026');
        await user.click(screen.getByRole('button', { name: 'ACCEDI' }));

        expect(api.post).toHaveBeenCalledWith('/api/login', { email: 'admin@museo.it', password: 'admin2026' });
        expect(await screen.findByText('Dashboard Admin - Esposizioni')).toBeInTheDocument();
        expect(getToken()).toBe('token-valido');
        expect(await screen.findByText(MOSTRA.titolo)).toBeInTheDocument();
    });

    it("login errato: mostra l'errore e non salva il token", async () => {
        api.post.mockRejectedValue(erroreHttp(401, 'Credenziali errate.'));
        const user = userEvent.setup();
        apriDashboard();

        await user.type(screen.getByLabelText(/Email Amministratore/), 'admin@museo.it');
        await user.type(screen.getByLabelText(/Password/), 'sbagliata');
        await user.click(screen.getByRole('button', { name: 'ACCEDI' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Credenziali errate.');
        expect(getToken()).toBeNull();
    });
});

describe('AdminDashboard - gestione', () => {
    it('con il token mostra mostre e prenotazioni', async () => {
        setToken('token-valido');
        rispostaDati();
        const user = userEvent.setup();
        apriDashboard();

        expect(await screen.findByText(MOSTRA.titolo)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/admin/modifica/1');

        await user.click(screen.getByRole('button', { name: 'Prenotazioni (1)' }));
        expect(await screen.findByText(/Mario Rossi · mario@test.it · 3331234567/)).toBeInTheDocument();
    });

    it('elimina una mostra dopo la conferma', async () => {
        setToken('token-valido');
        rispostaDati();
        api.delete.mockResolvedValue({ data: {} });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        apriDashboard();

        await screen.findByText(MOSTRA.titolo);
        await user.click(screen.getByRole('button', { name: 'Elimina' }));

        expect(api.delete).toHaveBeenCalledWith('/api/mostre/1');
        expect(await screen.findByText('Mostra eliminata con successo!')).toBeInTheDocument();
    });

    it("non elimina nulla se l'utente annulla", async () => {
        setToken('token-valido');
        rispostaDati();
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        apriDashboard();

        await screen.findByText(MOSTRA.titolo);
        await user.click(screen.getByRole('button', { name: 'Elimina' }));
        expect(api.delete).not.toHaveBeenCalled();
    });

    it('logout: cancella il token e torna al login', async () => {
        setToken('token-valido');
        rispostaDati();
        const user = userEvent.setup();
        apriDashboard();

        await screen.findByText(MOSTRA.titolo);
        await user.click(screen.getByRole('button', { name: 'Esci' }));

        expect(getToken()).toBeNull();
        expect(within(document.body).getByText('Area Riservata - Accesso Admin')).toBeInTheDocument();
    });
});
