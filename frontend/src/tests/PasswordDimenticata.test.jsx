// Test delle pagine Password dimenticata e Reimposta password
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordDimenticata from '../pages/PasswordDimenticata';
import ReimpostaPassword from '../pages/ReimpostaPassword';
import { api } from '../services/api';
import { renderConRouter, erroreHttp } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const MESSAGGIO = "Se l'email è registrata riceverai a breve un link per reimpostare la password.";

describe('PasswordDimenticata', () => {
    it("invia l'email e mostra il messaggio del server", async () => {
        api.post.mockResolvedValue({ data: { message: MESSAGGIO } });
        const user = userEvent.setup();
        renderConRouter(<PasswordDimenticata />, {
            percorso: '/password-dimenticata',
            indirizzo: '/password-dimenticata',
        });

        const pulsante = screen.getByRole('button', { name: 'INVIA IL LINK' });
        expect(pulsante).toBeDisabled();
        await user.type(screen.getByLabelText(/Email/), ' mario@test.it ');
        await user.click(pulsante);

        expect(api.post).toHaveBeenCalledWith('/api/utenti/password-dimenticata', { email: 'mario@test.it' });
        expect(await screen.findByText(MESSAGGIO)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'INVIA IL LINK' })).not.toBeInTheDocument();
    });
});

describe('ReimpostaPassword', () => {
    const apri = (indirizzo = '/reimposta-password?token=abc.def') =>
        renderConRouter(<ReimpostaPassword />, { percorso: '/reimposta-password', indirizzo });

    it('senza token nel link mostra un errore', () => {
        apri('/reimposta-password');
        expect(screen.getByText(/Link non valido/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'richiedine uno nuovo' })).toHaveAttribute(
            'href',
            '/password-dimenticata'
        );
    });

    it('applica la regola della password e invia token e nuova password', async () => {
        api.post.mockResolvedValue({
            data: { message: 'Password aggiornata. Ora puoi accedere con la nuova password.' },
        });
        const user = userEvent.setup();
        apri();

        const pulsante = screen.getByRole('button', { name: 'SALVA LA NUOVA PASSWORD' });
        await user.type(screen.getByLabelText(/Nuova password/), 'nuova');
        expect(screen.getByText('Serve: almeno 6 caratteri, una lettera maiuscola, un numero')).toBeInTheDocument();
        await user.clear(screen.getByLabelText(/Nuova password/));
        await user.type(screen.getByLabelText(/Nuova password/), 'Nuova1');
        await user.type(screen.getByLabelText(/Conferma password/), 'Nuova2');
        expect(screen.getByText('Le password non coincidono')).toBeInTheDocument();
        expect(pulsante).toBeDisabled();

        await user.clear(screen.getByLabelText(/Conferma password/));
        await user.type(screen.getByLabelText(/Conferma password/), 'Nuova1');
        await user.click(pulsante);

        expect(api.post).toHaveBeenCalledWith('/api/utenti/reimposta-password', {
            token: 'abc.def',
            password: 'Nuova1',
        });
        expect(await screen.findByText(/Password aggiornata/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: "Vai all'accesso" })).toHaveAttribute('href', '/accedi');
    });

    it('link scaduto: mostra il messaggio del server e il link per richiederne uno nuovo', async () => {
        api.post.mockRejectedValue(erroreHttp(400, 'Il link non è valido o è scaduto. Richiedi un nuovo link.'));
        const user = userEvent.setup();
        apri();

        await user.type(screen.getByLabelText(/Nuova password/), 'Nuova1');
        await user.type(screen.getByLabelText(/Conferma password/), 'Nuova1');
        await user.click(screen.getByRole('button', { name: 'SALVA LA NUOVA PASSWORD' }));

        expect(await screen.findByText(/Il link non è valido o è scaduto/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Richiedi un nuovo link' })).toBeInTheDocument();
    });
});
