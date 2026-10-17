import { createTheme } from '@mui/material';

// Font moderni inclusi nel pacchetto (nessuna richiesta a servizi esterni):
// Outfit per titoli e pulsanti, Manrope per il testo
const TESTO = '"Manrope Variable", "Manrope", "Segoe UI", system-ui, sans-serif';
const TITOLI = '"Outfit Variable", "Outfit", "Segoe UI", system-ui, sans-serif';

// Tema scuro di Material UI con l'oro (#c5a059) come colore principale del museo
export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#c5a059' },
        background: { default: '#000000', paper: 'rgba(20, 20, 20, 0.75)' },
    },
    typography: {
        fontFamily: TESTO,
        h1: { fontFamily: TITOLI, fontWeight: 600, letterSpacing: '-0.01em' },
        h2: { fontFamily: TITOLI, fontWeight: 600, letterSpacing: '-0.01em' },
        h3: { fontFamily: TITOLI, fontWeight: 600, letterSpacing: '0.01em' },
        h4: { fontFamily: TITOLI, fontWeight: 600, letterSpacing: '0.01em' },
        h5: { fontFamily: TITOLI, fontWeight: 500, letterSpacing: '0.01em' },
        h6: { fontFamily: TITOLI, fontWeight: 600, letterSpacing: '0.02em' },
        subtitle1: { fontFamily: TITOLI, fontWeight: 500 },
        button: { fontFamily: TITOLI, fontWeight: 600, letterSpacing: '0.08em' },
        overline: { fontFamily: TITOLI, letterSpacing: '0.15em' },
    },
    shape: { borderRadius: 8 }, // arrotondamento predefinito di card, campi e pulsanti
});
