/**
 * Pagina di dettaglio di una mostra (`/esposizione/:id`).
 *
 * @module pages/GalleriaMostra
 */
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Grid,
    Button,
    Box,
    CircularProgress,
    ImageList,
    ImageListItem,
    Alert,
} from '@mui/material';
import { splitImmagini, messaggioErrore } from '../services/api';
import { getMostra, eliminaMostra } from '../services/mostreService';
import { getMiePrenotazioni } from '../services/utentiService';
import useAdmin from '../hooks/useAdmin';
import useUtente from '../hooks/useUtente';
import useLingua from '../hooks/useLingua';
import SezioneFeedback from '../components/SezioneFeedback';

/**
 * Dettaglio di una mostra: descrizione, periodo, galleria di immagini, pulsante PRENOTA e feedback.
 * Per l'amministratore mostra anche i comandi Modifica ed Elimina.
 *
 * @returns {JSX.Element} La pagina.
 * @alias module:pages/GalleriaMostra.GalleriaMostra
 */
export default function GalleriaMostra() {
    // id della mostra preso dall'indirizzo /esposizione/:id
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostra] = useState(null);
    const [errore, setErrore] = useState('');
    const admin = useAdmin();
    const utente = useUtente();
    const { t } = useLingua();
    const [giaPrenotato, setGiaPrenotato] = useState(false);

    // carica la mostra quando la pagina si apre o cambia l'id nell'indirizzo
    useEffect(() => {
        getMostra(id)
            .then(setMostra)
            .catch((err) => setErrore(messaggioErrore(err, t('comune.erroreMostra'))));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // il visitatore può prenotarsi una sola volta a ogni mostra
    useEffect(() => {
        if (!utente) {
            setGiaPrenotato(false);
            return;
        }
        getMiePrenotazioni()
            .then((elenco) => setGiaPrenotato(elenco.some((p) => p.mostra_id === Number(id))))
            .catch(() => setGiaPrenotato(false));
    }, [utente, id]);

    // mostra non trovata o errore di rete
    if (errore) {
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {errore}
                </Alert>
                <Button onClick={() => navigate('/esposizioni')} variant="outlined">
                    {t('comune.tornaEsposizioni')}
                </Button>
            </Container>
        );
    }
    // dati non ancora arrivati: indicatore di caricamento
    if (!mostra)
        return (
            <Box sx={{ textAlign: 'center', mt: 20 }}>
                <CircularProgress color="primary" />
            </Box>
        );

    const immaginiGalleria = splitImmagini(mostra.immagini);

    // solo admin: elimina la mostra (con prenotazioni e feedback) dopo la conferma e torna alla dashboard
    const handleEliminaMostra = () => {
        if (!window.confirm(t('mostra.confermaElimina'))) return;
        eliminaMostra(mostra.id)
            .then(() => navigate('/admin'))
            .catch((err) => setErrore(messaggioErrore(err, t('mostra.erroreElimina'))));
    };

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 10 } }}>
            <Button onClick={() => navigate('/esposizioni')} sx={{ color: '#bbbbbb', mb: 4 }}>
                {t('mostra.indietro')}
            </Button>

            {/* barra dei comandi visibile solo all'amministratore */}
            {admin && (
                <Box
                    aria-label={t('mostra.gestione')}
                    role="region"
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 2,
                        mb: 4,
                        border: '1px solid rgba(197, 160, 89, 0.4)',
                        backgroundColor: 'rgba(10, 10, 10, 0.75)',
                    }}
                >
                    <Typography variant="body2" sx={{ color: '#c5a059', mr: 'auto', letterSpacing: 1 }}>
                        {t('mostra.areaAdmin')}
                    </Typography>
                    <Button component={Link} to="/admin" variant="text" color="inherit" size="small">
                        {t('mostra.dashboard')}
                    </Button>
                    <Button
                        component={Link}
                        to={`/admin/modifica/${mostra.id}`}
                        variant="outlined"
                        color="primary"
                        size="small"
                    >
                        {t('mostra.modifica')}
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={handleEliminaMostra}>
                        {t('mostra.elimina')}
                    </Button>
                </Box>
            )}

            <Grid container spacing={6}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
                        <Typography
                            variant="h3"
                            component="h1"
                            gutterBottom
                            sx={{ color: '#c5a059', fontSize: { xs: '2rem', md: '3rem' } }}
                        >
                            {mostra.titolo}
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{ color: '#e0e0e0', mt: 4, mb: 2, fontSize: '1.1rem', lineHeight: 1.8 }}
                        >
                            {mostra.descrizione}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#aaaaaa', mb: 6, lineHeight: 1.7 }}>
                            {t('mostra.percorso')}
                        </Typography>

                        <Box
                            sx={{
                                p: 3,
                                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                                borderLeft: '4px solid #c5a059',
                                mb: 4,
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{ color: '#c5a059', textTransform: 'uppercase', letterSpacing: 2 }}
                            >
                                {t('mostra.periodo')}
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#ffffff', mt: 1, fontWeight: 'bold' }}>
                                {t('comune.periodo', { inizio: mostra.data_inizio, fine: mostra.data_fine })}
                            </Typography>
                        </Box>

                        {/* l'amministratore non prenota; chi è già prenotato non può prenotarsi di nuovo */}
                        {!admin &&
                            (giaPrenotato ? (
                                <Alert
                                    severity="success"
                                    action={
                                        <Button component={Link} to="/profilo" color="inherit" size="small">
                                            {t('mostra.vediPrenotazioni')}
                                        </Button>
                                    }
                                >
                                    {t('mostra.giaPrenotato')}
                                </Alert>
                            ) : (
                                <Button
                                    component={Link}
                                    to={`/prenota/${mostra.id}`}
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    fullWidth
                                    sx={{ borderRadius: 0, py: 2, letterSpacing: 1.5, fontWeight: 'bold' }}
                                >
                                    {t('comune.prenota')}
                                </Button>
                            ))}
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    {/* galleria: la prima immagine grande, poi fino a quattro immagini più piccole */}
                    {immaginiGalleria.length > 0 && (
                        <ImageList variant="quilted" cols={2} gap={16}>
                            <ImageListItem cols={2} rows={2}>
                                <img
                                    src={immaginiGalleria[0]}
                                    alt={mostra.titolo}
                                    style={{ borderRadius: 8, height: '400px', objectFit: 'cover' }}
                                />
                            </ImageListItem>
                            {immaginiGalleria.slice(1, 5).map((imgUrl, index) => (
                                <ImageListItem key={imgUrl} cols={1} rows={1}>
                                    <img
                                        src={imgUrl}
                                        alt={t('mostra.dettaglio', { titolo: mostra.titolo, numero: index + 1 })}
                                        style={{ borderRadius: 8, height: '250px', objectFit: 'cover' }}
                                    />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    )}
                </Grid>
            </Grid>

            <SezioneFeedback mostra={mostra} admin={admin} />
        </Container>
    );
}
