import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminForm from '../pages/AdminForm';
import { api, setToken } from '../services/api';
import { renderConRouter, MOSTRA } from './utils';

// vi.mock viene eseguito prima degli import: le chiamate HTTP di axios diventano
// funzioni finte (vi.fn), il resto di services/api.js resta quello vero
vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const apriNuova = () => renderConRouter(<AdminForm />, { percorso: '/admin/nuova', indirizzo: '/admin/nuova' });
const apriModifica = () =>
    renderConRouter(<AdminForm />, { percorso: '/admin/modifica/:id', indirizzo: '/admin/modifica/1' });

function campiData() {
    const [inizio, fine] = document.querySelectorAll('input[type="date"]');
    return { inizio, fine };
}

describe('AdminForm', () => {
    beforeEach(() => setToken('token-valido'));

    it('segnala la data di fine precedente a quella di inizio', () => {
        apriNuova();
        const { inizio, fine } = campiData();
        fireEvent.change(inizio, { target: { value: '2027-03-10' } });
        fireEvent.change(fine, { target: { value: '2027-03-01' } });

        expect(screen.getByText('Deve essere successiva alla data di inizio')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'PUBBLICA MOSTRA' })).toBeDisabled();
    });

    it('crea una nuova mostra inviando i dati e le immagini', async () => {
        api.post.mockResolvedValue({ data: { id: 5 } });
        const user = userEvent.setup();
        const { container } = apriNuova();

        const [titolo, descrizione] = screen.getAllByRole('textbox');
        await user.type(titolo, 'Mostra di prova');
        await user.type(descrizione, 'Descrizione della mostra di prova');
        const { inizio, fine } = campiData();
        fireEvent.change(inizio, { target: { value: '2027-03-01' } });
        fireEvent.change(fine, { target: { value: '2027-06-30' } });

        const pulsante = screen.getByRole('button', { name: 'PUBBLICA MOSTRA' });
        expect(pulsante).toBeDisabled(); // manca ancora l'immagine

        const foto = new File(['contenuto'], 'foto.png', { type: 'image/png' });
        await user.upload(container.querySelector('input[type="file"]'), foto);
        expect(screen.getByText('1 file selezionati.')).toBeInTheDocument();

        await user.click(pulsante);

        expect(api.post).toHaveBeenCalledTimes(1);
        const [url, formData] = api.post.mock.calls[0];
        expect(url).toBe('/api/mostre');
        expect(formData.get('titolo')).toBe('Mostra di prova');
        expect(formData.get('data_fine')).toBe('2027-06-30');
        expect(formData.get('immagini').name).toBe('foto.png');
        expect(await screen.findByText('Nuova mostra pubblicata con successo!')).toBeInTheDocument();
    });

    it('in modifica carica i dati della mostra e salva senza nuove immagini', async () => {
        api.get.mockResolvedValue({ data: MOSTRA });
        api.put.mockResolvedValue({ data: MOSTRA });
        const user = userEvent.setup();
        apriModifica();

        expect(await screen.findByDisplayValue(MOSTRA.titolo)).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/mostre/1');

        const pulsante = screen.getByRole('button', { name: 'SALVA MODIFICHE' });
        expect(pulsante).toBeEnabled();
        await user.click(pulsante);

        const [url, formData] = api.put.mock.calls[0];
        expect(url).toBe('/api/mostre/1');
        expect(formData.get('immagini')).toBeNull();
        expect(await screen.findByText('Mostra modificata con successo!')).toBeInTheDocument();
    });
});
