import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // configurazione dei test (Vitest)
    test: {
        environment: 'jsdom', // simula il browser
        setupFiles: './src/tests/setup.js',
        css: false,
    },
});
