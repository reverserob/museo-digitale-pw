import { createTheme } from '@mui/material';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#c5a059' },
        background: { default: '#000000', paper: 'rgba(20, 20, 20, 0.75)' },
    },
    typography: {
        fontFamily: '"Playfair Display", "Georgia", "Times New Roman", serif',
        h3: { fontWeight: 700, letterSpacing: '0.05em' },
        h4: { fontWeight: 600, letterSpacing: '0.03em' },
        h5: { fontWeight: 600, letterSpacing: '0.02em' },
    },
    shape: { borderRadius: 8 },
});
