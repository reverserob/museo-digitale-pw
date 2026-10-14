import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormPrenotazione from '../pages/FormPrenotazione';
import { api } from '../services/api';
import { renderConRouter, erroreHttp, MOSTRA } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

async function apriForm() {
    api.get.mockResolvedValue({ data: MOSTRA });
    renderConRouter(<FormPrenotazione />, { percorso: '/prenota/:id', indirizzo: '/prenota/1' });
    await screen.findByText(`Prenotazione: ${MOSTRA.titolo}`);
    // i campi sono nell'ordine: nome, cognome, email, telefono
    const [nome, cognome, email, telefono] = screen.getAllByRole('textbox');
    return { nome, cognome, email, telefono, pulsante: screen.getByRole('button', { name: 'PRENOTA' }) };
}

async function compila(campi, valori) {
    const user = userEvent.setup();
    for (const [campo, valore] of Object.entries(valori)) {
        await user.clear(campi[campo]);
        if (valore) await user.type(campi[campo], valore);
    }
    return user;
}

const VALIDI = { nome: 'Mario', cognome: 'Rossi', email: 'mario@test.it', telefono: '3331234567' };

describe('FormPrenotazione', () => {
    beforeEach(() => {
        api.post.mockResolvedValue({ data: { message: 'ok' } });
    });

    it('il pulsante resta disattivato finché il form non è valido', async () => {
        const campi = await apriForm();
        expect(campi.pulsante).toBeDisabled();

        await compila(campi, { ...VALIDI, telefono: '' });
        expect(campi.pulsante).toBeDisabled();

        await compila(campi, { telefono: '3331234567' });
        expect(campi.pulsante).toBeEnabled();
    });

    it('mostra i messaggi di errore sotto i campi non validi', async () => {
        const campi = await apriForm();
        await compila(campi, { nome: 'Al', email: 'non-valida', telefono: '12ab' });

        expect(screen.getByText('Inserisci almeno 3 caratteri')).toBeInTheDocument();
        expect(screen.getByText('Formato email non valido')).toBeInTheDocument();
        expect(screen.getByText('Solo cifre, da 6 a 15')).toBeInTheDocument();
    });

    it('invia la prenotazione con i dati ripuliti e mostra la conferma', async () => {
        const campi = await apriForm();
        const user = await compila(campi, { ...VALIDI, nome: '  Mario  ' });
        await user.click(campi.pulsante);

        expect(api.post).toHaveBeenCalledWith('/api/prenota', {
            mostra_id: 1,
            nome: 'Mario',
            cognome: 'Rossi',
            email: 'mario@test.it',
            telefono: '3331234567',
        });
        expect(await screen.findByText('Prenotazione confermata con successo!')).toBeInTheDocument();
        expect(screen.getByText('mario@test.it')).toBeInTheDocument();
    });

    it("mostra l'errore restituito dal backend", async () => {
        api.post.mockRejectedValue(erroreHttp(400, 'La mostra è già conclusa: non è più possibile prenotare.'));
        const campi = await apriForm();
        const user = await compila(campi, VALIDI);
        await user.click(campi.pulsante);

        expect(await screen.findByRole('alert')).toHaveTextContent('già conclusa');
        expect(screen.queryByText('Prenotazione confermata con successo!')).not.toBeInTheDocument();
    });

    it("mostra l'errore se la mostra non esiste", async () => {
        api.get.mockRejectedValue(erroreHttp(404, 'Mostra non trovata'));
        renderConRouter(<FormPrenotazione />, { percorso: '/prenota/:id', indirizzo: '/prenota/999' });

        expect(await screen.findByRole('alert')).toHaveTextContent('Mostra non trovata');
    });
});
