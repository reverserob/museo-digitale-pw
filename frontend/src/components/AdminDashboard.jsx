import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Divider, Alert, Collapse, CircularProgress } from '@mui/material';
import { api, getToken, setToken, messaggioErrore } from '../api';

const cardSx = { backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: { xs: 1, sm: 4 } };
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

export default function AdminDashboard() {
    const navigate = useNavigate();

    // Il login è valido solo se il backend ha rilasciato un token
    const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()));

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erroreLogin, setErroreLogin] = useState('');
    const [loginInCorso, setLoginInCorso] = useState(false);

    const [mostre, setMostre] = useState([]);
    const [prenotazioni, setPrenotazioni] = useState([]);
    const [aperta, setAperta] = useState(null);
    const [messaggio, setMessaggio] = useState('');
    const [errore, setErrore] = useState('');
    const [loading, setLoading] = useState(false);

    const caricaDati = useCallback(() => {
        setLoading(true);
        Promise.all([api.get('/api/mostre'), api.get('/api/prenotazioni')])
            .then(([resMostre, resPrenotazioni]) => {
                setMostre(resMostre.data);
                setPrenotazioni(resPrenotazioni.data);
            })
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare i dati.')))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (isLoggedIn) caricaDati();
    }, [isLoggedIn, caricaDati]);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoginInCorso(true);
        setErroreLogin('');
        api.post('/api/login', { email, password })
            .then((res) => {
                setToken(res.data.access_token);
                setIsLoggedIn(true);
                setPassword('');
            })
            .catch((err) => setErroreLogin(messaggioErrore(err, 'Credenziali errate.')))
            .finally(() => setLoginInCorso(false));
    };

    const handleLogout = () => {
        setToken(null);
        setIsLoggedIn(false);
    };

    const eliminaMostra = (id) => {
        if (!window.confirm('Sei sicuro di voler eliminare questa mostra? Verranno eliminate anche le relative prenotazioni.')) return;
        setErrore('');
        api.delete(`/api/mostre/${id}`)
            .then(() => {
                setMessaggio('Mostra eliminata con successo!');
                caricaDati();
                setTimeout(() => setMessaggio(''), 4000);
            })
            .catch((err) => setErrore(messaggioErrore(err, "Errore durante l'eliminazione.")));
    };

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alla Home
            </Button>

            {!isLoggedIn ? (
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 4 }}>Area Riservata - Accesso Admin</Typography>

                        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                label="Email Amministratore"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                sx={inputStyle} />
                            <TextField
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                sx={inputStyle} />
                            {erroreLogin && <Alert severity="error">{erroreLogin}</Alert>}
                            <Button type="submit" variant="contained" color="primary" size="large" disabled={loginInCorso} sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}>
                                {loginInCorso ? 'Verifica in corso...' : 'ACCEDI'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 4 }}>
                            <Typography variant="h4" sx={{ color: '#c5a059' }}>Dashboard Admin - Esposizioni</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button component={Link} to="/admin/nuova" variant="contained" color="primary" sx={{ borderRadius: 0, fontWeight: 'bold' }}>
                                    Nuova Mostra
                                </Button>
                                <Button onClick={handleLogout} variant="outlined" color="primary" size="small">Esci</Button>
                            </Box>
                        </Box>

                        {messaggio && <Alert severity="success" sx={{ mb: 3 }}>{messaggio}</Alert>}
                        {errore && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrore('')}>{errore}</Alert>}

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

                        {loading && mostre.length === 0 && <Box sx={{ textAlign: 'center' }}><CircularProgress color="primary" /></Box>}
                        {!loading && mostre.length === 0 && !errore && (
                            <Typography sx={{ color: '#aaaaaa', fontFamily: 'sans-serif' }}>Nessuna mostra presente. Creane una con "Nuova Mostra".</Typography>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {mostre.map((m) => {
                                const elenco = prenotazioni.filter((p) => p.mostra_id === m.id);
                                return (
                                    <Box key={m.id} sx={{ p: 2.5, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                                            <Box>
                                                <Typography variant="subtitle1" sx={{ color: '#c5a059', fontWeight: 'bold' }}>{m.titolo}</Typography>
                                                <Typography variant="body2" sx={{ color: '#aaaaaa', fontFamily: 'sans-serif' }}>
                                                    Periodo: Dal {m.data_inizio} al {m.data_fine}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                <Button variant="text" color="inherit" size="small" onClick={() => setAperta(aperta === m.id ? null : m.id)}>
                                                    Prenotazioni ({elenco.length})
                                                </Button>
                                                <Button component={Link} to={`/admin/modifica/${m.id}`} variant="outlined" color="primary" size="small">
                                                    Modifica
                                                </Button>
                                                <Button variant="outlined" color="error" size="small" onClick={() => eliminaMostra(m.id)}>
                                                    Elimina
                                                </Button>
                                            </Box>
                                        </Box>

                                        <Collapse in={aperta === m.id} unmountOnExit>
                                            <Box sx={{ mt: 2, fontFamily: 'sans-serif' }}>
                                                {elenco.length === 0 ? (
                                                    <Typography variant="body2" sx={{ color: '#888' }}>Nessuna prenotazione.</Typography>
                                                ) : elenco.map((p) => (
                                                    <Typography key={p.id} variant="body2" sx={{ color: '#ddd', py: 0.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {p.nome} {p.cognome} · {p.email} · {p.telefono} · {new Date(p.creata_il + 'Z').toLocaleString('it-IT')}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </Box>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
}
