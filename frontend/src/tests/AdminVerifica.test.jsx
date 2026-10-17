// Test della pagina di verifica delle prenotazioni all'ingresso (area riservata)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminVerifica from '../pages/AdminVerifica';
import { api, setToken } from '../services/api';
import { renderConRouter, erroreHttp } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const VERIFICA = {
    id: 12,
    codice: 'MCD-7K3F-9QXA',
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario@test.it',
    telefono: '3331234567',
    creata_il: '2026-10-15T09:00:00',
    ingresso_il: null,
    mostra_id: 1,
    titolo_mostra: 'Caravaggio e il suo tempo',
    data_inizio: '2026-10-10',
    data_fine: '2027-01-15',
    stato: 'valida',
};

const apri = (indirizzo = '/admin/verifica') =>
    renderConRouter(<AdminVerifica />, { percorso: '/admin/verifica', indirizzo });

describe('AdminVerifica', () => {
    beforeEach(() => setToken('token-admin'));

    it('verifica una prenotazione dal codice inserito', async () => {
        api.get.mockResolvedValue({ data: VERIFICA });
        const user = userEvent.setup();
        apri();

        await user.type(screen.getByLabelText('Codice o numero della prenotazione'), ' mcd-7k3f-9qxa ');
        await user.click(screen.getByRole('button', { name: 'Verifica' }));

        expect(api.get).toHaveBeenCalledWith('/api/prenotazioni/verifica/mcd-7k3f-9qxa');
        expect(await screen.findByText('Prenotazione valida: il visitatore può entrare.')).toBeInTheDocument();
        expect(screen.getByText('Mario Rossi')).toBeInTheDocument();
        expect(screen.getByText(/Caravaggio e il suo tempo/)).toBeInTheDocument();
    });

    it("aperta dal QR code verifica subito il codice nell'indirizzo", async () => {
        api.get.mockResolvedValue({ data: VERIFICA });
        apri('/admin/verifica?codice=MCD-7K3F-9QXA');

        expect(api.get).toHaveBeenCalledWith('/api/prenotazioni/verifica/MCD-7K3F-9QXA');
        expect(await screen.findByText('Mario Rossi')).toBeInTheDocument();
        expect(screen.getByLabelText('Codice o numero della prenotazione')).toHaveValue('MCD-7K3F-9QXA');
    });

    it("registra l'ingresso e non permette di registrarlo di nuovo", async () => {
        api.get.mockResolvedValue({ data: VERIFICA });
        api.post.mockResolvedValue({ data: { ...VERIFICA, stato: 'gia_entrato', ingresso_il: '2026-11-02T10:00:00' } });
        const user = userEvent.setup();
        apri('/admin/verifica?codice=MCD-7K3F-9QXA');

        await user.click(await screen.findByRole('button', { name: 'Registra ingresso' }));
        expect(api.post).toHaveBeenCalledWith('/api/prenotazioni/verifica/MCD-7K3F-9QXA/ingresso');
        expect(await screen.findByText('Ingresso registrato per Mario Rossi.')).toBeInTheDocument();
        expect(screen.getByText(/Ingresso già registrato/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Registra ingresso' })).not.toBeInTheDocument();
    });

    it.each([
        ['non_iniziata', 'La mostra non è ancora iniziata.'],
        ['conclusa', 'La mostra è già conclusa.'],
    ])('stato %s: avviso e nessun pulsante di ingresso', async (stato, testo) => {
        api.get.mockResolvedValue({ data: { ...VERIFICA, stato } });
        apri('/admin/verifica?codice=MCD-7K3F-9QXA');
        expect(await screen.findByText(testo)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Registra ingresso' })).not.toBeInTheDocument();
    });

    it('codice inesistente: mostra il messaggio del backend', async () => {
        api.get.mockRejectedValue(erroreHttp(404, 'Nessuna prenotazione trovata con questo codice.'));
        apri('/admin/verifica?codice=MCD-AAAA-AAAA');
        expect(await screen.findByText('Nessuna prenotazione trovata con questo codice.')).toBeInTheDocument();
    });
});
