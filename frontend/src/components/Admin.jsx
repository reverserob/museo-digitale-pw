import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid, Divider } from '@mui/material';

export default function Admin() {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erroreLogin, setErroreLogin] = useState(false);

    const [mostre, setMostre] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [titolo, setTitolo] = useState('');
    const [descrizione, setDescrizione] = useState('');
    const [capienza, setCapienza] = useState(100);
    const [fileImmagini, setFileImmagini] = useState(null);
    const [messaggio, setMessaggio] = useState('');

    const caricaMostre = () => {
        axios.get('http://127.0.0.1:8000/api/mostre')
            .then(res => setMostre(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        if (isLoggedIn) caricaMostre();
    }, [isLoggedIn]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (email === "admin@museo.it" && password === "admin2026") {
            setIsLoggedIn(true);
            setErroreLogin(false);
        } else {
            setErroreLogin(true);
        }
    };

    const avviaModifica = (mostra) => {
        setEditingId(mostra.id);
        setTitolo(mostra.titolo);
        setDescrizione(mostra.descrizione);
        setCapienza(mostra.capienza_massima);
        setFileImmagini(null);
        setMessaggio('');
    };

    const annullaModifica = () => {
        setEditingId(null);
        setTitolo('');
        setDescrizione('');
        setCapienza(100);
        setFileImmagini(null);
        setMessaggio('');
    };

    const handleSubmitMostra = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('titolo', titolo);
        formData.append('descrizione', descrizione);
        formData.append('capienza_massima', capienza);

        if (fileImmagini) {
            for (let i = 0; i < fileImmagini.length; i++) {
                formData.append('immagini', fileImmagini[i]);
            }
        }

        const config = { headers: { 'Content-Type': 'multipart/form-data' } };

        if (editingId) {
            axios.put(`http://127.0.0.1:8000/api/mostre/${editingId}`, formData, config)
                .then(() => {
                    setMessaggio("Mostra modificata con successo!");
                    caricaMostre();
                    annullaModifica();
                    setTimeout(() => setMessaggio(''), 4000);
                })
                .catch(err => console.error("Errore modifica:", err));
        } else {
            axios.post('http://127.0.0.1:8000/api/mostre', formData, config)
                .then(() => {
                    setMessaggio("Nuova mostra pubblicata con successo!");
                    caricaMostre();
                    annullaModifica();
                    setTimeout(() => setMessaggio(''), 4000);
                })
                .catch(err => console.error("Errore creazione:", err));
        }
    };

    const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

    return (
        <Container maxWidth="md" sx={{ mt: 10, mb: 10 }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alla Home
            </Button>

            {!isLoggedIn ? (
                <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: 4 }}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 3 }}>Area Riservata - Accesso Admin</Typography>
                        <Typography variant="body2" sx={{ color: '#aaaaaa', mb: 4, fontFamily: 'sans-serif' }}>
                            Credenziali: <b>admin@museo.it</b> | Password: <b>admin2026</b>
                        </Typography>

                        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField fullWidth label="Email Amministratore" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={inputStyle} />
                            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={inputStyle} />
                            {erroreLogin && <Typography variant="body2" sx={{ color: '#ff6b6b' }}>Credenziali errate.</Typography>}
                            <Button type="submit" variant="contained" color="primary" size="large" sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}>ACCEDI</Button>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: 4 }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                            <Typography variant="h4" sx={{ color: '#c5a059' }}>Dashboard Admin - Gestione Mostre</Typography>
                            <Button onClick={() => setIsLoggedIn(false)} variant="outlined" color="primary" size="small">Esci</Button>
                        </Box>

                        {messaggio && (
                            <Box sx={{ p: 2, mb: 4, backgroundColor: 'rgba(76, 175, 80, 0.2)', border: '1px solid #4caf50', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ color: '#81c784', fontWeight: 'bold' }}>{messaggio}</Typography>
                            </Box>
                        )}

                        <Box component="form" onSubmit={handleSubmitMostra} sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 6 }}>
                            <Typography variant="h6" sx={{ color: editingId ? '#ffb74d' : '#c5a059' }}>
                                {editingId ? `Modifica Mostra ID: ${editingId}` : 'Carica Nuova Mostra con File'}
                            </Typography>

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
                                    <Typography variant="body2" sx={{ color: '#cccccc', mb: 1, fontFamily: 'sans-serif' }}>
                                        Seleziona le foto dal computer (puoi sceglierne più di una):
                                    </Typography>
                                    <Button variant="outlined" component="label" sx={{ color: '#c5a059', borderColor: '#c5a059', borderRadius: 0 }}>
                                        Carica Immagini
                                        <input type="file" hidden multiple accept="image/*" onChange={(e) => setFileImmagini(e.target.files)} />
                                    </Button>
                                    {fileImmagini && (
                                        <Typography variant="caption" sx={{ color: '#81c784', display: 'block', mt: 1 }}>
                                            {fileImmagini.length} file selezionati.
                                        </Typography>
                                    )}
                                </Grid>
                            </Grid>

                            <Box display="flex" gap={2}>
                                <Button type="submit" variant="contained" color="primary" size="large" sx={{ borderRadius: 0, py: 1.5, px: 4, fontWeight: 'bold' }}>
                                    {editingId ? 'SALVA MODIFICHE' : 'PUBBLICA MOSTRA'}
                                </Button>
                                {editingId && (
                                    <Button onClick={annullaModifica} variant="outlined" color="inherit" size="large" sx={{ borderRadius: 0, py: 1.5, px: 3 }}>
                                        ANNULLA
                                    </Button>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

                        <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Esposizioni Attive</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {mostre.map((m) => (
                                <Box key={m.id} display="flex" justifyContent="space-between" alignItems="center" p={2.5} sx={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ color: '#c5a059', fontWeight: 'bold' }}>{m.titolo}</Typography>
                                        <Typography variant="body2" sx={{ color: '#aaaaaa' }}>Capienza: {m.capienza_massima} posti</Typography>
                                    </Box>
                                    <Button variant="outlined" color="primary" size="small" onClick={() => avviaModifica(m)}>
                                        Modifica
                                    </Button>
                                </Box>
                            ))}
                        </Box>

                    </CardContent>
                </Card>
            )}
        </Container>
    );
}
