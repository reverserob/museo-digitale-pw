import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import Esposizioni from '../pages/Esposizioni';
import { api, setToken } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA, collegaUtente } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('Esposizioni', () => {
    it("mostra l'elenco delle mostre con i link", async () => {
        api.get.mockResolvedValue({ data: [MOSTRA, { ...MOSTRA, id: 2, titolo: 'Monet: La Natura' }] });
        renderConRouter(<Esposizioni />);

        expect(await screen.findByText('Caravaggio e il suo tempo')).toBeInTheDocument();
        expect(screen.getByText('Monet: La Natura')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/mostre');

        const prenota = screen.getAllByRole('link', { name: 'PRENOTA' });
        expect(prenota[0]).toHaveAttribute('href', '/prenota/1');
        expect(screen.getAllByRole('link', { name: 'SCOPRI DI PIÙ' })[1]).toHaveAttribute('href', '/esposizione/2');
    });

    it("con l'admin collegato il pulsante PRENOTA non compare", async () => {
        setToken('token-admin');
        api.get.mockResolvedValue({ data: [MOSTRA] });
        renderConRouter(<Esposizioni />);

        expect(await screen.findByText('Caravaggio e il suo tempo')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'PRENOTA' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'SCOPRI DI PIÙ' })).toBeInTheDocument();
    });

    it('taglia le descrizioni più lunghe di 75 caratteri', async () => {
        const lunga = 'a'.repeat(100);
        api.get.mockResolvedValue({ data: [{ ...MOSTRA, descrizione: lunga }] });
        renderConRouter(<Esposizioni />);

        expect(await screen.findByText(`${'a'.repeat(75)}...`)).toBeInTheDocument();
    });

    it('mostra un messaggio se non ci sono mostre', async () => {
        api.get.mockResolvedValue({ data: [] });
        renderConRouter(<Esposizioni />);

        expect(await screen.findByText(/Nessuna esposizione in programma/)).toBeInTheDocument();
    });

    it("mostra l'errore se il caricamento fallisce", async () => {
        api.get.mockRejectedValue(erroreHttp(500, 'Errore nel recupero delle mostre dal database.'));
        renderConRouter(<Esposizioni />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Errore nel recupero delle mostre');
    });

    it('per il visitatore già prenotato mostra GIÀ PRENOTATO al posto di PRENOTA', async () => {
        collegaUtente();
        api.get.mockImplementation((url) =>
            Promise.resolve({
                data:
                    url === '/api/utenti/me/prenotazioni'
                        ? [{ id: 9, mostra_id: 1 }]
                        : [MOSTRA, { ...MOSTRA, id: 2, titolo: 'Monet: La Natura' }],
            })
        );
        renderConRouter(<Esposizioni />);

        expect(await screen.findByRole('link', { name: /GIÀ PRENOTATO/ })).toHaveAttribute('href', '/profilo');
        expect(screen.getAllByRole('link', { name: 'PRENOTA' })).toHaveLength(1);
        expect(screen.getByRole('link', { name: 'PRENOTA' })).toHaveAttribute('href', '/prenota/2');
    });
});
