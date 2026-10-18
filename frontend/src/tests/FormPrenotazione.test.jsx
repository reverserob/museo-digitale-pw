// Test del form di prenotazione: dati dall'account, telefono, prenotazione unica
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormPrenotazione from '../pages/FormPrenotazione';
import { api } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA, collegaUtente } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// GET /api/mostre/1 -> la mostra; GET /api/utenti/me/prenotazioni -> le prenotazioni del visitatore
function risposte(miePrenotazioni = []) {
    api.get.mockImplementation((url) =>
        Promise.resolve({ data: url === '/api/utenti/me/prenotazioni' ? miePrenotazioni : MOSTRA })
    );
}

async function apriForm() {
    risposte();
    renderConRouter(<FormPrenotazione />, { percorso: '/prenota/:id', indirizzo: '/prenota/1' });
    await screen.findByText(`Prenotazione: ${MOSTRA.titolo}`);
    return { telefono: screen.getByLabelText('Telefono'), pulsante: screen.getByRole('button', { name: 'PRENOTA' }) };
}

describe('FormPrenotazione', () => {
    beforeEach(() => {
        collegaUtente();
        api.post.mockResolvedValue({ data: { message: 'ok' } });
    });

    it("mostra i dati dell'account senza permettere di modificarli", async () => {
        await apriForm();
        expect(screen.getByLabelText('Nome')).toHaveValue('Mario');
        expect(screen.getByLabelText('Cognome')).toHaveValue('Rossi');
        expect(screen.getByLabelText('Email')).toHaveValue('mario@test.it');
        expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    });

    it("propone il telefono dell'account e controlla quello inserito", async () => {
        const user = userEvent.setup();
        const { telefono, pulsante } = await apriForm();
        expect(telefono).toHaveValue('3331234567');
        expect(pulsante).toBeEnabled();

        await user.clear(telefono);
        await user.type(telefono, '12ab');
        expect(screen.getByText('Solo cifre, da 6 a 15')).toBeInTheDocument();
        expect(pulsante).toBeDisabled();
    });

    it("invia la prenotazione e mostra la conferma con l'email del visitatore", async () => {
        const user = userEvent.setup();
        const { telefono, pulsante } = await apriForm();
        await user.clear(telefono);
        await user.type(telefono, ' 0612345678 ');
        await user.click(pulsante);

        expect(api.post).toHaveBeenCalledWith('/api/prenota', { mostra_id: 1, telefono: '0612345678' });
        expect(await screen.findByText('Prenotazione confermata con successo!')).toBeInTheDocument();
        expect(screen.getByText(/mario@test\.it/)).toBeInTheDocument();
    });

    it('dopo la prenotazione mostra il codice di riferimento e il QR code', async () => {
        api.post.mockResolvedValue({ data: { message: 'ok', id: 9, codice: 'MCD-7K3F-9QXA' } });
        const user = userEvent.setup();
        const { pulsante } = await apriForm();
        await user.click(pulsante);

        expect(await screen.findByTestId('codice-prenotazione')).toHaveTextContent('MCD-7K3F-9QXA');
        const qr = screen.getByRole('img', { name: 'QR code della prenotazione MCD-7K3F-9QXA' });
        expect(qr.getAttribute('src')).toMatch(/\/api\/prenotazioni\/qr\/MCD-7K3F-9QXA$/);
    });

    it("mostra l'errore restituito dal backend", async () => {
        api.post.mockRejectedValue(erroreHttp(400, 'La mostra è già conclusa: non è più possibile prenotare.'));
        const user = userEvent.setup();
        const { pulsante } = await apriForm();
        await user.click(pulsante);

        expect(await screen.findByRole('alert')).toHaveTextContent('già conclusa');
        expect(screen.queryByText('Prenotazione confermata con successo!')).not.toBeInTheDocument();
    });

    it('se il visitatore è già prenotato non mostra il form ma il link alle sue prenotazioni', async () => {
        risposte([{ id: 4, mostra_id: 1, titolo_mostra: MOSTRA.titolo }]);
        renderConRouter(<FormPrenotazione />, { percorso: '/prenota/:id', indirizzo: '/prenota/1' });

        expect(await screen.findByText(/Ti sei già prenotato a questa mostra/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Gestisci le mie prenotazioni' })).toHaveAttribute('href', '/profilo');
        expect(screen.queryByRole('button', { name: 'PRENOTA' })).not.toBeInTheDocument();
    });

    it("mostra l'errore se la mostra non esiste", async () => {
        api.get.mockRejectedValue(erroreHttp(404, 'Mostra non trovata'));
        renderConRouter(<FormPrenotazione />, { percorso: '/prenota/:id', indirizzo: '/prenota/999' });

        expect(await screen.findByRole('alert')).toHaveTextContent('Mostra non trovata');
    });
});
