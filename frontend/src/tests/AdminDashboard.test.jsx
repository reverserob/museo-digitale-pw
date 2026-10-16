import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../pages/AdminDashboard';
import { api, getToken, setToken } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA, collegaUtente } from './utils';
import { getUtente } from '../services/utentiService';

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

const FEEDBACK = {
    id: 7,
    mostra_id: 1,
    nome: 'Giulia',
    voto: 4,
    commento: 'Molto bella',
    creato_il: '2026-10-14T10:00:00',
};

const STATISTICHE = {
    totale_mostre: 1,
    mostre_in_corso: 1,
    mostre_future: 0,
    mostre_concluse: 0,
    totale_prenotazioni: 1,
    prenotazioni_ultimi_7_giorni: 1,
    totale_feedback: 1,
    voto_medio: 4,
    per_mostra: [],
};

// risposte finte del backend, una per indirizzo
function rispostaDati(statistiche = STATISTICHE) {
    const risposte = {
        '/api/mostre': [MOSTRA],
        '/api/prenotazioni': [PRENOTAZIONE],
        '/api/feedback': [FEEDBACK],
        '/api/statistiche': statistiche,
    };
    api.get.mockImplementation((url) => Promise.resolve({ data: risposte[url] }));
}

const apriDashboard = () => renderConRouter(<AdminDashboard />, { percorso: '/admin', indirizzo: '/admin' });

describe('AdminDashboard - login', () => {
    it("con un visitatore collegato chiede di uscire prima di entrare nell'area riservata", async () => {
        collegaUtente();
        const user = userEvent.setup();
        apriDashboard();

        expect(screen.getByText(/Sei collegato come visitatore \(Mario Rossi\)/)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Email Amministratore/)).not.toBeInTheDocument();
        expect(screen.queryByText('Dashboard Admin - Esposizioni')).not.toBeInTheDocument();
        expect(api.get).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: "Esci dall'account visitatore" }));
        expect(getUtente()).toBeNull();
        expect(await screen.findByText('Area Riservata - Accesso Admin')).toBeInTheDocument();
    });

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
        expect(screen.getByRole('link', { name: `Vedi la mostra ${MOSTRA.titolo}` })).toHaveAttribute(
            'href',
            '/esposizione/1'
        );

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

describe('AdminDashboard - indicatori e feedback', () => {
    it('mostra gli indicatori calcolati dal backend', async () => {
        setToken('token-valido');
        rispostaDati({
            ...STATISTICHE,
            totale_prenotazioni: 12,
            prenotazioni_ultimi_7_giorni: 5,
            mostre_future: 2,
            mostre_concluse: 3,
            voto_medio: 4.5,
            per_mostra: [
                { mostra_id: 1, titolo: 'Mostra A', stato: 'in corso', prenotazioni: 8, feedback: 2, voto_medio: 4.5 },
                { mostra_id: 2, titolo: 'Mostra B', stato: 'futura', prenotazioni: 4, feedback: 0, voto_medio: null },
            ],
        });
        apriDashboard();

        const indicatori = await screen.findByRole('region', { name: 'Indicatori' });
        expect(api.get).toHaveBeenCalledWith('/api/statistiche');
        expect(within(indicatori).getByText('12')).toBeInTheDocument();
        expect(within(indicatori).getByText('5 negli ultimi 7 giorni')).toBeInTheDocument();
        expect(within(indicatori).getByText('2 in arrivo · 3 concluse')).toBeInTheDocument();
        expect(within(indicatori).getByText('4.5')).toBeInTheDocument();
        // la barra più lunga è quella della mostra con più prenotazioni
        expect(screen.getByTestId('barra-1')).toHaveStyle({ width: '100%' });
        expect(screen.getByTestId('barra-2')).toHaveStyle({ width: '50%' });
    });

    it('senza feedback il voto medio è un trattino', async () => {
        setToken('token-valido');
        rispostaDati({ ...STATISTICHE, totale_feedback: 0, voto_medio: null });
        apriDashboard();

        const indicatori = await screen.findByRole('region', { name: 'Indicatori' });
        expect(within(indicatori).getByText('–')).toBeInTheDocument();
    });

    it('elenca i feedback di una mostra e permette di eliminarli', async () => {
        setToken('token-valido');
        rispostaDati();
        api.delete.mockResolvedValue({ data: {} });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        apriDashboard();

        await user.click(await screen.findByRole('button', { name: 'Feedback (1)' }));
        expect(await screen.findByText('★★★★ · Giulia · Molto bella')).toBeInTheDocument();

        const eliminaButtons = screen.getAllByRole('button', { name: 'Elimina' });
        await user.click(eliminaButtons[eliminaButtons.length - 1]);
        expect(api.delete).toHaveBeenCalledWith('/api/feedback/7');
    });

    it('se feedback e statistiche non rispondono mostra comunque le mostre', async () => {
        setToken('token-valido');
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        api.get.mockImplementation((url) => {
            if (url === '/api/mostre') return Promise.resolve({ data: [MOSTRA] });
            if (url === '/api/prenotazioni') return Promise.resolve({ data: [PRENOTAZIONE] });
            return Promise.reject(erroreHttp(404, 'Not Found'));
        });
        apriDashboard();

        expect(await screen.findByText(MOSTRA.titolo)).toBeInTheDocument();
        expect(screen.queryByText('Not Found')).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Indicatori' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Prenotazioni (1)' })).toBeInTheDocument();
    });
});
