import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Divider } from '@mui/material';

export default function AdminDashboard() {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return sessionStorage.getItem('admin_logged') === 'true';
    });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erroreLogin, setErroreLogin] = useState(false);

    const [mostre, setMostre] = useState([]);
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
            sessionStorage.setItem('admin_logged', 'true');
            setErroreLogin(false);
        } else {
            setErroreLogin(true);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        sessionStorage.removeItem('admin_logged');
    };

    const eliminaMostra = (id) => {
        if (window.confirm("Sei sicura di voler eliminare questa mostra dal database?")) {
            axios.delete(`http://127.0.0.1:8000/api/mostre/${id}`)
                .then(() => {
                    setMessaggio("Mostra eliminata con successo!");
                    caricaMostre();
                    setTimeout(() => setMessaggio(''), 4000);
                })
                .catch(err => console.error("Errore durante l'eliminazione:", err));
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
                            <Typography variant="h4" sx={{ color: '#c5a059' }}>Dashboard Admin - Esposizioni Attive</Typography>
                            <Box display="flex" gap={2}>
                                <Button component={Link} to="/admin/nuova" variant="contained" color="primary" sx={{ borderRadius: 0, fontWeight: 'bold' }}>
                                    + Nuova Mostra
                                </Button>
                                <Button onClick={handleLogout} variant="outlined" color="primary" size="small">Esci</Button>
                            </Box>
                        </Box>

                        {messaggio && (
                            <Box sx={{ p: 2, mb: 4, backgroundColor: 'rgba(76, 175, 80, 0.2)', border: '1px solid #4caf50', borderRadius: 1 }}>
                                <Typography variant="body2" sx={{ color: '#81c784', fontWeight: 'bold' }}>{messaggio}</Typography>
                            </Box>
                        )}

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {mostre.map((m) => (
                                <Box key={m.id} display="flex" justifyContent="space-between" alignItems="center" p={2.5} sx={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ color: '#c5a059', fontWeight: 'bold' }}>{m.titolo}</Typography>
                                        <Typography variant="body2" sx={{ color: '#aaaaaa', fontFamily: 'sans-serif' }}>
                                            Periodo: Dal {m.data_inizio} al {m.data_fine}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={2}>
                                        <Button component={Link} to={`/admin/modifica/${m.id}`} variant="outlined" color="primary" size="small">
                                            Modifica
                                        </Button>
                                        <Button variant="outlined" color="error" size="small" onClick={() => eliminaMostra(m.id)}>
                                            Elimina
                                        </Button>
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                    </CardContent>
                </Card>
            )}
        </Container>
    );
}
