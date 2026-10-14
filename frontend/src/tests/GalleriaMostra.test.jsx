import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import GalleriaMostra from '../pages/GalleriaMostra';
import { api, API_URL } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const apriPagina = () =>
    renderConRouter(<GalleriaMostra />, { percorso: '/esposizione/:id', indirizzo: '/esposizione/1' });

describe('GalleriaMostra', () => {
    it('mostra i dettagli e le immagini della mostra', async () => {
        api.get.mockResolvedValue({ data: MOSTRA });
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
