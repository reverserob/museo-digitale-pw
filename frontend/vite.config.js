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
        // copertura del codice (npm run test:coverage): stessi file inclusi ed esclusi in locale e nella CI
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{js,jsx}'],
            exclude: ['src/tests/**', 'src/main.jsx'],
            reporter: ['text-summary', 'html', 'json-summary'],
            reportsDirectory: './coverage',
            thresholds: { lines: 90 },
        },
    },
});
