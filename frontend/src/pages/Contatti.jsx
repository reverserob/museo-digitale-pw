import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, TextField, Button, Alert, Grid } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { inviaContatto } from '../services/contattiService';
import { traduciServer } from '../i18n/lingua';
import useUtente from '../hooks/useUtente';
import useAdmin from '../hooks/useAdmin';
import useLingua from '../hooks/useLingua';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};
const campo = {
    slotProps: { inputLabel: { shrink: true } },
    fullWidth: true,
    sx: { input: { color: 'white' }, textarea: { color: 'white' }, label: { color: '#999999' } },
};
// controllo semplice del formato dell'email
const emailValida = (v) => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v.trim());

// Modulo Contatti: le domande dei visitatori registrati arrivano per email al museo
export default function Contatti() {
    const utente = useUtente();
    const admin = useAdmin();
    const { t } = useLingua();

    // il form parte già compilato con i dati dell'account del visitatore (modificabili)
    const datiIniziali = () => ({
        titolo: '',
        descrizione: '',
        nome: utente?.nome || '',
        cognome: utente?.cognome || '',
        email: utente?.email || '',
        telefono: utente?.telefono || '',
    });
    const [dati, setDati] = useState(datiIniziali);
    const [errore, setErrore] = useState('');
    const [inviata, setInviata] = useState('');
    const [invio, setInvio] = useState(false);

    const aggiorna = (nome) => (e) => setDati({ ...dati, [nome]: e.target.value });

    const errori = {
        titolo: dati.titolo && dati.titolo.trim().length < 3 ? t('contatti.titoloCorto') : '',
        descrizione: dati.descrizione && dati.descrizione.trim().length < 10 ? t('contatti.descrizioneCorta') : '',
        nome: dati.nome && dati.nome.trim().length < 2 ? t('accedi.nomeCorto') : '',
        cognome: dati.cognome && dati.cognome.trim().length < 2 ? t('accedi.nomeCorto') : '',
        email: dati.email && !emailValida(dati.email) ? t('contatti.emailNonValida') : '',
        telefono: dati.telefono && !/^\d{6,15}$/.test(dati.telefono.trim()) ? t('comune.soloCifre') : '',
    };
    // stesse regole dello schema ContattoRequest del backend
    const valido =
        dati.titolo.trim().length >= 3 &&
        dati.descrizione.trim().length >= 10 &&
        dati.nome.trim().length >= 2 &&
        dati.cognome.trim().length >= 2 &&
        emailValida(dati.email) &&
        /^\d{6,15}$/.test(dati.telefono.trim());

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrore('');
        setInvio(true);
        // tolgo gli spazi iniziali e finali da tutti i campi prima dell'invio
        const richiesta = Object.fromEntries(Object.entries(dati).map(([k, v]) => [k, v.trim()]));
        inviaContatto(richiesta)
            .then((testo) => setInviata(traduciServer(testo)))
            .catch((err) => setErrore(messaggioErrore(err, t('contatti.errore'))))
            .finally(() => setInvio(false));
    };

    // svuota il form per scrivere un'altra domanda
    const nuovaRichiesta = () => {
        setDati(datiIniziali());
        setInviata('');
    };

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 } }}>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Typography variant="h4" component="h1" sx={{ color: '#c5a059', mb: 1 }}>
                        {t('contatti.titolo')}
                    </Typography>
                    <Typography sx={{ color: '#aaaaaa', mb: 4 }}>{t('contatti.intro')}</Typography>

                    {/* il form è visibile solo ai visitatori registrati e collegati */}
                    {admin ? (
                        <Alert severity="info">{t('contatti.admin')}</Alert>
                    ) : !utente ? (
                        <Alert
                            severity="info"
                            action={
                                <Button
                                    component={Link}
                                    to={`/accedi?next=${encodeURIComponent('/contatti')}`}
                                    color="inherit"
                                    size="small"
                                >
                                    {t('header.accedi')}
                                </Button>
                            }
                        >
                            {t('contatti.soloRegistrati')}
                        </Alert>
                    ) : inviata ? (
                        <>
                            <Alert severity="success" sx={{ mb: 3 }}>
                                {inviata}
                            </Alert>
                            <Button onClick={nuovaRichiesta} variant="outlined" sx={{ borderRadius: 0 }}>
                                {t('contatti.nuova')}
                            </Button>
                        </>
                    ) : (
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            aria-label={t('contatti.form')}
                            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                        >
                            <TextField
                                {...campo}
                                label={t('contatti.campoTitolo')}
                                value={dati.titolo}
                                onChange={aggiorna('titolo')}
                                error={Boolean(errori.titolo)}
                                helperText={errori.titolo}
                                slotProps={{ ...campo.slotProps, htmlInput: { maxLength: 120 } }}
                                required
                            />
                            <TextField
                                {...campo}
                                label={t('contatti.campoDescrizione')}
                                value={dati.descrizione}
                                onChange={aggiorna('descrizione')}
                                error={Boolean(errori.descrizione)}
                                helperText={
                                    errori.descrizione || t('contatti.caratteri', { numero: dati.descrizione.length })
                                }
                                multiline
                                minRows={5}
                                slotProps={{ ...campo.slotProps, htmlInput: { maxLength: 2000 } }}
                                required
                            />
                            <Grid container spacing={2.5}>
                                {[
                                    ['nome', t('comune.nome'), 'given-name'],
                                    ['cognome', t('comune.cognome'), 'family-name'],
                                    ['email', t('comune.email'), 'email'],
                                    ['telefono', t('comune.telefono'), 'tel'],
                                ].map(([nome, etichetta, autocomplete]) => (
                                    <Grid key={nome} size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            {...campo}
                                            label={etichetta}
                                            type={nome === 'email' ? 'email' : 'text'}
                                            autoComplete={autocomplete}
                                            value={dati[nome]}
                                            onChange={aggiorna(nome)}
                                            error={Boolean(errori[nome])}
                                            helperText={errori[nome]}
                                            required
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                            {errore && <Alert severity="error">{errore}</Alert>}
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={invio || !valido}
                                sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold', alignSelf: 'flex-start', px: 5 }}
                            >
                                {invio ? t('contatti.invio') : t('contatti.invia')}
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
