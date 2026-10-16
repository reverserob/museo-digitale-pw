import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, Button, Alert, CircularProgress, Divider } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getMiePrenotazioni, logoutUtente } from '../services/utentiService';
import useUtente from '../hooks/useUtente';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};

export default function AreaPersonale() {
    const navigate = useNavigate();
    const location = useLocation();
    const utente = useUtente();
    const [prenotazioni, setPrenotazioni] = useState(null);
    const [errore, setErrore] = useState('');

    useEffect(() => {
        getMiePrenotazioni()
            .then(setPrenotazioni)
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare le prenotazioni.')));
    }, []);

    const esci = () => {
        logoutUtente();
        navigate('/');
    };

    if (!utente) return null;

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <Typography variant="h4" sx={{ color: '#c5a059' }}>
                            Ciao, {utente.nome}
                        </Typography>
                        <Button onClick={esci} variant="outlined" size="small" sx={{ borderRadius: 0 }}>
                            Esci
                        </Button>
                    </Box>
                    <Typography sx={{ color: '#aaaaaa', fontFamily: 'sans-serif', mt: 1 }}>
                        {utente.nome} {utente.cognome} · {utente.email} · {utente.telefono}
                    </Typography>

                    {location.state?.registrato && (
                        <Alert severity="success" sx={{ mt: 3 }}>
                            Registrazione completata! Ti abbiamo inviato un&apos;email di conferma.
                        </Alert>
                    )}

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 3 }} />

                    <Typography variant="h6" sx={{ color: '#c5a059', mb: 2 }}>
                        Le mie prenotazioni
                    </Typography>
                    {errore && <Alert severity="error">{errore}</Alert>}
                    {!errore && prenotazioni === null && <CircularProgress color="primary" />}
                    {prenotazioni?.length === 0 && (
                        <Typography sx={{ color: '#aaaaaa', fontFamily: 'sans-serif' }}>
                            Non hai ancora prenotato nessuna visita.{' '}
                            <Link to="/" style={{ color: '#c5a059' }}>
                                Scopri le mostre
                            </Link>
                        </Typography>
                    )}
                    {prenotazioni?.map((p) => (
                        <Box key={p.id} sx={{ py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <Link to={`/esposizione/${p.mostra_id}`} style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                {p.titolo_mostra}
                            </Link>
                            <Typography variant="body2" sx={{ color: '#aaaaaa', fontFamily: 'sans-serif' }}>
                                Mostra dal {p.data_inizio} al {p.data_fine} · prenotata il{' '}
                                {new Date(p.creata_il + 'Z').toLocaleDateString('it-IT')}
                            </Typography>
                        </Box>
                    ))}
                </CardContent>
            </Card>
        </Container>
    );
}
