// Aggiunge i controlli specifici per il DOM: toBeInTheDocument, toBeDisabled, ...
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
});
