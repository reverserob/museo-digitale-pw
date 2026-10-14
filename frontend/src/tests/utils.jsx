import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

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
