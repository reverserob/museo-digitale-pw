import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import NotFound from '../pages/NotFound';
import { setToken } from '../services/api';
import { FUTURE } from './utils';

function apri(indirizzo) {
    return render(
        <MemoryRouter initialEntries={[indirizzo]} future={FUTURE}>
            <Routes>
                <Route path="/admin" element={<p>Pagina di login</p>} />
                <Route
                    path="/admin/nuova"
                    element={
                        <ProtectedRoute>
                            <p>Pagina riservata</p>
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('ProtectedRoute', () => {
    it('senza login rimanda alla pagina di accesso', () => {
        apri('/admin/nuova');
        expect(screen.getByText('Pagina di login')).toBeInTheDocument();
        expect(screen.queryByText('Pagina riservata')).not.toBeInTheDocument();
    });

    it('con il login mostra la pagina', () => {
        setToken('token-valido');
        apri('/admin/nuova');
        expect(screen.getByText('Pagina riservata')).toBeInTheDocument();
    });
});

describe('NotFound', () => {
    it('un indirizzo inesistente mostra la pagina 404 con il link alla home', () => {
        apri('/pagina/che/non/esiste');
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Pagina non trovata' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Torna alle esposizioni' })).toHaveAttribute('href', '/');
    });
});
