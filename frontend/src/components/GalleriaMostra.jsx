import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Button, Box, CircularProgress, ImageList, ImageListItem, Alert } from '@mui/material';
import { api, splitImmagini, messaggioErrore } from '../services/api';

export default function GalleriaMostra() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostra] = useState(null);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        api.get(`/api/mostre/${id}`)
            .then((response) => setMostra(response.data))
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare la mostra.')));
    }, [id]);

    if (errore) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" sx={{ mb: 3 }}>{errore}</Alert>
                <Button onClick={() => navigate('/')} variant="outlined">Torna alle esposizioni</Button>
            </Container>
        );
    }
    if (!mostra) return <Box sx={{ textAlign: 'center', mt: 20 }}><CircularProgress color="primary" /></Box>;

    const immaginiGalleria = splitImmagini(mostra.immagini);

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 10 } }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alle esposizioni
            </Button>

            <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
                        <Typography variant="h3" gutterBottom sx={{ color: '#c5a059', fontSize: { xs: '2rem', md: '3rem' } }}>{mostra.titolo}</Typography>
                        <Typography variant="body1" sx={{ color: '#e0e0e0', mt: 4, mb: 2, fontSize: '1.1rem', fontFamily: 'sans-serif', lineHeight: 1.8 }}>
                            {mostra.descrizione}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#aaaaaa', mb: 6, fontFamily: 'sans-serif', lineHeight: 1.7 }}>
                            Il percorso espositivo è curato per offrire un'esperienza immersiva unica, gestita interamente tramite i sistemi digitali dell'ente.
                        </Typography>

                        <Box sx={{ p: 3, backgroundColor: 'rgba(197, 160, 89, 0.1)', borderLeft: '4px solid #c5a059', mb: 4 }}>
                            <Typography variant="subtitle2" sx={{ color: '#c5a059', textTransform: 'uppercase', letterSpacing: 2 }}>Periodo Espositivo</Typography>
                            <Typography variant="body1" sx={{ color: '#ffffff', mt: 1, fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                                Dal {mostra.data_inizio} al {mostra.data_fine}
                            </Typography>
                        </Box>

                        <Button component={Link} to={`/prenota/${mostra.id}`} variant="contained" color="primary" size="large" fullWidth sx={{ borderRadius: 0, py: 2, letterSpacing: 1.5, fontWeight: 'bold' }}>
                            PRENOTA
                        </Button>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    {immaginiGalleria.length > 0 && (
                        <ImageList variant="quilted" cols={2} gap={16}>
                            <ImageListItem cols={2} rows={2}>
                                <img src={immaginiGalleria[0]} alt={mostra.titolo} style={{ borderRadius: 8, height: '400px', objectFit: 'cover' }} />
                            </ImageListItem>
                            {immaginiGalleria.slice(1, 5).map((imgUrl, index) => (
                                <ImageListItem key={imgUrl} cols={1} rows={1}>
                                    <img src={imgUrl} alt={`${mostra.titolo} - dettaglio ${index + 1}`} style={{ borderRadius: 8, height: '250px', objectFit: 'cover' }} />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
