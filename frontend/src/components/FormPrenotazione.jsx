import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid, CircularProgress } from '@mui/material';

export default function FormPrenotazione() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostra] = useState(null);

    const [nome, setNome] = useState('');
    const [cognome, setCognome] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');

    const [loading, setLoading] = useState(false); // Stato per il loader
    const [successo, setSuccesso] = useState(false);

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/mostre/${id}`)
            .then(res => setMostra(res.data))
            .catch(err => console.error(err));
    }, [id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true); // Attiva il loader all'invio

        const formData = new FormData();
        formData.append('mostra_id', id);
        formData.append('nome', nome);
        formData.append('cognome', cognome);
        formData.append('email', email);
        formData.append('telefono', telefono);

        axios.post('http://127.0.0.1:8000/api/prenota', formData)
            .then(() => {
                setLoading(false); // Disattiva il loader
                setSuccesso(true);  // Mostra il messaggio di successo
            })
            .catch(err => {
                setLoading(false);
                console.error("Errore prenotazione:", err);
            });
    };

    const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

    if (!mostra) return null;

    return (
        <Container maxWidth="md" sx={{ mt: 10, mb: 10 }}>
            <Button onClick={() => navigate(`/esposizione/${id}`)} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna ai dettagli della mostra
            </Button>

            <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: 4 }}>
                <CardContent>
                    <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 4 }}>
                        Prenotazione: {mostra.titolo}
                    </Typography>

                    {successo ? (
                        <Box sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(76, 175, 80, 0.15)', border: '1px solid #4caf50', borderRadius: 1 }}>
                            <Typography variant="h6" sx={{ color: '#81c784', fontWeight: 'bold', mb: 2 }}>
                                Prenotazione confermata con successo!
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#ffffff', mb: 3, fontFamily: 'sans-serif' }}>
                                Abbiamo inviato un'email di riepilogo all'indirizzo <b>{email}</b> con tutti i dettagli dell'esposizione.
                            </Typography>
                            <Button onClick={() => navigate('/')} variant="contained" color="primary" sx={{ borderRadius: 0, fontWeight: 'bold' }}>
                                Torna alla Home
                            </Button>
                        </Box>
                    ) : (
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sx={{minWidth: '250px'}}>
                                    <TextField fullWidth label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required sx={inputStyle} disabled={loading} />
                                </Grid>
                                <Grid item xs={12} sx={{minWidth: '250px'}}>
                                    <TextField fullWidth label="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} required sx={inputStyle} disabled={loading} />
                                </Grid>
                                <Grid item xs={12} sx={{minWidth: '250px'}}>
                                    <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required sx={inputStyle} disabled={loading} />
                                </Grid>
                                <Grid item xs={12} sx={{minWidth: '250px'}}>
                                    <TextField fullWidth label="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} required sx={inputStyle} disabled={loading} />
                                </Grid>
                            </Grid>

                            <Box display="flex" justifyContent="flex-end" alignItems="center" mt={3} gap={2}>
                                {/* Loader visibile solo durante l'invio */}
                                {loading && (
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <CircularProgress size={24} sx={{ color: '#c5a059' }} />
                                        <Typography variant="body2" sx={{ color: '#c5a059', fontFamily: 'sans-serif' }}>
                                            Invio email di conferma in corso...
                                        </Typography>
                                    </Box>
                                )}

                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    disabled={loading}
                                    sx={{ borderRadius: 0, py: 1.5, px: 6, fontWeight: 'bold', letterSpacing: 1 }}
                                >
                                    {loading ? 'Attendere...' : 'PRENOTA'}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
