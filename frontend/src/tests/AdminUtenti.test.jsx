// Test della gestione utenti dell'area riservata (Read, Update e Delete degli account)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUtenti from '../pages/AdminUtenti';
import { api, setToken } from '../services/api';
import { renderConRouter, erroreHttp } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const UTENTI = [
    {
        id: 1,
        nome: 'Mario',
        cognome: 'Rossi',
        email: 'mario@test.it',
        telefono: '3331234567',
        creato_il: '2026-10-15T09:00:00',
        prenotazioni: 2,
        feedback: 1,
    },
    {
        id: 2,
        nome: 'Anna',
        cognome: 'Neri',
        email: 'anna@test.it',
        telefono: '3471234567',
        creato_il: '2026-10-16T09:00:00',
        prenotazioni: 0,
        feedback: 0,
    },
];

const apri = () => renderConRouter(<AdminUtenti />, { percorso: '/admin/utenti', indirizzo: '/admin/utenti' });

describe('AdminUtenti', () => {
    beforeEach(() => {
        setToken('token-admin');
        api.get.mockResolvedValue({ data: UTENTI });
    });

    it('elenca gli account con prenotazioni e feedback', async () => {
        apri();
        expect(api.get).toHaveBeenCalledWith('/api/utenti');
        const tabella = await screen.findByRole('table', { name: 'Utenti registrati' });
        expect(within(tabella).getByText('mario@test.it')).toBeInTheDocument();
        expect(within(tabella).getByText('anna@test.it')).toBeInTheDocument();
        expect(within(tabella).getAllByRole('row')).toHaveLength(3);
    });

    it('filtra gli account con la ricerca', async () => {
        const user = userEvent.setup();
        apri();
        await screen.findByText('mario@test.it');
        await user.type(screen.getByLabelText('Cerca per nome, cognome o email'), 'neri');
        expect(screen.queryByText('mario@test.it')).not.toBeInTheDocument();
        expect(screen.getByText('anna@test.it')).toBeInTheDocument();
        await user.clear(screen.getByLabelText('Cerca per nome, cognome o email'));
        await user.type(screen.getByLabelText('Cerca per nome, cognome o email'), 'zzz');
        expect(screen.getByText('Nessun utente corrisponde alla ricerca.')).toBeInTheDocument();
    });

    it('modifica i dati di un account', async () => {
        api.put.mockResolvedValue({ data: { ...UTENTI[0], cognome: 'Bianchi' } });
        const user = userEvent.setup();
        apri();
        await user.click(await screen.findByRole('button', { name: 'Modifica Mario Rossi' }));
        const cognome = screen.getByLabelText('Cognome');
        await user.clear(cognome);
        await user.type(cognome, 'Bianchi');
        await user.click(screen.getByRole('button', { name: 'Salva' }));

        expect(api.put).toHaveBeenCalledWith('/api/utenti/1', {
            nome: 'Mario',
            cognome: 'Bianchi',
            telefono: '3331234567',
        });
        expect(await screen.findByText('Dati di Mario Bianchi aggiornati.')).toBeInTheDocument();
        expect(screen.getByText('Bianchi')).toBeInTheDocument();
    });

    it('elimina un account dopo la conferma', async () => {
        api.delete.mockResolvedValue({ data: { message: 'Account eliminato.' } });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        apri();
        await user.click(await screen.findByRole('button', { name: 'Elimina Anna Neri' }));

        expect(api.delete).toHaveBeenCalledWith('/api/utenti/2');
        expect(await screen.findByText('Account di Anna Neri eliminato.')).toBeInTheDocument();
        expect(screen.queryByText('anna@test.it')).not.toBeInTheDocument();
    });

    it("senza conferma non elimina l'account", async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        apri();
        await user.click(await screen.findByRole('button', { name: 'Elimina Anna Neri' }));
        expect(api.delete).not.toHaveBeenCalled();
    });

    it("mostra l'errore se l'elenco non si carica", async () => {
        api.get.mockRejectedValue(erroreHttp(500, 'Errore del server'));
        apri();
        expect(await screen.findByText('Errore del server')).toBeInTheDocument();
    });
});
