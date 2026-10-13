import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, Box, CircularProgress, Alert } from '@mui/material';
import { api, messaggioErrore } from '../api';

export default function Home() {
    const [mostre, setMostre] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        api.get('/api/mostre')
            .then((response) => setMostre(response.data))
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare le esposizioni.')))
            .finally(() => setLoading(false));
    }, []);

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#ffffff', fontSize: { xs: '2rem', md: '3rem' } }}>
                    Esposizioni Correnti
                </Typography>
                <Typography variant="h6" sx={{ color: '#bbbbbb', maxWidth: '700px', mx: 'auto', mt: 2, fontWeight: 300, fontFamily: 'sans-serif' }}>
                    Scopri le nostre collezioni esclusive e prenota la tua visita.
                </Typography>
            </Box>

            {loading && <Box sx={{ textAlign: 'center' }}><CircularProgress color="primary" /></Box>}
            {errore && <Alert severity="error" sx={{ mb: 4 }}>{errore}</Alert>}
            {!loading && !errore && mostre.length === 0 && (
                <Typography textAlign="center" sx={{ color: '#bbbbbb', fontFamily: 'sans-serif' }}>
                    Nessuna esposizione in programma al momento.
                </Typography>
            )}

            <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
                {mostre.map((mostra) => (
                    <Grid key={mostra.id} size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <Card elevation={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.3)', transition: 'transform 0.3s ease', '&:hover': { transform: 'translateY(-10px)', borderColor: '#c5a059' } }}>
                            <CardContent sx={{ flexGrow: 1, p: 4 }}>
                                <Typography variant="h5" gutterBottom sx={{ color: '#c5a059' }}>{mostra.titolo}</Typography>

                                <Typography variant="caption" sx={{ color: '#e0e0e0', display: 'block', mb: 2, fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
                                    📅 Dal {mostra.data_inizio} al {mostra.data_fine}
                                </Typography>

                                {/* Testo tagliato a 75 caratteri per mantenere le card della stessa altezza */}
                                <Typography variant="body1" sx={{ color: '#cccccc', mt: 1, mb: 3, lineHeight: 1.7, fontFamily: 'sans-serif' }}>
                                    {mostra.descrizione.length > 75 ? `${mostra.descrizione.substring(0, 75)}...` : mostra.descrizione}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ p: 3, pt: 0, display: 'flex', gap: 2 }}>
                                <Button component={Link} to={`/esposizione/${mostra.id}`} variant="text" color="primary" fullWidth sx={{ letterSpacing: 1 }}>
                                    SCOPRI DI PIÙ
                                </Button>
                                <Button component={Link} to={`/prenota/${mostra.id}`} variant="outlined" color="primary" fullWidth sx={{ borderRadius: 0, borderWidth: 2, letterSpacing: 1 }}>
                                    PRENOTA
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}
