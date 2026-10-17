import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Box,
    TextField,
    Grid,
    CircularProgress,
    Alert,
} from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getMostra } from '../services/mostreService';
import { prenota } from '../services/prenotazioniService';
import useUtente from '../hooks/useUtente';
import useLingua from '../hooks/useLingua';
import { getMiePrenotazioni } from '../services/utentiService';

// Pagina di prenotazione (protetta: solo visitatori registrati). Nome, cognome ed email sono quelli
// dell'account e non si modificano; si può indicare un numero di telefono diverso.
export default function FormPrenotazione() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostra] = useState(null);
    const [erroreCaricamento, setErroreCaricamento] = useState('');

    // la pagina è protetta: il visitatore è sempre collegato e i suoi dati arrivano dall'account
    const utente = useUtente();
    const { t } = useLingua();
    // una sola prenotazione per mostra: se c'è già, il form non viene mostrato
    const [giaPrenotato, setGiaPrenotato] = useState(false);
    const [telefono, setTelefono] = useState(utente?.telefono || '');

    const [loading, setLoading] = useState(false);
    const [successo, setSuccesso] = useState(false);
    const [errore, setErrore] = useState('');

    // carica la mostra e verifica se il visitatore è già prenotato
    useEffect(() => {
        getMostra(id)
            .then(setMostra)
            .catch((err) => setErroreCaricamento(messaggioErrore(err, t('comune.erroreMostra'))));
        getMiePrenotazioni()
            .then((elenco) => setGiaPrenotato(elenco.some((p) => p.mostra_id === Number(id))))
            .catch(() => setGiaPrenotato(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // stessa regola del backend: da 6 a 15 cifre
    const isTelefonoValid = /^\d{6,15}$/.test(telefono.trim());
    const isFormValid = Boolean(utente) && isTelefonoValid;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setLoading(true);
        setErrore('');

        // si inviano solo mostra e telefono: gli altri dati il backend li prende dall'account (token)
        const payload = { mostra_id: parseInt(id), telefono: telefono.trim() };

        prenota(payload)
            .then(() => {
                setLoading(false);
                setSuccesso(true);
            })
            .catch((err) => {
                setLoading(false);
                setErrore(messaggioErrore(err, t('prenota.errore')));
            });
    };

    const inputStyle = { input: { color: 'white' } };

    if (erroreCaricamento) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {erroreCaricamento}
                </Alert>
                <Button onClick={() => navigate('/esposizioni')} variant="outlined">
                    {t('comune.tornaEsposizioni')}
                </Button>
            </Container>
        );
    }
    if (!mostra)
        return (
            <Box sx={{ textAlign: 'center', mt: 20 }}>
                <CircularProgress color="primary" />
            </Box>
        );

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Button onClick={() => navigate(`/esposizione/${id}`)} sx={{ color: '#bbbbbb', mb: 4 }}>
                {t('prenota.indietro')}
            </Button>

            <Card
                elevation={0}
                sx={{
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(197, 160, 89, 0.5)',
                    backgroundColor: 'rgba(10, 10, 10, 0.85)',
                    p: { xs: 1, sm: 4 },
                }}
            >
                <CardContent>
                    <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 4 }}>
                        {t('prenota.titolo', { titolo: mostra.titolo })}
                    </Typography>

                    {errore && (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 3,
                                backgroundColor: 'rgba(211, 47, 47, 0.15)',
                                color: '#ff8a80',
                                border: '1px solid #d32f2f',
                            }}
                        >
                            {errore}
                        </Alert>
                    )}

                    {/* tre casi: già prenotato, prenotazione appena confermata, form da compilare */}
                    {giaPrenotato && !successo ? (
                        <Alert
                            severity="info"
                            action={
                                <Button component={Link} to="/profilo" color="inherit" size="small">
                                    {t('prenota.gestisci')}
                                </Button>
                            }
                        >
                            {t('prenota.giaPrenotato')}
                        </Alert>
                    ) : successo ? (
                        <Box
                            sx={{
                                p: 4,
                                textAlign: 'center',
                                backgroundColor: 'rgba(76, 175, 80, 0.15)',
                                border: '1px solid #4caf50',
                                borderRadius: 1,
                            }}
                        >
                            <Typography variant="h6" sx={{ color: '#81c784', fontWeight: 'bold', mb: 2 }}>
                                {t('prenota.confermata')}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#ffffff', mb: 3 }}>
                                {t('prenota.emailInviata', { email: utente?.email })}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    onClick={() => navigate('/esposizioni')}
                                    variant="contained"
                                    color="primary"
                                    sx={{ borderRadius: 0, fontWeight: 'bold' }}
                                >
                                    {t('comune.tornaEsposizioni')}
                                </Button>
                                <Button component={Link} to="/profilo" variant="outlined" sx={{ borderRadius: 0 }}>
                                    {t('prenota.gestisci')}
                                </Button>
                            </Box>
                        </Box>
                    ) : (
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                        >
                            <Grid container spacing={3}>
                                {/* dati dell'account in sola lettura */}
                                {[
                                    [t('comune.nome'), utente?.nome],
                                    [t('comune.cognome'), utente?.cognome],
                                    [t('comune.email'), utente?.email],
                                ].map(([etichetta, valore]) => (
                                    <Grid key={etichetta} size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" sx={{ color: '#c5a059', mb: 1, fontWeight: 500 }}>
                                            {etichetta}
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            value={valore || ''}
                                            slotProps={{ htmlInput: { readOnly: true, 'aria-label': etichetta } }}
                                            sx={{ input: { color: '#bbbbbb' } }}
                                        />
                                    </Grid>
                                ))}

                                {/* Telefono */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="body2" sx={{ color: '#c5a059', mb: 1, fontWeight: 500 }}>
                                        {t('prenota.telefono')}
                                    </Typography>
                                    <TextField
                                        slotProps={{
                                            inputLabel: { shrink: true },
                                            htmlInput: { 'aria-label': t('comune.telefono') },
                                        }}
                                        fullWidth
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                        required
                                        error={telefono.length > 0 && !isTelefonoValid}
                                        helperText={
                                            telefono.length > 0 && !isTelefonoValid ? t('comune.soloCifre') : ''
                                        }
                                        sx={inputStyle}
                                        disabled={loading}
                                    />
                                </Grid>
                            </Grid>

                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    mt: 3,
                                    gap: 2,
                                }}
                            >
                                {loading && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <CircularProgress size={24} sx={{ color: '#c5a059' }} />
                                        <Typography variant="body2" sx={{ color: '#c5a059' }}>
                                            {t('prenota.invio')}
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
                                    {loading ? t('comune.attendere') : t('comune.prenota')}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
