// Test dell'ErrorBoundary: un errore in una pagina mostra un messaggio invece della pagina bianca
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

function PaginaRotta() {
    throw new Error('dati non validi');
}

describe('ErrorBoundary', () => {
    it("mostra il messaggio d'errore invece di una pagina vuota", () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <PaginaRotta />
            </ErrorBoundary>
        );
        expect(screen.getByText(/errore durante la visualizzazione/)).toBeInTheDocument();
        expect(screen.getByText('dati non validi')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Torna alla home' })).toBeInTheDocument();
    });

    it('senza errori mostra la pagina normalmente', () => {
        render(
            <ErrorBoundary>
                <p>Contenuto</p>
            </ErrorBoundary>
        );
        expect(screen.getByText('Contenuto')).toBeInTheDocument();
    });
});
