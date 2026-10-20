/**
 * Area personale del visitatore (`/profilo`): dati dell'account con modifica ed eliminazione, prenotazioni e QR code.
 *
 * @module pages/AreaPersonale
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    Alert,
    CircularProgress,
    Divider,
    TextField,
} from '@mui/material';
import { messaggioErrore } from '../services/api';
import {
    aggiornaProfilo,
    annullaPrenotazione,
    eliminaAccount,
    getMiePrenotazioni,
    logoutUtente,
} from '../services/utentiService';
import { formatoData, traduciServer } from '../i18n/lingua';
import useUtente from '../hooks/useUtente';
import useLingua from '../hooks/useLingua';
import QrPrenotazione from '../components/QrPrenotazione';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };
const campo = {
    slotProps: { inputLabel: { shrink: true } },
    size: 'small',
    sx: { ...inputStyle, flex: 1, minWidth: 180 },
};
// stesse regole della registrazione (e del backend)
const nomeValido = (v) => v.trim().length >= 3;
const telefonoValido = (v) => /^\d{6,15}$/.test(v.trim());

/**
 * Area personale: dati dell'account (modifica ed eliminazione), elenco delle prenotazioni e annullamento.
 *
 * @returns {?JSX.Element} La pagina, oppure `null` dopo il logout.
 * @alias module:pages/AreaPersonale.AreaPersonale
 */
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
    // id della prenotazione di cui è aperto il QR code (uno alla volta)
    const [qrAperto, setQrAperto] = useState(null);
    // gestione dell'account: null, 'modifica' (form dei dati) oppure 'elimina' (conferma con password)
    const [modo, setModo] = useState(null);
    const [form, setForm] = useState({ nome: '', cognome: '', telefono: '' });
    const [password, setPassword] = useState('');
    const [inviando, setInviando] = useState(false);
    const [esitoProfilo, setEsitoProfilo] = useState({ tipo: '', testo: '' });

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

    const apri = (nuovoModo) => {
        setEsitoProfilo({ tipo: '', testo: '' });
        setPassword('');
        if (nuovoModo === 'modifica')
            setForm({ nome: utente.nome, cognome: utente.cognome, telefono: utente.telefono });
        setModo(nuovoModo);
    };

    const formValido = nomeValido(form.nome) && nomeValido(form.cognome) && telefonoValido(form.telefono);

    // PUT /api/utenti/me: la sessione viene aggiornata dal servizio, quindi il nome cambia subito anche nell'header
    const salvaProfilo = (e) => {
        e.preventDefault();
        setInviando(true);
        aggiornaProfilo({ nome: form.nome.trim(), cognome: form.cognome.trim(), telefono: form.telefono.trim() })
            .then(() => {
                setModo(null);
                setEsitoProfilo({ tipo: 'success', testo: t('profilo.aggiornato') });
            })
            .catch((err) =>
                setEsitoProfilo({ tipo: 'error', testo: messaggioErrore(err, t('profilo.erroreAggiorna')) })
            )
            .finally(() => setInviando(false));
    };

    // DELETE /api/utenti/me con la password come conferma; dopo l'eliminazione si torna alla home
    const confermaElimina = (e) => {
        e.preventDefault();
        setInviando(true);
        eliminaAccount(password)
            .then(() => navigate('/'))
            .catch((err) => {
                setEsitoProfilo({ tipo: 'error', testo: messaggioErrore(err, t('profilo.erroreElimina')) });
                setInviando(false);
            });
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

                    {/* gestione dell'account: modifica dei dati ed eliminazione (diritto alla cancellazione) */}
                    <Box component="section" aria-label={t('profilo.dati')} sx={{ mt: 2 }}>
                        {modo === null && (
                            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                <Button
                                    onClick={() => apri('modifica')}
                                    variant="outlined"
                                    size="small"
                                    sx={{ borderRadius: 0 }}
                                >
                                    {t('profilo.modifica')}
                                </Button>
                                <Button
                                    onClick={() => apri('elimina')}
                                    color="error"
                                    variant="outlined"
                                    size="small"
                                    sx={{ borderRadius: 0 }}
                                >
                                    {t('profilo.elimina')}
                                </Button>
                            </Box>
                        )}
                        {modo === 'modifica' && (
                            <Box component="form" onSubmit={salvaProfilo} aria-label={t('profilo.modifica')}>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                                    <TextField
                                        {...campo}
                                        label={t('comune.nome')}
                                        value={form.nome}
                                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                        error={!nomeValido(form.nome)}
                                    />
                                    <TextField
                                        {...campo}
                                        label={t('comune.cognome')}
                                        value={form.cognome}
                                        onChange={(e) => setForm({ ...form, cognome: e.target.value })}
                                        error={!nomeValido(form.cognome)}
                                    />
                                    <TextField
                                        {...campo}
                                        label={t('comune.telefono')}
                                        value={form.telefono}
                                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                        error={!telefonoValido(form.telefono)}
                                        helperText={t('comune.soloCifre')}
                                    />
                                </Box>
                                <Typography variant="body2" sx={{ color: '#888888', mt: 1 }}>
                                    {t('profilo.emailFissa')}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="small"
                                        disabled={!formValido || inviando}
                                        sx={{ borderRadius: 0 }}
                                    >
                                        {t('profilo.salva')}
                                    </Button>
                                    <Button onClick={() => setModo(null)} size="small" sx={{ color: '#bbbbbb' }}>
                                        {t('profilo.annullaModifica')}
                                    </Button>
                                </Box>
                            </Box>
                        )}
                        {modo === 'elimina' && (
                            <Box
                                component="form"
                                onSubmit={confermaElimina}
                                aria-label={t('profilo.elimina')}
                                sx={{ border: '1px solid rgba(244, 67, 54, 0.5)', p: 2, mt: 1 }}
                            >
                                <Typography variant="body2" sx={{ color: '#dddddd', mb: 2 }}>
                                    {t('profilo.eliminaSpiega')}
                                </Typography>
                                <TextField
                                    {...campo}
                                    type="password"
                                    label={t('comune.password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
                                    <Button
                                        type="submit"
                                        color="error"
                                        variant="contained"
                                        size="small"
                                        disabled={!password || inviando}
                                        sx={{ borderRadius: 0 }}
                                    >
                                        {t('profilo.eliminaConferma')}
                                    </Button>
                                    <Button onClick={() => setModo(null)} size="small" sx={{ color: '#bbbbbb' }}>
                                        {t('profilo.annullaModifica')}
                                    </Button>
                                </Box>
                            </Box>
                        )}
                        {esitoProfilo.testo && (
                            <Alert severity={esitoProfilo.tipo} sx={{ mt: 2 }}>
                                {esitoProfilo.testo}
                            </Alert>
                        )}
                    </Box>

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
                                {p.codice && (
                                    <Typography variant="body2" sx={{ color: '#c5a059', fontFamily: 'monospace' }}>
                                        {t('profilo.codice', { codice: p.codice })}
                                    </Typography>
                                )}
                                {p.ingresso_il && (
                                    <Typography variant="body2" sx={{ color: '#81c784' }}>
                                        ✓ {t('profilo.ingresso', { data: formatoData(p.ingresso_il + 'Z', lingua) })}
                                    </Typography>
                                )}
                            </Box>
                            {p.codice && (
                                <Button
                                    onClick={() => setQrAperto(qrAperto === p.id ? null : p.id)}
                                    variant="outlined"
                                    size="small"
                                    aria-expanded={qrAperto === p.id}
                                    sx={{ borderRadius: 0 }}
                                >
                                    {qrAperto === p.id ? t('profilo.nascondiQr') : t('profilo.mostraQr')}
                                </Button>
                            )}
                            {/* una prenotazione già usata per entrare non si può più annullare */}
                            {!p.ingresso_il && (
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
                            )}
                            {qrAperto === p.id && (
                                <Box sx={{ width: '100%', textAlign: 'center', pt: 1 }}>
                                    <QrPrenotazione codice={p.codice} />
                                </Box>
                            )}
                        </Box>
                    ))}
                </CardContent>
            </Card>
        </Container>
    );
}
