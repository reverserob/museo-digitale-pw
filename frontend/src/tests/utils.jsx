// Funzioni di supporto condivise dai test (router finto e sessione simulata)
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { setSessioneUtente } from '../services/api';

// attiva già il comportamento di React Router v7 (evita gli avvisi nei test)
export const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

// Monta un componente dentro un router "finto", partendo dall'indirizzo indicato.
// Le altre rotte mostrano solo un testo, così si può verificare dove porta un redirect.
export function renderConRouter(elemento, { percorso = '/', indirizzo = '/' } = {}) {
    return render(
        <MemoryRouter initialEntries={[indirizzo]} future={FUTURE}>
            <Routes>
                <Route path={percorso} element={elemento} />
                <Route path="/" element={<p>Pagina Home</p>} />
                <Route path="/admin" element={<p>Pagina Admin</p>} />
                <Route path="/accedi" element={<p>Pagina Accedi</p>} />
                <Route path="/profilo" element={<p>Pagina Profilo</p>} />
            </Routes>
        </MemoryRouter>
    );
}

// errore come quelli restituiti da axios quando il backend risponde con un errore
export function erroreHttp(status, detail) {
    return { response: { status, data: { detail } } };
}

export const MOSTRA = {
    id: 1,
    titolo: 'Caravaggio e il suo tempo',
    descrizione: 'Un viaggio tra luce e ombra nelle opere milanesi del maestro.',
    immagini: '/static/uploads/caravaggio.webp,/static/uploads/dettaglio.webp',
    data_inizio: '2026-10-10',
    data_fine: '2027-01-15',
};

export const UTENTE = { id: 7, nome: 'Mario', cognome: 'Rossi', email: 'mario@test.it', telefono: '3331234567' };

// simula un visitatore che ha già fatto il login
export function collegaUtente(utente = UTENTE) {
    setSessioneUtente({ token: 'token-utente', utente });
}
