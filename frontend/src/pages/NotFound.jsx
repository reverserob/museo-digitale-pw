import { Link } from 'react-router-dom';
import { Container, Typography, Button } from '@mui/material';

export default function NotFound() {
    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 8, md: 15 }, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ color: '#c5a059', fontWeight: 700, fontSize: { xs: '5rem', md: '7rem' } }}>
                404
            </Typography>
            <Typography variant="h5" component="h1" sx={{ color: '#ffffff', mb: 2 }}>
                Pagina non trovata
            </Typography>
            <Typography sx={{ color: '#bbbbbb', mb: 5, fontFamily: 'sans-serif' }}>
                La pagina che cerchi non esiste o è stata spostata.
            </Typography>
            <Button
                component={Link}
                to="/"
                variant="outlined"
                color="primary"
                sx={{ borderRadius: 0, borderWidth: 2, letterSpacing: 1 }}
            >
                Torna alle esposizioni
            </Button>
        </Container>
    );
}
