import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import routes from '../config/routes.json';
import background from '../config/background.json';
import AppHeader from '../components/AppHeader';
import { FUTURE, collegaUtente } from './utils';
import { logoutUtente } from '../services/utentiService';

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

    it("le pagine dell'admin e quelle dei visitatori sono protette, quelle pubbliche no", () => {
        const admin = routes.filter((r) => r.protected === true).map((r) => r.path);
        const visitatori = routes.filter((r) => r.protected === 'utente').map((r) => r.path);
        expect(admin).toEqual(['/admin/nuova', '/admin/modifica/:id']);
        expect(visitatori).toEqual(['/prenota/:id', '/profilo']);
        const pubbliche = routes.filter((r) => !r.protected).map((r) => r.path);
        expect(pubbliche).toEqual(expect.arrayContaining(['/', '/esposizione/:id', '/accedi']));
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
        expect(screen.getByRole('link', { name: 'Accedi' })).toHaveAttribute('href', '/accedi');
    });

    it('con un visitatore collegato mostra il suo nome e il link alla sua area', () => {
        collegaUtente();
        render(
            <MemoryRouter future={FUTURE}>
                <AppHeader />
            </MemoryRouter>
        );
        expect(screen.getByRole('link', { name: 'Ciao, Mario' })).toHaveAttribute('href', '/profilo');
        expect(screen.queryByRole('link', { name: 'Accedi' })).not.toBeInTheDocument();
    });

    it('si aggiorna da solo quando il visitatore esce', () => {
        collegaUtente();
        render(
            <MemoryRouter future={FUTURE}>
                <AppHeader />
            </MemoryRouter>
        );
        act(() => logoutUtente());
        expect(screen.getByRole('link', { name: 'Accedi' })).toBeInTheDocument();
    });
});
