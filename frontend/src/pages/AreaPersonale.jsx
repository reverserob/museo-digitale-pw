import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, Button, Alert, CircularProgress, Divider } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { annullaPrenotazione, getMiePrenotazioni, logoutUtente } from '../services/utentiService';
import { formatoData, traduciServer } from '../i18n/lingua';
import useUtente from '../hooks/useUtente';
import useLingua from '../hooks/useLingua';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};

// Area personale del visitatore (/profilo): dati dell'account, elenco delle prenotazioni e annullamento
export default function AreaPersonale() {
    const navigate = useNavigate();
    const location = useLocation();
    const utente = useUtente();
    const { t, lingua } = useLingua();
    const [prenotazioni, setPrenotazioni] = useState(null);
    const [errore, setErrore] = useState('');
    const [messaggio, setMessaggio] = useState('');
    // id della prenotazione in corso di annullamento (per disattivarne il pulsante)
    const [inAnnullamento, setInAnnullamento] = useState(null);

    useEffect(() => {
        getMiePrenotazioni()
            .then(setPrenotazioni)
            .catch((err) => setErrore(messaggioErrore(err, t('profilo.errore'))));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const esci = () => {
        logoutUtente();
        navigate('/');
    };

    // annulla una prenotazione dopo la conferma; il backend invia l'email di conferma dell'annullamento
    const annulla = (p) => {
        if (!window.confirm(t('profilo.confermaAnnulla', { titolo: p.titolo_mostra }))) return;
        setErrore('');
        setMessaggio('');
        setInAnnullamento(p.id);
        annullaPrenotazione(p.id)
            .then((testo) => {
                setPrenotazioni((precedenti) => precedenti.filter((x) => x.id !== p.id));
                setMessaggio(traduciServer(testo));
            })
            .catch((err) => setErrore(messaggioErrore(err, t('profilo.erroreAnnulla'))))
            .finally(() => setInAnnullamento(null));
    };

    // dopo il logout il componente non mostra nulla mentre avviene il cambio di pagina
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
                        <Typography variant="h4" component="h1" sx={{ color: '#c5a059' }}>
                            {t('profilo.ciao', { nome: utente.nome })}
                        </Typography>
                        <Button onClick={esci} variant="outlined" size="small" sx={{ borderRadius: 0 }}>
                            {t('profilo.esci')}
                        </Button>
                    </Box>
                    <Typography sx={{ color: '#aaaaaa', mt: 1 }}>
                        {utente.nome} {utente.cognome} · {utente.email} · {utente.telefono}
                    </Typography>

                    {/* messaggio mostrato subito dopo la registrazione (stato passato dalla pagina Accedi) */}
                    {location.state?.registrato && (
                        <Alert severity="success" sx={{ mt: 3 }}>
                            {t('profilo.registrato')}
                        </Alert>
                    )}

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 3 }} />

                    <Typography variant="h6" component="h2" sx={{ color: '#c5a059', mb: 2 }}>
                        {t('profilo.mie')}
                    </Typography>
                    {messaggio && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {messaggio}
                        </Alert>
                    )}
                    {errore && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {errore}
                        </Alert>
                    )}
                    {!errore && prenotazioni === null && <CircularProgress color="primary" />}
                    {prenotazioni?.length === 0 && (
                        <Typography sx={{ color: '#aaaaaa' }}>
                            {t('profilo.nessuna')}{' '}
                            <Link to="/esposizioni" style={{ color: '#c5a059' }}>
                                {t('profilo.scopri')}
                            </Link>
                        </Typography>
                    )}
                    {prenotazioni?.map((p) => (
                        <Box
                            key={p.id}
                            sx={{
                                py: 1.5,
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 220 }}>
                                <Link
                                    to={`/esposizione/${p.mostra_id}`}
                                    style={{ color: '#ffffff', fontWeight: 'bold' }}
                                >
                                    {p.titolo_mostra}
                                </Link>
                                <Typography variant="body2" sx={{ color: '#aaaaaa' }}>
                                    {t('profilo.dettaglio', {
                                        inizio: p.data_inizio,
                                        fine: p.data_fine,
                                        data: formatoData(p.creata_il + 'Z', lingua),
                                    })}
                                </Typography>
                            </Box>
                            <Button
                                onClick={() => annulla(p)}
                                color="error"
                                variant="outlined"
                                size="small"
                                disabled={inAnnullamento === p.id}
                                aria-label={t('profilo.annullaDi', { titolo: p.titolo_mostra })}
                                sx={{ borderRadius: 0 }}
                            >
                                {t('profilo.annulla')}
                            </Button>
                        </Box>
                    ))}
                </CardContent>
            </Card>
        </Container>
    );
}
