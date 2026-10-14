import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import routes from '../config/routes.json';
import background from '../config/background.json';
import AppHeader from '../components/AppHeader';
import { FUTURE } from './utils';

describe('configurazione', () => {
    it('ogni rotta di routes.json punta a una pagina esistente', () => {
        // elenco dei file in src/pages (funzione di Vite)
        const pagine = Object.keys(import.meta.glob('../pages/*.jsx')).map((f) =>
            f.split('/').pop().replace('.jsx', '')
        );
        for (const route of routes) {
            expect(pagine, `rotta ${route.path}`).toContain(route.component);
        }
    });

    it("le pagine di modifica dell'admin sono protette, quelle pubbliche no", () => {
        const protette = routes.filter((r) => r.protected).map((r) => r.path);
        expect(protette).toEqual(['/admin/nuova', '/admin/modifica/:id']);
    });

    it("l'ultima rotta è quella della pagina 404", () => {
        expect(routes.at(-1)).toEqual({ path: '*', component: 'NotFound' });
    });

    it('non ci sono rotte duplicate', () => {
        const percorsi = routes.map((r) => r.path);
        expect(new Set(percorsi).size).toBe(percorsi.length);
    });

    it('background.json contiene immagine e sfumatura', () => {
        expect(background.image).toBeTruthy();
        expect(background.overlay).toMatch(/gradient/);
    });
});

describe('AppHeader', () => {
    it("contiene i link alla home e all'area riservata", () => {
        render(
            <MemoryRouter future={FUTURE}>
                <AppHeader />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: 'MUSEO CIVICO DIGITALE' })).toHaveAttribute('href', '/');
        expect(screen.getByRole('link', { name: 'Area Riservata' })).toHaveAttribute('href', '/admin');
    });
});
