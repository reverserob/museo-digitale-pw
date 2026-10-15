import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AreaPersonale from '../pages/AreaPersonale';
import { api, getSessioneUtente } from '../services/api';
import { renderConRouter, collegaUtente } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const apri = () => renderConRouter(<AreaPersonale />, { percorso: '/area', indirizzo: '/area' });

describe('AreaPersonale', () => {
    it('mostra i dati del visitatore e le sue prenotazioni', async () => {
        collegaUtente();
        api.get.mockResolvedValue({
            data: [
                {
                    id: 1,
                    mostra_id: 4,
                    titolo_mostra: 'Monet: La Natura',
                    data_inizio: '2026-12-01',
                    data_fine: '2027-04-30',
                    creata_il: '2026-10-15T09:00:00',
                },
            ],
        });
        apri();

        expect(screen.getByText('Ciao, Mario')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/utenti/me/prenotazioni');
        expect(await screen.findByRole('link', { name: 'Monet: La Natura' })).toHaveAttribute('href', '/esposizione/4');
    });

    it('senza prenotazioni invita a scoprire le mostre', async () => {
        collegaUtente();
        api.get.mockResolvedValue({ data: [] });
        apri();
        expect(await screen.findByText(/Non hai ancora prenotato/)).toBeInTheDocument();
    });

    it('Esci chiude la sessione e torna alla home', async () => {
        collegaUtente();
        api.get.mockResolvedValue({ data: [] });
        const user = userEvent.setup();
        apri();
        await user.click(screen.getByRole('button', { name: 'Esci' }));
        expect(getSessioneUtente()).toBeNull();
        expect(await screen.findByText('Pagina Home')).toBeInTheDocument();
    });
});
