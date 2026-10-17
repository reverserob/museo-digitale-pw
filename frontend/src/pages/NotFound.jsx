import { Link } from 'react-router-dom';
import { Container, Typography, Button } from '@mui/material';
import useLingua from '../hooks/useLingua';

// Pagina 404: mostrata per gli indirizzi che non corrispondono a nessuna pagina (path "*" in routes.json)
export default function NotFound() {
    const { t } = useLingua();
    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 8, md: 15 }, textAlign: 'center' }}>
            <Typography variant="h1" sx={{ color: '#c5a059', fontWeight: 700, fontSize: { xs: '5rem', md: '7rem' } }}>
                404
            </Typography>
            <Typography variant="h5" component="h1" sx={{ color: '#ffffff', mb: 2 }}>
                {t('notfound.titolo')}
            </Typography>
            <Typography sx={{ color: '#bbbbbb', mb: 5 }}>{t('notfound.testo')}</Typography>
            <Button
                component={Link}
                to="/esposizioni"
                variant="outlined"
                color="primary"
                sx={{ borderRadius: 0, borderWidth: 2, letterSpacing: 1 }}
            >
                {t('comune.tornaEsposizioni')}
            </Button>
        </Container>
    );
}
