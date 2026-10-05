import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid, CircularProgress, Alert } from '@mui/material';

export default function FormPrenotazione() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostra] = useState(null);

    const [nome, setNome] = useState('');
    const [cognome, setCognome] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');

    const [loading, setLoading] = useState(false);
    const [successo, setSuccesso] = useState(false);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/mostre/${id}`)
            .then(res => setMostra(res.data))
            .catch(err => console.error(err));
    }, [id]);

    const isNomeValid = nome.trim().length >= 3;
    const isCognomeValid = cognome.trim().length >= 3;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const isTelefonoValid = /^\d+$/.test(telefono.trim());

    const isFormValid = isNomeValid && isCognomeValid && isEmailValid && isTelefonoValid;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setLoading(true);
        setErrore('');

        const payload = {
            mostra_id: parseInt(id),
            nome: nome.trim(),
            cognome: cognome.trim(),
            email: email.trim(),
            telefono: telefono.trim()
        };

        axios.post('http://127.0.0.1:8000/api/prenota', payload)
            .then(() => {
                setLoading(false);
                setSuccesso(true);
            })
            .catch(err => {
                setLoading(false);
                console.error("Errore prenotazione:", err);
                setErrore(err.response?.data?.detail || "Errore di validazione o di rete. Controlla i dati inseriti.");
            });
    };

    const inputStyle = { input: { color: 'white' } };

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

                    {errore && (
                        <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(211, 47, 47, 0.15)', color: '#ff8a80', border: '1px solid #d32f2f' }}>
                            {errore}
                        </Alert>
                    )}

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
                                {/* Nome */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" sx={{ color: '#c5a059', mb: 1, fontWeight: 500 }}>
                                        Nome *
                                    </Typography>
                                    <TextField
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        required
                                        error={nome.length > 0 && !isNomeValid}
                                        helperText={nome.length > 0 && !isNomeValid ? "Inserisci almeno 3 caratteri" : ""}
                                        sx={inputStyle}
                                        disabled={loading}
                                    />
                                </Grid>

                                {/* Cognome */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" sx={{ color: '#c5a059', mb: 1, fontWeight: 500 }}>
                                        Cognome *
                                    </Typography>
                                    <TextField
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        value={cognome}
                                        onChange={(e) => setCognome(e.target.value)}
                                        required
                                        error={cognome.length > 0 && !isCognomeValid}
                                        helperText={cognome.length > 0 && !isCognomeValid ? "Inserisci almeno 3 caratteri" : ""}
                                        sx={inputStyle}
                                        disabled={loading}
                                    />
                                </Grid>

                                {/* Email */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" sx={{ color: '#c5a059', mb: 1, fontWeight: 500 }}>
                                        Email *
                                    </Typography>
                                    <TextField
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        error={email.length > 0 && !isEmailValid}
                                        helperText={email.length > 0 && !isEmailValid ? "Formato email non valido" : ""}
                                        sx={inputStyle}
                                        disabled={loading}
                                    />
                                </Grid>

                                {/* Telefono */}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" sx={{ color: '#c5a059', mb: 1, fontWeight: 500 }}>
                                        Telefono *
                                    </Typography>
                                    <TextField
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        required
                                        error={telefono.length > 0 && !isTelefonoValid}
                                        helperText={telefono.length > 0 && !isTelefonoValid ? "Solo cifre numeriche" : ""}
                                        sx={inputStyle}
                                        disabled={loading}
                                    />
                                </Grid>
                            </Grid>

                            <Box display="flex" justifyContent="flex-end" alignItems="center" mt={3} gap={2}>
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
                                    disabled={loading || !isFormValid}
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
