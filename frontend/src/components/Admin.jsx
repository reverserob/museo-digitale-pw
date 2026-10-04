import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid } from '@mui/material';

export default function Admin() {
    const navigate = useNavigate();

    // Stato per il Login
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erroreLogin, setErroreLogin] = useState(false);

    // Stato per il Form Nuova Mostra
    const [titolo, setTitolo] = useState('');
    const [descrizione, setDescrizione] = useState('');
    const [capienza, setCapienza] = useState(100);
    const [immagini, setImmagini] = useState('');
    const [successo, setSuccesso] = useState(false);

    // Simulazione controllo credenziali Admin
    const handleLogin = (e) => {
        e.preventDefault();
        if (email === "admin@museo.it" && password === "admin2026") {
            setIsLoggedIn(true);
            setErroreLogin(false);
        } else {
            setErroreLogin(true);
        }
    };

    // Invio dei dati al Back-end Python
    const handleSubmitMostra = (e) => {
        e.preventDefault();
        const nuovaMostra = {
            titolo,
            descrizione,
            capienza_massima: Number(capienza),
            immagini: immagini || "https://images.unsplash.com/photo-1541123603104-512919d6a96c?q=80&w=800,https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=600,https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=600,https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=600,https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?q=80&w=600"
        };

        axios.post('http://127.0.0.1:8000/api/mostre', nuovaMostra)
            .then(() => {
                setSuccesso(true);
                setTitolo('');
                setDescrizione('');
                setCapienza(100);
                setImmagini('');
                setTimeout(() => setSuccesso(false), 4000);
            })
            .catch(err => console.error("Errore salvataggio mostra:", err));
    };

    const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

    return (
        <Container maxWidth="md" sx={{ mt: 10, mb: 10 }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alla Home
            </Button>

            {!isLoggedIn ? (
                /* SEZIONE LOGIN ADMIN */
                <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: 4 }}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 3 }}>Area Riservata - Accesso Admin</Typography>
                        <Typography variant="body2" sx={{ color: '#aaaaaa', mb: 4, fontFamily: 'sans-serif' }}>
                            Credenziali di test: Email: <b>admin@museo.it</b> | Password: <b>admin2026</b>
                        </Typography>

                        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField fullWidth label="Email Amministratore" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={inputStyle} />
                            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={inputStyle} />

                            {erroreLogin && (
                                <Typography variant="body2" sx={{ color: '#ff6b6b', fontFamily: 'sans-serif' }}>
                                    Credenziali errate. Riprova.
                                </Typography>
                            )}

                            <Button type="submit" variant="contained" color="primary" size="large" sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold', letterSpacing: 1 }}>
                                ACCEDI AL GESTIONALE
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                /* SEZIONE DASHBOARD INSERIMENTO MOSTRA */
                <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: 4 }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                            <Typography variant="h4" sx={{ color: '#c5a059' }}>Gestione Museo - Nuova Mostra</Typography>
                            <Button onClick={() => setIsLoggedIn(false)} variant="outlined" color="primary" size="small">Esci</Button>
                        </Box>

                        {successo && (
                            <Box sx={{ p: 2, mb: 4, backgroundColor: 'rgba(76, 175, 80, 0.2)', border: '1px solid #4caf50', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ color: '#81c784', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
                                    Mostra caricata con successo! È ora visibile nella Home Page del museo.
                                </Typography>
                            </Box>
                        )}

                        <Box component="form" onSubmit={handleSubmitMostra} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={8}>
                                    <TextField fullWidth label="Titolo dell'Esposizione" value={titolo} onChange={(e) => setTitolo(e.target.value)} required sx={inputStyle} />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField fullWidth label="Capienza Massima" type="number" value={capienza} onChange={(e) => setCapienza(e.target.value)} required sx={inputStyle} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth multiline rows={3} label="Descrizione Dettagliata" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} required sx={inputStyle} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="URL delle 5 Foto (separate da virgola)" value={immagini} onChange={(e) => setImmagini(e.target.value)} placeholder="https://img1.jpg, https://img2.jpg..." sx={inputStyle} />
                                    <Typography variant="caption" sx={{ color: '#777777', mt: 1, display: 'block', fontFamily: 'sans-serif' }}>
                                        Se lasci vuoto, il sistema assegnerà automaticamente una galleria di default di alta qualità.
                                    </Typography>
                                </Grid>
                            </Grid>

                            <Button type="submit" variant="contained" color="primary" size="large" sx={{ borderRadius: 0, py: 2, mt: 2, fontWeight: 'bold', letterSpacing: 1.5 }}>
                                PUBBLICA MOSTRA NEL DATABASE
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
}
