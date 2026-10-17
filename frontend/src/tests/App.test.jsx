// Test di avvio dell'applicazione completa (header, footer e pagina iniziale)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';

vi.mock('../services/api', async (importOriginal) => ({
    ...(await importOriginal()),
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function apriApp(indirizzo) {
    window.history.pushState({}, '', indirizzo);
    api.get.mockResolvedValue({ data: [] });
    return render(<App />);
}

describe('App', () => {
    it("mostra header, home di presentazione e footer all'indirizzo principale", async () => {
        apriApp('/');
        expect(screen.getByRole('link', { name: 'MUSEO CIVICO DIGITALE' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Museo Civico Digitale' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Scopri le esposizioni correnti/ })[0]).toHaveAttribute(
            'href',
            '/esposizioni'
        );
        expect(screen.getByRole('contentinfo')).toHaveTextContent('Dal lunedì al sabato');
    });

    it("il catalogo delle mostre è all'indirizzo /esposizioni", async () => {
        apriApp('/esposizioni');
        expect(await screen.findByText('Esposizioni Correnti')).toBeInTheDocument();
    });

    it('carica le pagine "lazy" quando servono (pagina 404)', async () => {
        apriApp('/indirizzo/inesistente');
        expect(await screen.findByText('Pagina non trovata')).toBeInTheDocument();
    });

    it("carica la pagina lazy dell'area riservata", async () => {
        apriApp('/admin');
        expect(await screen.findByText('Area Riservata - Accesso Admin')).toBeInTheDocument();
    });

    it("le pagine protette senza login rimandano all'accesso", async () => {
        apriApp('/admin/nuova');
        expect(await screen.findByText('Area Riservata - Accesso Admin')).toBeInTheDocument();
        expect(window.location.pathname).toBe('/admin');
    });

    it('la prenotazione senza login rimanda ad Accedi', async () => {
        apriApp('/prenota/1');
        expect(await screen.findByRole('tab', { name: 'Registrati' })).toBeInTheDocument();
        expect(window.location.pathname).toBe('/accedi');
        expect(window.location.search).toBe('?next=%2Fprenota%2F1');
    });
});
