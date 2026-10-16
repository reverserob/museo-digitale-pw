import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contatti from '../pages/Contatti';
import { api, setToken } from '../services/api';
import { setLingua } from '../i18n/lingua';
import { renderConRouter, erroreHttp, collegaUtente } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const apri = () => renderConRouter(<Contatti />, { percorso: '/contatti', indirizzo: '/contatti' });
const MESSAGGIO = "Richiesta inviata. Ti risponderemo all'indirizzo email indicato.";

async function compila(user, { titolo = 'Visite per scuole', descrizione = 'Organizzate visite per le classi?' } = {}) {
    await user.type(screen.getByLabelText(/^Titolo/), titolo);
    await user.type(screen.getByLabelText(/^Descrizione/), descrizione);
}

describe('Contatti', () => {
    it("senza account il modulo non compare e c'è l'invito ad accedere", () => {
        apri();
        expect(screen.getByText(/riservato agli utenti registrati/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Accedi' })).toHaveAttribute('href', '/accedi?next=%2Fcontatti');
        expect(screen.queryByRole('form', { name: 'Modulo contatti' })).not.toBeInTheDocument();
    });

    it("l'amministratore non può usare il modulo", () => {
        setToken('token-admin');
        apri();
        expect(screen.getByText('Il modulo Contatti è riservato ai visitatori registrati.')).toBeInTheDocument();
        expect(screen.queryByRole('form', { name: 'Modulo contatti' })).not.toBeInTheDocument();
    });

    it('il visitatore collegato trova i suoi dati già inseriti e invia la richiesta', async () => {
        collegaUtente();
        api.post.mockResolvedValue({ data: { message: MESSAGGIO } });
        const user = userEvent.setup();
        apri();

        expect(screen.getByRole('form', { name: 'Modulo contatti' })).toBeInTheDocument();
        expect(screen.getByLabelText(/^Nome/)).toHaveValue('Mario');
        expect(screen.getByLabelText(/^Cognome/)).toHaveValue('Rossi');
        expect(screen.getByLabelText(/^Email/)).toHaveValue('mario@test.it');
        expect(screen.getByLabelText(/^Telefono/)).toHaveValue('3331234567');

        const pulsante = screen.getByRole('button', { name: 'INVIA RICHIESTA' });
        expect(pulsante).toBeDisabled();
        await compila(user);
        await user.click(pulsante);

        expect(api.post).toHaveBeenCalledWith('/api/contatti', {
            titolo: 'Visite per scuole',
            descrizione: 'Organizzate visite per le classi?',
            nome: 'Mario',
            cognome: 'Rossi',
            email: 'mario@test.it',
            telefono: '3331234567',
        });
        expect(await screen.findByText(MESSAGGIO)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: "Scrivi un'altra richiesta" }));
        expect(screen.getByLabelText(/^Titolo/)).toHaveValue('');
    });

    it("controlla i campi prima di permettere l'invio", async () => {
        collegaUtente();
        const user = userEvent.setup();
        apri();
        await compila(user, { titolo: 'Ok', descrizione: 'Breve' });
        expect(screen.getByText('Almeno 3 caratteri')).toBeInTheDocument();
        expect(screen.getByText('Almeno 10 caratteri')).toBeInTheDocument();

        await user.clear(screen.getByLabelText(/^Email/));
        await user.type(screen.getByLabelText(/^Email/), 'mario@');
        expect(screen.getByText('Inserisci un indirizzo email valido')).toBeInTheDocument();
        await user.clear(screen.getByLabelText(/^Telefono/));
        await user.type(screen.getByLabelText(/^Telefono/), '12ab');
        expect(screen.getByText('Solo cifre, da 6 a 15')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'INVIA RICHIESTA' })).toBeDisabled();
    });

    it("mostra l'errore del server", async () => {
        collegaUtente();
        api.post.mockRejectedValue(
            erroreHttp(503, 'Al momento non è possibile inviare la richiesta. Riprova più tardi.')
        );
        const user = userEvent.setup();
        apri();
        await compila(user);
        await user.click(screen.getByRole('button', { name: 'INVIA RICHIESTA' }));
        expect(await screen.findByText(/Riprova più tardi/)).toBeInTheDocument();
    });

    it('in inglese', () => {
        setLingua('en');
        collegaUtente();
        apri();
        expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'SEND REQUEST' })).toBeInTheDocument();
    });
});
