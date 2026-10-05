import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Button, Box, CircularProgress, ImageList, ImageListItem } from '@mui/material';
import { API_URL } from '../../config';

export default function GalleriaMostra() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostre] = useState(null);

    useEffect(() => {
        axios.get(`${API_URL}/api/mostre/${id}`)
            .then(response => setMostre(response.data))
            .catch(error => console.error(error));
    }, [id]);

    if (!mostra) return <Box textAlign="center" mt={20}><CircularProgress color="primary" /></Box>;

    const immaginiGalleria = mostra.immagini ? mostra.immagini.split(',') : [];

    return (
        <Container maxWidth="lg" sx={{ mt: 10 }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alle esposizioni
            </Button>

            <Grid container spacing={6}>
                <Grid item xs={12} md={5}>
                    <Box sx={{ position: 'sticky', top: 100 }}>
                        <Typography variant="h3" gutterBottom sx={{ color: '#c5a059' }}>{mostra.titolo}</Typography>
                        <Typography variant="body1" sx={{ color: '#e0e0e0', mt: 4, mb: 2, fontSize: '1.1rem', fontFamily: 'sans-serif', lineHeight: 1.8 }}>
                            {mostra.descrizione}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#aaaaaa', mb: 6, fontFamily: 'sans-serif', lineHeight: 1.7 }}>
                            Il percorso espositivo è curato per offrire un'esperienza immersiva unica, gestita interamente tramite i sistemi digitali dell'ente.
                        </Typography>

                        {/* AGGIORNATO CON LE DATE DAL DATABASE */}
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

                <Grid item xs={12} md={7}>
                    {immaginiGalleria.length > 0 && (
                        <ImageList variant="quilted" cols={2} gap={16}>
                            {immaginiGalleria[0] && (
                                <ImageListItem cols={2} rows={2}>
                                    <img src={immaginiGalleria[0].trim()} alt="Mostra Main" style={{ borderRadius: 8, height: '400px', objectFit: 'cover' }} />
                                </ImageListItem>
                            )}
                            {immaginiGalleria.slice(1, 5).map((imgUrl, index) => (
                                <ImageListItem key={index} cols={1} rows={1}>
                                    <img src={imgUrl.trim()} alt={`Dettaglio ${index + 1}`} style={{ borderRadius: 8, height: '250px', objectFit: 'cover' }} />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
