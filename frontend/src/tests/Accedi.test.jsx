import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Accedi from '../pages/Accedi';
import { api, getSessioneUtente } from '../services/api';
import { FUTURE, UTENTE, collegaUtente, erroreHttp } from './utils';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function apri(indirizzo = '/accedi') {
    return render(
        <MemoryRouter initialEntries={[indirizzo]} future={FUTURE}>
            <Routes>
                <Route path="/accedi" element={<Accedi />} />
                <Route path="/profilo" element={<p>Pagina Profilo</p>} />
                <Route path="/prenota/:id" element={<p>Pagina Prenotazione</p>} />
            </Routes>
        </MemoryRouter>
    );
}

const SESSIONE = { data: { access_token: 'token-nuovo', utente: UTENTE } };

describe('Accedi', () => {
    it('login corretto: salva la sessione e torna alla pagina richiesta', async () => {
        api.post.mockResolvedValue(SESSIONE);
        const user = userEvent.setup();
        apri('/accedi?next=%2Fprenota%2F3');

        await user.type(screen.getByLabelText(/Email/), 'mario@test.it');
        await user.type(screen.getByLabelText(/Password/), 'Museo2026');
        await user.click(screen.getByRole('button', { name: 'ACCEDI' }));

        expect(api.post).toHaveBeenCalledWith('/api/utenti/login', {
            email: 'mario@test.it',
            password: 'Museo2026',
        });
        expect(await screen.findByText('Pagina Prenotazione')).toBeInTheDocument();
        expect(getSessioneUtente()).toEqual({ token: 'token-nuovo', utente: UTENTE });
    });

    it('senza pagina richiesta porta alla propria area', async () => {
        api.post.mockResolvedValue(SESSIONE);
        const user = userEvent.setup();
        apri();
        await user.type(screen.getByLabelText(/Email/), 'mario@test.it');
        await user.type(screen.getByLabelText(/Password/), 'Museo2026');
        await user.click(screen.getByRole('button', { name: 'ACCEDI' }));
        expect(await screen.findByText('Pagina Profilo')).toBeInTheDocument();
    });

    it('ignora destinazioni esterne al sito', async () => {
        api.post.mockResolvedValue(SESSIONE);
        const user = userEvent.setup();
        apri('/accedi?next=https%3A%2F%2Fsito-esterno.example');
        await user.type(screen.getByLabelText(/Email/), 'mario@test.it');
        await user.type(screen.getByLabelText(/Password/), 'Museo2026');
        await user.click(screen.getByRole('button', { name: 'ACCEDI' }));
        expect(await screen.findByText('Pagina Profilo')).toBeInTheDocument();
    });

    it("login errato: mostra l'errore e non salva nulla", async () => {
        api.post.mockRejectedValue(erroreHttp(401, 'Email o password errate.'));
        const user = userEvent.setup();
        apri();
        await user.type(screen.getByLabelText(/Email/), 'mario@test.it');
        await user.type(screen.getByLabelText(/Password/), 'sbagliata');
        await user.click(screen.getByRole('button', { name: 'ACCEDI' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Email o password errate.');
        expect(getSessioneUtente()).toBeNull();
    });

    it('registrazione: il pulsante si attiva solo con dati validi e poi collega il visitatore', async () => {
        api.post.mockResolvedValue(SESSIONE);
        const user = userEvent.setup();
        apri();
        await user.click(screen.getByRole('tab', { name: 'Registrati' }));

        const pulsante = screen.getByRole('button', { name: 'CREA ACCOUNT' });
        expect(pulsante).toBeDisabled();

        await user.type(screen.getByLabelText(/^Nome/), 'Mario');
        await user.type(screen.getByLabelText(/Cognome/), 'Rossi');
        await user.type(screen.getByLabelText(/Email/), 'mario@test.it');
        await user.type(screen.getByLabelText(/Telefono/), '3331234567');

        const password = screen.getByLabelText(/^Password/);
        await user.type(password, 'museo');
        expect(screen.getByText('Serve: almeno 6 caratteri, una lettera maiuscola, un numero')).toBeInTheDocument();
        await user.clear(password);
        await user.type(password, 'Museo2026');
        expect(screen.getByText('Password valida')).toBeInTheDocument();
        expect(pulsante).toBeDisabled(); // manca ancora la conferma

        const conferma = screen.getByLabelText(/Conferma password/);
        await user.type(conferma, 'Museo2025');
        expect(screen.getByText('Le password non coincidono')).toBeInTheDocument();
        expect(pulsante).toBeDisabled();

        await user.clear(conferma);
        await user.type(conferma, 'Museo2026');
        expect(screen.queryByText('Le password non coincidono')).not.toBeInTheDocument();
        expect(pulsante).toBeEnabled();
        await user.click(pulsante);

        // la conferma resta nel browser: al server arriva solo la password
        expect(api.post).toHaveBeenCalledWith('/api/utenti/registrazione', {
            nome: 'Mario',
            cognome: 'Rossi',
            email: 'mario@test.it',
            telefono: '3331234567',
            password: 'Museo2026',
        });
        expect(await screen.findByText('Pagina Profilo')).toBeInTheDocument();
    });

    it('registrazione con email già usata: mostra il messaggio del server', async () => {
        api.post.mockRejectedValue(erroreHttp(409, 'Esiste già un account con questa email.'));
        const user = userEvent.setup();
        apri();
        await user.click(screen.getByRole('tab', { name: 'Registrati' }));
        await user.type(screen.getByLabelText(/^Nome/), 'Mario');
        await user.type(screen.getByLabelText(/Cognome/), 'Rossi');
        await user.type(screen.getByLabelText(/Email/), 'mario@test.it');
        await user.type(screen.getByLabelText(/Telefono/), '3331234567');
        await user.type(screen.getByLabelText(/^Password/), 'Museo2026');
        await user.type(screen.getByLabelText(/Conferma password/), 'Museo2026');
        await user.click(screen.getByRole('button', { name: 'CREA ACCOUNT' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Esiste già un account');
    });

    it('se il visitatore è già collegato non mostra il form', () => {
        collegaUtente();
        apri();
        expect(screen.getByText('Sei già collegato come Mario Rossi')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'ACCEDI' })).not.toBeInTheDocument();
    });

    it("mostra un messaggio diverso per ogni errore nell'email", async () => {
        const user = userEvent.setup();
        apri();
        await user.click(screen.getByRole('tab', { name: 'Registrati' }));
        const email = screen.getByLabelText(/Email/);

        const casi = [
            ['mario rossi@test.it', "L'email non può contenere spazi"],
            ['mario.test.it', 'Manca la @ (es. nome@dominio.it)'],
            ['mario@@test.it', "L'email deve contenere una sola @"],
            ['@test.it', 'Manca la parte prima della @'],
            ['mario@', 'Manca il dominio dopo la @ (es. gmail.com)'],
            ['mario#1@test.it', "L'email contiene caratteri non ammessi"],
            ['mario..rossi@test.it', "Punti non validi nell'email"],
            ['mario@test', 'Il dominio non è valido (es. gmail.com)'],
            ['mario@test.i', 'Il dominio non è valido (es. gmail.com)'],
        ];
        for (const [valore, messaggio] of casi) {
            await user.clear(email);
            await user.type(email, valore);
            expect(screen.getByText(messaggio), valore).toBeInTheDocument();
        }

        await user.clear(email);
        await user.type(email, 'mario.rossi+museo@posta.example.it');
        expect(email).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('nome e cognome devono avere almeno 3 caratteri', async () => {
        const user = userEvent.setup();
        apri();
        await user.click(screen.getByRole('tab', { name: 'Registrati' }));

        await user.type(screen.getByLabelText(/^Nome/), 'Al');
        await user.type(screen.getByLabelText(/Cognome/), ' Ro ');
        expect(screen.getAllByText('Inserisci almeno 3 caratteri')).toHaveLength(2);

        await user.type(screen.getByLabelText(/^Nome/), 'do');
        expect(screen.getAllByText('Inserisci almeno 3 caratteri')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'CREA ACCOUNT' })).toBeDisabled();
    });

    it('nella scheda Accedi c\'è il link "Password dimenticata?"', () => {
        apri();
        expect(screen.getByRole('link', { name: 'Password dimenticata?' })).toHaveAttribute(
            'href',
            '/password-dimenticata'
        );
    });
});
