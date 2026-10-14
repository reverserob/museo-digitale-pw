import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Home from '../pages/Home';
import { api } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('Home', () => {
    it("mostra l'elenco delle mostre con i link", async () => {
        api.get.mockResolvedValue({ data: [MOSTRA, { ...MOSTRA, id: 2, titolo: 'Monet: La Natura' }] });
        renderConRouter(<Home />);

        expect(await screen.findByText('Caravaggio e il suo tempo')).toBeInTheDocument();
        expect(screen.getByText('Monet: La Natura')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/mostre');

        const prenota = screen.getAllByRole('link', { name: 'PRENOTA' });
        expect(prenota[0]).toHaveAttribute('href', '/prenota/1');
        expect(screen.getAllByRole('link', { name: 'SCOPRI DI PIÙ' })[1]).toHaveAttribute('href', '/esposizione/2');
    });

    it('taglia le descrizioni più lunghe di 75 caratteri', async () => {
        const lunga = 'a'.repeat(100);
        api.get.mockResolvedValue({ data: [{ ...MOSTRA, descrizione: lunga }] });
        renderConRouter(<Home />);

        expect(await screen.findByText(`${'a'.repeat(75)}...`)).toBeInTheDocument();
    });

    it('mostra un messaggio se non ci sono mostre', async () => {
        api.get.mockResolvedValue({ data: [] });
        renderConRouter(<Home />);

        expect(await screen.findByText(/Nessuna esposizione in programma/)).toBeInTheDocument();
    });

    it("mostra l'errore se il caricamento fallisce", async () => {
        api.get.mockRejectedValue(erroreHttp(500, 'Errore nel recupero delle mostre dal database.'));
        renderConRouter(<Home />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Errore nel recupero delle mostre');
    });
});
