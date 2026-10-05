import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, Box } from '@mui/material';

export default function Home() {
    const [mostre, setMostre] = useState([]);

    useEffect(() => {
        axios.get('http://127.0.0.1:8000/api/mostre')
            .then(response => setMostre(response.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <Container maxWidth="lg" sx={{ mt: 10, mb: 10 }}>
            <Box textAlign="center" mb={8}>
                <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#ffffff' }}>Esposizioni Correnti</Typography>
                <Typography variant="h6" sx={{ color: '#bbbbbb', maxWidth: '700px', mx: 'auto', fontWeight: 300, fontFamily: 'sans-serif',margin:'20px' }}>
                    Scopri le nostre collezioni esclusive e prenota la tua visita.
                </Typography>
            </Box>

            <Grid container spacing={4} alignItems="stretch">
                {mostre.map((mostra) => (
                    <Grid item key={mostra.id} xs={12} sm={6} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Card elevation={0} sx={{ flex: 1, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.3)', transition: 'transform 0.3s ease', '&:hover': { transform: 'translateY(-10px)', borderColor: '#c5a059' } ,     maxWidth:' 550px', minWidth: '550px'}}>
                            <CardContent sx={{ flexGrow: 1, p: 4 }}>
                                <Typography variant="h5" gutterBottom sx={{ color: '#c5a059' }}>{mostra.titolo}</Typography>

                                <Typography variant="caption" sx={{ color: '#e0e0e0', display: 'block', mb: 2, fontWeight: 'bold', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
                                    📅 Dal {mostra.data_inizio} al {mostra.data_fine}
                                </Typography>

                                {/* Testo tagliato a 75 caratteri per mantenere tutte le card della stessa altezza */}
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
