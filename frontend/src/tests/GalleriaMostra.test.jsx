import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleriaMostra from '../pages/GalleriaMostra';
import { api, API_URL } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// GET /api/mostre/1 restituisce la mostra, GET /api/feedback i feedback indicati
function rispostaMostra(feedback, mostra = MOSTRA) {
    api.get.mockImplementation((url) => Promise.resolve({ data: url === '/api/feedback' ? feedback : mostra }));
}

const apriPagina = () =>
    renderConRouter(<GalleriaMostra />, { percorso: '/esposizione/:id', indirizzo: '/esposizione/1' });

describe('GalleriaMostra', () => {
    it('mostra i dettagli e le immagini della mostra', async () => {
        rispostaMostra([]);
        apriPagina();

        expect(await screen.findByRole('heading', { name: MOSTRA.titolo })).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/mostre/1');
        expect(screen.getByText('Dal 2026-10-10 al 2027-01-15')).toBeInTheDocument();

        const immagini = screen.getAllByRole('img');
        expect(immagini).toHaveLength(2);
        expect(immagini[0]).toHaveAttribute('src', `${API_URL}/static/uploads/caravaggio.webp`);
        expect(screen.getByRole('link', { name: 'PRENOTA' })).toHaveAttribute('href', '/prenota/1');
    });

    it("mostra l'errore se la mostra non esiste", async () => {
        api.get.mockRejectedValue(erroreHttp(404, 'Mostra non trovata'));
        apriPagina();

        expect(await screen.findByRole('alert')).toHaveTextContent('Mostra non trovata');
        expect(screen.getByRole('button', { name: 'Torna alle esposizioni' })).toBeInTheDocument();
    });
});

describe('GalleriaMostra - feedback', () => {
    const IN_CORSO = { ...MOSTRA, data_inizio: '2020-01-01', data_fine: '2099-12-31' };
    const FEEDBACK = [
        { id: 1, mostra_id: 1, nome: 'Giulia', voto: 5, commento: 'Splendida', creato_il: '2026-10-01T10:00:00' },
        { id: 2, mostra_id: 1, nome: 'Luca', voto: 4, commento: '', creato_il: '2026-10-02T10:00:00' },
    ];

    it('mostra media e recensioni della mostra', async () => {
        rispostaMostra(FEEDBACK, IN_CORSO);
        apriPagina();

        expect(await screen.findByText('4.5 su 5 · 2 recensioni')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/feedback', { params: { mostra_id: 1 } });
        expect(screen.getByText('Splendida')).toBeInTheDocument();
        expect(screen.getByText('Luca')).toBeInTheDocument();
    });

    it('invia un nuovo feedback e lo aggiunge in cima alla lista', async () => {
        rispostaMostra([], IN_CORSO);
        api.post.mockResolvedValue({
            data: { id: 9, mostra_id: 1, nome: 'Anna', voto: 3, commento: 'Carina', creato_il: '2026-10-15T08:00:00' },
        });
        const user = userEvent.setup();
        apriPagina();

        expect(await screen.findByText('Nessuna recensione per ora.')).toBeInTheDocument();
        // il componente Rating di MUI reagisce al click diretto sul radio (userEvent in jsdom non lo seleziona)
        fireEvent.click(screen.getByRole('radio', { name: '3 Stars' }));
        await user.type(screen.getByLabelText(/^Nome/), 'Anna');
        await user.type(screen.getByLabelText(/Commento/), 'Carina');
        await user.click(screen.getByRole('button', { name: 'Invia feedback' }));

        expect(api.post).toHaveBeenCalledWith('/api/feedback', {
            mostra_id: 1,
            nome: 'Anna',
            voto: 3,
            commento: 'Carina',
        });
        expect(await screen.findByText('Grazie! Il tuo feedback è stato pubblicato.')).toBeInTheDocument();
        expect(screen.getByText('Carina')).toBeInTheDocument();
    });

    it('senza voto non invia nulla', async () => {
        rispostaMostra([], IN_CORSO);
        const user = userEvent.setup();
        apriPagina();

        await user.type(await screen.findByLabelText(/^Nome/), 'Anna');
        await user.click(screen.getByRole('button', { name: 'Invia feedback' }));

        expect(screen.getByText('Seleziona un voto da 1 a 5 stelle.')).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it("mostra l'errore restituito dal backend", async () => {
        rispostaMostra([], IN_CORSO);
        api.post.mockRejectedValue(erroreHttp(422, 'nome: Il nome deve contenere almeno 2 caratteri.'));
        const user = userEvent.setup();
        apriPagina();

        fireEvent.click(await screen.findByRole('radio', { name: '5 Stars' }));
        await user.type(screen.getByLabelText(/^Nome/), 'A');
        await user.click(screen.getByRole('button', { name: 'Invia feedback' }));

        expect(await screen.findByText(/almeno 2 caratteri/)).toBeInTheDocument();
    });

    it('per una mostra non ancora iniziata il form non compare', async () => {
        rispostaMostra([], { ...MOSTRA, data_inizio: '2099-01-01', data_fine: '2099-12-31' });
        apriPagina();

        expect(await screen.findByText(/potrai lasciare un feedback dopo la visita/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });
});
