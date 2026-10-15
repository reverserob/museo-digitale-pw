// Aggiunge i controlli specifici per il DOM: toBeInTheDocument, toBeDisabled, ...
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom non implementa gli URL temporanei usati per le anteprime delle immagini
if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:anteprima';
    URL.revokeObjectURL = () => {};
}

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
});
