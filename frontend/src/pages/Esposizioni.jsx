/**
 * Catalogo delle esposizioni (`/esposizioni`).
 *
 * @module pages/Esposizioni
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Box,
    CircularProgress,
    Alert,
} from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getMostre } from '../services/mostreService';
import { getMiePrenotazioni } from '../services/utentiService';
import useAdmin from '../hooks/useAdmin';
import useUtente from '../hooks/useUtente';
import useLingua from '../hooks/useLingua';

/**
 * Catalogo delle esposizioni correnti: una card per mostra con i pulsanti SCOPRI DI PIÙ e PRENOTA
 * (oppure MOSTRA PRENOTATA se il visitatore è già prenotato; nessun pulsante di prenotazione per l'admin).
 *
 * @returns {JSX.Element} La pagina.
 * @alias module:pages/Esposizioni.Esposizioni
 */
export default function Esposizioni() {
    const admin = useAdmin();
    const utente = useUtente();
    const { t } = useLingua();
    const [mostre, setMostre] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errore, setErrore] = useState('');
    // id delle mostre già prenotate dal visitatore collegato
    const [prenotate, setPrenotate] = useState([]);

    useEffect(() => {
        getMostre()
            .then(setMostre)
            .catch((err) => setErrore(messaggioErrore(err, t('esposizioni.errore'))))
            .finally(() => setLoading(false));
        // il caricamento avviene una sola volta, all'apertura della pagina
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // per il visitatore collegato leggo le sue prenotazioni, per mostrare "MOSTRA PRENOTATA" al posto di PRENOTA
    useEffect(() => {
        if (!utente) {
            setPrenotate([]);
            return;
        }
        getMiePrenotazioni()
            .then((elenco) => setPrenotate(elenco.map((p) => p.mostra_id)))
            .catch(() => setPrenotate([]));
    }, [utente]);

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 10 } }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom
                    sx={{ color: '#ffffff', fontSize: { xs: '2rem', md: '3rem' } }}
                >
                    {t('esposizioni.titolo')}
                </Typography>
                <Typography
                    variant="h6"
                    component="p"
                    sx={{ color: '#bbbbbb', maxWidth: '700px', mx: 'auto', mt: 2, fontWeight: 300 }}
                >
                    {t('esposizioni.sottotitolo')}
                </Typography>
            </Box>

            {/* stati della pagina: caricamento, errore, catalogo vuoto */}
            {loading && (
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress color="primary" />
                </Box>
            )}
            {errore && (
                <Alert severity="error" sx={{ mb: 4 }}>
                    {errore}
                </Alert>
            )}
            {!loading && !errore && mostre.length === 0 && (
                <Typography sx={{ textAlign: 'center', color: '#bbbbbb' }}>{t('esposizioni.vuoto')}</Typography>
            )}

            {/* una card per mostra: due colonne da tablet in su, una su smartphone */}
            <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
                {mostre.map((mostra) => (
                    <Grid key={mostra.id} size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
                        <Card
                            elevation={0}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(197, 160, 89, 0.3)',
                                transition: 'transform 0.3s ease',
                                '&:hover': { transform: 'translateY(-10px)', borderColor: '#c5a059' },
                            }}
                        >
                            <CardContent sx={{ flexGrow: 1, p: 4 }}>
                                <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#c5a059' }}>
                                    {mostra.titolo}
                                </Typography>

                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: '#e0e0e0',
                                        display: 'block',
                                        mb: 2,
                                        fontWeight: 'bold',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    📅 {t('comune.periodo', { inizio: mostra.data_inizio, fine: mostra.data_fine })}
                                </Typography>

                                {/* Testo tagliato a 75 caratteri per mantenere le card della stessa altezza */}
                                <Typography variant="body1" sx={{ color: '#cccccc', mt: 1, mb: 3, lineHeight: 1.7 }}>
                                    {mostra.descrizione.length > 75
                                        ? `${mostra.descrizione.substring(0, 75)}...`
                                        : mostra.descrizione}
                                </Typography>
                            </CardContent>
                            <CardActions sx={{ p: 3, pt: 0, display: 'flex', gap: 2 }}>
                                <Button
                                    component={Link}
                                    to={`/esposizione/${mostra.id}`}
                                    variant="text"
                                    color="primary"
                                    fullWidth
                                    sx={{ letterSpacing: 1 }}
                                >
                                    {t('comune.scopri')}
                                </Button>
                                {/* l'amministratore non prenota; chi è già prenotato non può prenotarsi di nuovo */}
                                {!admin &&
                                    (prenotate.includes(mostra.id) ? (
                                        <Button
                                            component={Link}
                                            to="/profilo"
                                            variant="outlined"
                                            color="success"
                                            fullWidth
                                            sx={{ borderRadius: 0, borderWidth: 2, letterSpacing: 1 }}
                                        >
                                            ✓ {t('esposizioni.giaPrenotato')}
                                        </Button>
                                    ) : (
                                        <Button
                                            component={Link}
                                            to={`/prenota/${mostra.id}`}
                                            variant="outlined"
                                            color="primary"
                                            fullWidth
                                            sx={{ borderRadius: 0, borderWidth: 2, letterSpacing: 1 }}
                                        >
                                            {t('comune.prenota')}
                                        </Button>
                                    ))}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
}
