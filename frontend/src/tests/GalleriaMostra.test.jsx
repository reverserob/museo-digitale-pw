import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GalleriaMostra from '../pages/GalleriaMostra';
import { api, API_URL, setToken } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA, collegaUtente } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// GET /api/mostre/1 restituisce la mostra, GET /api/feedback i feedback indicati,
// GET /api/utenti/me/prenotazioni le prenotazioni del visitatore collegato
function rispostaMostra(feedback, mostra = MOSTRA, miePrenotazioni = [], mieiFeedback = []) {
    api.get.mockImplementation((url) => {
        if (url === '/api/feedback') return Promise.resolve({ data: feedback });
        if (url === '/api/utenti/me/prenotazioni') return Promise.resolve({ data: miePrenotazioni });
        if (url === '/api/utenti/me/feedback') return Promise.resolve({ data: mieiFeedback });
        return Promise.resolve({ data: mostra });
    });
}

const PRENOTATO = [{ id: 1, mostra_id: 1, titolo_mostra: MOSTRA.titolo }];

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

    it("senza login mostra l'invito ad accedere invece del form", async () => {
        rispostaMostra([], IN_CORSO);
        apriPagina();

        expect(await screen.findByText(/Accedi o registrati per lasciare un feedback/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Accedi' })).toHaveAttribute('href', '/accedi?next=%2Fesposizione%2F1');
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });

    it('il visitatore collegato invia un feedback che compare in cima alla lista', async () => {
        collegaUtente();
        rispostaMostra([], IN_CORSO, PRENOTATO);
        api.post.mockResolvedValue({
            data: {
                id: 9,
                mostra_id: 1,
                nome: 'Mario R.',
                voto: 3,
                commento: 'Carina',
                creato_il: '2026-10-15T08:00:00',
            },
        });
        const user = userEvent.setup();
        apriPagina();

        expect(await screen.findByText('Il feedback sarà pubblicato come Mario R.')).toBeInTheDocument();
        // il componente Rating di MUI reagisce al click diretto sul radio (userEvent in jsdom non lo seleziona)
        fireEvent.click(screen.getByRole('radio', { name: '3 Stars' }));
        await user.type(screen.getByLabelText(/Commento/), 'Carina');
        await user.click(screen.getByRole('button', { name: 'Invia feedback' }));

        expect(api.post).toHaveBeenCalledWith('/api/feedback', { mostra_id: 1, voto: 3, commento: 'Carina' });
        expect(await screen.findByText('Grazie! Il tuo feedback è stato pubblicato.')).toBeInTheDocument();
        expect(screen.getByText('Carina')).toBeInTheDocument();
        // un solo feedback per mostra: dopo l'invio il form sparisce
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });

    it('se il visitatore ha già lasciato un feedback su questa mostra il form non compare', async () => {
        collegaUtente();
        rispostaMostra(FEEDBACK, IN_CORSO, PRENOTATO, [{ id: 1, mostra_id: 1, voto: 5 }]);
        apriPagina();

        expect(await screen.findByText(/Hai già lasciato il tuo feedback su questa mostra/)).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/utenti/me/feedback');
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });

    it('senza voto non invia nulla', async () => {
        collegaUtente();
        rispostaMostra([], IN_CORSO, PRENOTATO);
        const user = userEvent.setup();
        apriPagina();

        await user.click(await screen.findByRole('button', { name: 'Invia feedback' }));
        expect(screen.getByText('Seleziona un voto da 1 a 5 stelle.')).toBeInTheDocument();
        expect(api.post).not.toHaveBeenCalled();
    });

    it("mostra l'errore restituito dal backend (feedback già lasciato)", async () => {
        collegaUtente();
        rispostaMostra([], IN_CORSO, PRENOTATO);
        api.post.mockRejectedValue(erroreHttp(409, 'Hai già lasciato un feedback su questa mostra.'));
        const user = userEvent.setup();
        apriPagina();

        fireEvent.click(await screen.findByRole('radio', { name: '5 Stars' }));
        await user.click(screen.getByRole('button', { name: 'Invia feedback' }));
        expect(await screen.findByText('Hai già lasciato un feedback su questa mostra.')).toBeInTheDocument();
    });

    it('il visitatore non prenotato a questa mostra non vede il form', async () => {
        collegaUtente();
        rispostaMostra([], IN_CORSO, [{ id: 5, mostra_id: 2, titolo_mostra: 'Altra mostra' }]);
        apriPagina();

        expect(
            await screen.findByText('Puoi lasciare un feedback solo sulle mostre a cui ti sei prenotato.')
        ).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/utenti/me/prenotazioni');
        expect(screen.getByRole('link', { name: 'Prenota' })).toHaveAttribute('href', '/prenota/1');
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });

    it('per una mostra non ancora iniziata il form non compare', async () => {
        rispostaMostra([], { ...MOSTRA, data_inizio: '2099-01-01', data_fine: '2099-12-31' });
        apriPagina();

        expect(await screen.findByText(/potrai lasciare un feedback dopo la visita/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });
});

describe('GalleriaMostra - area admin', () => {
    const FEEDBACK = [
        { id: 3, mostra_id: 1, nome: 'Giulia', voto: 5, commento: 'Splendida', creato_il: '2026-10-01T10:00:00' },
    ];

    it('un visitatore non vede i comandi di gestione', async () => {
        rispostaMostra(FEEDBACK);
        apriPagina();

        expect(await screen.findByText('Splendida')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Gestione mostra' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument();
    });

    it('il visitatore collegato non vede il pulsante per eliminare i feedback', async () => {
        collegaUtente();
        rispostaMostra(FEEDBACK, MOSTRA, PRENOTATO);
        apriPagina();

        expect(await screen.findByText('Splendida')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Elimina/ })).not.toBeInTheDocument();
    });

    it("l'admin vede Modifica ed Elimina, i feedback con il pulsante per eliminarli e nessun PRENOTA", async () => {
        setToken('token-valido');
        rispostaMostra(FEEDBACK);
        apriPagina();

        const gestione = await screen.findByRole('region', { name: 'Gestione mostra' });
        expect(gestione).toHaveTextContent('Modifica');
        expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/admin/modifica/1');
        expect(await screen.findByText('Splendida')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Elimina il feedback di Giulia' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'PRENOTA' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Invia feedback' })).not.toBeInTheDocument();
    });

    it("l'admin elimina un feedback dalla pagina della mostra", async () => {
        setToken('token-valido');
        rispostaMostra(FEEDBACK);
        api.delete.mockResolvedValue({ data: {} });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        apriPagina();

        await user.click(await screen.findByRole('button', { name: 'Elimina il feedback di Giulia' }));
        expect(api.delete).toHaveBeenCalledWith('/api/feedback/3');
        expect(screen.queryByText('Splendida')).not.toBeInTheDocument();
    });

    it('con un visitatore collegato i comandi admin non compaiono anche se è rimasto il token admin', async () => {
        setToken('token-valido');
        collegaUtente();
        rispostaMostra(FEEDBACK, MOSTRA, PRENOTATO);
        apriPagina();

        expect(await screen.findByText('Splendida')).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Gestione mostra' })).not.toBeInTheDocument();
    });

    it("l'admin elimina la mostra e torna alla dashboard", async () => {
        setToken('token-valido');
        rispostaMostra([]);
        api.delete.mockResolvedValue({ data: {} });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        apriPagina();

        const gestione = await screen.findByRole('region', { name: 'Gestione mostra' });
        await user.click(within(gestione).getByRole('button', { name: 'Elimina' }));
        expect(api.delete).toHaveBeenCalledWith('/api/mostre/1');
        expect(await screen.findByText('Pagina Admin')).toBeInTheDocument();
    });
});
