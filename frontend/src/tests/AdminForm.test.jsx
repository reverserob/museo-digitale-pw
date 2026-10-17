// Test del form admin di creazione e modifica delle mostre (campi, immagini, invio multipart)
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
        expect(screen.getByText('1 immagine selezionata')).toBeInTheDocument();

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
        // le immagini attuali vengono tutte mantenute
        expect(JSON.parse(formData.get('immagini_esistenti'))).toEqual([
            '/static/uploads/caravaggio.webp',
            '/static/uploads/dettaglio.webp',
        ]);
        expect(await screen.findByText('Mostra modificata con successo!')).toBeInTheDocument();
    });

    it('le immagini scelte in più volte si sommano e si possono rimuovere', async () => {
        api.post.mockResolvedValue({ data: { id: 6 } });
        const user = userEvent.setup();
        const { container } = apriNuova();
        const input = () => container.querySelector('input[type="file"]');

        const [titolo, descrizione] = screen.getAllByRole('textbox');
        await user.type(titolo, 'Mostra con più foto');
        await user.type(descrizione, 'Descrizione della mostra con più foto');
        const { inizio, fine } = campiData();
        fireEvent.change(inizio, { target: { value: '2027-03-01' } });
        fireEvent.change(fine, { target: { value: '2027-06-30' } });

        const uno = new File(['a'], 'uno.png', { type: 'image/png' });
        const due = new File(['bb'], 'due.png', { type: 'image/png' });
        const tre = new File(['ccc'], 'tre.png', { type: 'image/png' });

        await user.upload(input(), uno); // prima selezione
        await user.upload(input(), [due, tre]); // seconda selezione con due file insieme
        await user.upload(input(), uno); // lo stesso file non viene aggiunto due volte
        expect(screen.getByText('3 immagini selezionate')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Rimuovi due.png' }));
        expect(screen.getByText('2 immagini selezionate')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'PUBBLICA MOSTRA' }));
        const formData = api.post.mock.calls[0][1];
        expect(formData.getAll('immagini').map((f) => f.name)).toEqual(['uno.png', 'tre.png']);
    });

    it('in modifica mostra le immagini attuali, permette di toglierne e di aggiungerne', async () => {
        api.get.mockResolvedValue({ data: MOSTRA });
        api.put.mockResolvedValue({ data: MOSTRA });
        const user = userEvent.setup();
        const { container } = apriModifica();

        expect(await screen.findByText('2 immagini selezionate')).toBeInTheDocument();
        expect(screen.getByAltText('caravaggio.webp')).toHaveAttribute(
            'src',
            expect.stringContaining('/static/uploads/caravaggio.webp')
        );

        await user.click(screen.getByRole('button', { name: 'Rimuovi caravaggio.webp' }));
        await user.upload(
            container.querySelector('input[type="file"]'),
            new File(['x'], 'nuova.png', { type: 'image/png' })
        );
        expect(screen.getByText('2 immagini selezionate')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'SALVA MODIFICHE' }));
        const formData = api.put.mock.calls[0][1];
        expect(JSON.parse(formData.get('immagini_esistenti'))).toEqual(['/static/uploads/dettaglio.webp']);
        expect(formData.getAll('immagini').map((f) => f.name)).toEqual(['nuova.png']);
    });

    it('in modifica non si può salvare togliendo tutte le immagini', async () => {
        api.get.mockResolvedValue({ data: MOSTRA });
        const user = userEvent.setup();
        apriModifica();

        await user.click(await screen.findByRole('button', { name: 'Rimuovi caravaggio.webp' }));
        await user.click(screen.getByRole('button', { name: 'Rimuovi dettaglio.webp' }));

        expect(screen.getByText("La mostra deve avere almeno un'immagine.")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'SALVA MODIFICHE' })).toBeDisabled();
    });
});
