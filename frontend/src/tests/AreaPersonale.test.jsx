// Test dell'area personale del visitatore: elenco e annullamento delle prenotazioni
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AreaPersonale from '../pages/AreaPersonale';
import { api, getSessioneUtente } from '../services/api';
import { renderConRouter, collegaUtente, FUTURE } from './utils';

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

    it("dopo la registrazione conferma che è stata inviata l'email", async () => {
        collegaUtente();
        api.get.mockResolvedValue({ data: [] });
        render(
            <MemoryRouter initialEntries={[{ pathname: '/profilo', state: { registrato: true } }]} future={FUTURE}>
                <Routes>
                    <Route path="/profilo" element={<AreaPersonale />} />
                </Routes>
            </MemoryRouter>
        );
        expect(
            screen.getByText(/Registrazione completata! Ti abbiamo inviato un'email di conferma/)
        ).toBeInTheDocument();
        expect(await screen.findByText(/Non hai ancora prenotato/)).toBeInTheDocument();
    });

    it("annulla una prenotazione dopo la conferma e mostra il messaggio dell'email", async () => {
        collegaUtente();
        api.get.mockResolvedValue({
            data: [
                {
                    id: 3,
                    mostra_id: 1,
                    titolo_mostra: 'Caravaggio e il suo tempo',
                    data_inizio: '2026-10-10',
                    data_fine: '2027-01-15',
                    creata_il: '2026-10-15T09:00:00',
                },
            ],
        });
        api.delete.mockResolvedValue({
            data: { message: "Prenotazione annullata. Ti abbiamo inviato un'email di conferma." },
        });
        const conferma = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const user = userEvent.setup();
        apri();

        await user.click(
            await screen.findByRole('button', { name: 'Annulla la prenotazione di Caravaggio e il suo tempo' })
        );
        expect(conferma).toHaveBeenCalledWith(expect.stringContaining('Caravaggio e il suo tempo'));
        expect(api.delete).toHaveBeenCalledWith('/api/utenti/me/prenotazioni/3');
        expect(await screen.findByText(/Prenotazione annullata/)).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Caravaggio e il suo tempo' })).not.toBeInTheDocument();
    });

    it("se l'utente non conferma la prenotazione non viene annullata", async () => {
        collegaUtente();
        api.get.mockResolvedValue({
            data: [
                {
                    id: 3,
                    mostra_id: 1,
                    titolo_mostra: 'Monet',
                    data_inizio: 'a',
                    data_fine: 'b',
                    creata_il: '2026-10-15T09:00:00',
                },
            ],
        });
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        apri();
        await user.click(await screen.findByRole('button', { name: 'Annulla la prenotazione di Monet' }));
        expect(api.delete).not.toHaveBeenCalled();
    });
});

describe('AreaPersonale: codice e QR code', () => {
    const PRENOTAZIONE = {
        id: 1,
        mostra_id: 4,
        titolo_mostra: 'Monet: La Natura',
        data_inizio: '2026-12-01',
        data_fine: '2027-04-30',
        creata_il: '2026-10-15T09:00:00',
        codice: 'MCD-7K3F-9QXA',
        ingresso_il: null,
    };

    it('mostra il codice e apre il QR code su richiesta', async () => {
        collegaUtente();
        api.get.mockResolvedValue({ data: [PRENOTAZIONE] });
        const user = userEvent.setup();
        apri();

        expect(await screen.findByText('Codice: MCD-7K3F-9QXA')).toBeInTheDocument();
        expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Mostra QR code' }));
        expect(screen.getByRole('img', { name: 'QR code della prenotazione MCD-7K3F-9QXA' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Nascondi QR code' }));
        expect(screen.queryByRole('img', { name: /QR code/ })).not.toBeInTheDocument();
    });

    it("dopo l'ingresso non si può più annullare la prenotazione", async () => {
        collegaUtente();
        api.get.mockResolvedValue({ data: [{ ...PRENOTAZIONE, ingresso_il: '2026-12-05T10:30:00' }] });
        apri();

        expect(await screen.findByText(/Ingresso effettuato il/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Annulla la prenotazione/ })).not.toBeInTheDocument();
    });
});
