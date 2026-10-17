/**
 * Area riservata (`/admin`): form di login dell'amministratore e, dopo l'accesso, dashboard con indicatori,
 * elenco delle mostre, prenotazioni e feedback di ciascuna mostra e comandi di gestione.
 *
 * @module pages/AdminDashboard
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Box,
    TextField,
    Divider,
    Alert,
    Collapse,
    CircularProgress,
} from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getMostre, eliminaMostra as eliminaMostraApi } from '../services/mostreService';
import { getPrenotazioni } from '../services/prenotazioniService';
import { getFeedback, eliminaFeedback as eliminaFeedbackApi } from '../services/feedbackService';
import { getStatistiche } from '../services/statisticheService';
import IndicatoriDashboard from '../components/IndicatoriDashboard';
import { login, logout, MESSAGGIO_VISITATORE_COLLEGATO } from '../services/authService';
import { logoutUtente } from '../services/utentiService';
import useUtente from '../hooks/useUtente';
import useAdmin from '../hooks/useAdmin';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

/**
 * Pagina dell'area riservata. Mostra tre contenuti diversi:
 * - visitatore collegato: avviso e pulsante per uscire dall'account visitatore;
 * - admin non collegato: form di login;
 * - admin collegato: dashboard.
 *
 * @returns {JSX.Element} La pagina.
 * @alias module:pages/AdminDashboard.AdminDashboard
 */
export default function AdminDashboard() {
    const navigate = useNavigate();
    // pagina da riaprire dopo il login (es. /admin/verifica?codice=... dal QR code); solo indirizzi /admin/...
    const [parametri] = useSearchParams();
    const next = parametri.get('next');
    const destinazione = next && next.startsWith('/admin/') && !next.startsWith('//') ? next : null;

    // Il login è valido solo se il backend ha rilasciato un token
    const isLoggedIn = useAdmin();
    // un visitatore collegato deve prima fare il logout per entrare nell'area riservata
    const visitatore = useUtente();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erroreLogin, setErroreLogin] = useState('');
    const [loginInCorso, setLoginInCorso] = useState(false);

    const [mostre, setMostre] = useState([]);
    const [prenotazioni, setPrenotazioni] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [statistiche, setStatistiche] = useState(null);
    // pannello aperto sotto una mostra, es. { id: 3, tipo: 'prenotazioni' }
    const [aperta, setAperta] = useState(null);
    const [messaggio, setMessaggio] = useState('');
    const [errore, setErrore] = useState('');
    const [loading, setLoading] = useState(false);

    // Carica insieme tutti i dati della dashboard. useCallback mantiene la stessa funzione tra un
    // render e l'altro, così può essere usata come dipendenza di useEffect senza cicli infiniti.
    const caricaDati = useCallback(() => {
        setLoading(true);
        // feedback e statistiche sono facoltativi: se non rispondono la dashboard mostra comunque mostre e prenotazioni
        const facoltativo = (promessa, valoreDiRiserva) =>
            promessa.catch((err) => {
                console.warn('Dati della dashboard non disponibili:', messaggioErrore(err));
                return valoreDiRiserva;
            });

        // le quattro richieste partono in parallelo; mostre e prenotazioni sono indispensabili
        Promise.all([
            getMostre(),
            getPrenotazioni(),
            facoltativo(getFeedback(), []),
            facoltativo(getStatistiche(), null),
        ])
            .then(([elencoMostre, elencoPrenotazioni, elencoFeedback, indicatori]) => {
                setMostre(elencoMostre);
                setPrenotazioni(elencoPrenotazioni);
                setFeedback(elencoFeedback);
                setStatistiche(indicatori);
            })
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare i dati.')))
            .finally(() => setLoading(false));
    }, []);

    // i dati si caricano appena l'amministratore risulta collegato
    useEffect(() => {
        if (isLoggedIn) caricaDati();
    }, [isLoggedIn, caricaDati]);

    // login: se va a buon fine useAdmin diventa true e la pagina mostra la dashboard
    const handleLogin = (e) => {
        e.preventDefault();
        setLoginInCorso(true);
        setErroreLogin('');
        login(email, password)
            .then(() => {
                setPassword('');
                if (destinazione) navigate(destinazione, { replace: true });
            })
            .catch((err) =>
                setErroreLogin(
                    err.message === MESSAGGIO_VISITATORE_COLLEGATO
                        ? err.message
                        : messaggioErrore(err, 'Credenziali errate.')
                )
            )
            .finally(() => setLoginInCorso(false));
    };

    const handleLogout = () => {
        logout();
    };

    // eliminazione di una mostra (con le sue prenotazioni e i suoi feedback) e ricarica dei dati
    const eliminaMostra = (id) => {
        if (
            !window.confirm(
                'Sei sicuro di voler eliminare questa mostra? Verranno eliminate anche le relative prenotazioni.'
            )
        )
            return;
        setErrore('');
        eliminaMostraApi(id)
            .then(() => {
                setMessaggio('Mostra eliminata con successo!');
                caricaDati();
                setTimeout(() => setMessaggio(''), 4000);
            })
            .catch((err) => setErrore(messaggioErrore(err, "Errore durante l'eliminazione.")));
    };

    // moderazione: eliminazione di un feedback
    const eliminaFeedback = (id) => {
        if (!window.confirm('Eliminare questo feedback?')) return;
        setErrore('');
        eliminaFeedbackApi(id)
            .then(() => caricaDati())
            .catch((err) => setErrore(messaggioErrore(err, "Errore durante l'eliminazione del feedback.")));
    };

    // apre il pannello scelto sotto la mostra; un secondo clic sullo stesso pulsante lo richiude
    const apriPannello = (id, tipo) => setAperta(aperta?.id === id && aperta?.tipo === tipo ? null : { id, tipo });

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#bbbbbb', mb: 4 }}>
                ← Torna alla Home
            </Button>

            {/* tre casi: visitatore collegato (deve uscire), admin non collegato (login), admin collegato (dashboard) */}
            {visitatore ? (
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 3 }}>
                            Area Riservata
                        </Typography>
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            Sei collegato come visitatore ({visitatore.nome} {visitatore.cognome}). Per accedere
                            all&apos;area riservata devi prima uscire dal tuo account.
                        </Alert>
                        <Button
                            onClick={logoutUtente}
                            variant="contained"
                            color="primary"
                            sx={{ borderRadius: 0, fontWeight: 'bold' }}
                        >
                            Esci dall&apos;account visitatore
                        </Button>
                    </CardContent>
                </Card>
            ) : !isLoggedIn ? (
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 4 }}>
                            Area Riservata - Accesso Admin
                        </Typography>

                        <Box
                            component="form"
                            onSubmit={handleLogin}
                            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                        >
                            <TextField
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                label="Email Amministratore"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                sx={inputStyle}
                            />
                            <TextField
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                sx={inputStyle}
                            />
                            {erroreLogin && <Alert severity="error">{erroreLogin}</Alert>}
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="large"
                                disabled={loginInCorso}
                                sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}
                            >
                                {loginInCorso ? 'Verifica in corso...' : 'ACCEDI'}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            ) : (
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 2,
                                mb: 4,
                            }}
                        >
                            <Typography variant="h4" sx={{ color: '#c5a059' }}>
                                Dashboard Admin - Esposizioni
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    component={Link}
                                    to="/admin/nuova"
                                    variant="contained"
                                    color="primary"
                                    sx={{ borderRadius: 0, fontWeight: 'bold' }}
                                >
                                    Nuova Mostra
                                </Button>
                                <Button
                                    component={Link}
                                    to="/admin/verifica"
                                    variant="outlined"
                                    color="primary"
                                    sx={{ borderRadius: 0, fontWeight: 'bold' }}
                                >
                                    Verifica ingresso
                                </Button>
                                <Button onClick={handleLogout} variant="outlined" color="primary" size="small">
                                    Esci
                                </Button>
                            </Box>
                        </Box>

                        {messaggio && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                {messaggio}
                            </Alert>
                        )}
                        {errore && (
                            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrore('')}>
                                {errore}
                            </Alert>
                        )}

                        <IndicatoriDashboard statistiche={statistiche} />

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

                        {loading && mostre.length === 0 && (
                            <Box sx={{ textAlign: 'center' }}>
                                <CircularProgress color="primary" />
                            </Box>
                        )}
                        {!loading && mostre.length === 0 && !errore && (
                            <Typography sx={{ color: '#aaaaaa' }}>
                                Nessuna mostra presente. Creane una con "Nuova Mostra".
                            </Typography>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {mostre.map((m) => {
                                // prenotazioni e feedback di questa mostra
                                const elenco = prenotazioni.filter((p) => p.mostra_id === m.id);
                                const recensioni = feedback.filter((f) => f.mostra_id === m.id);
                                return (
                                    <Box
                                        key={m.id}
                                        sx={{
                                            p: 2.5,
                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 2,
                                            }}
                                        >
                                            <Box>
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{ color: '#c5a059', fontWeight: 'bold' }}
                                                >
                                                    {m.titolo}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#aaaaaa' }}>
                                                    Periodo: Dal {m.data_inizio} al {m.data_fine}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                <Button
                                                    variant="text"
                                                    color="inherit"
                                                    size="small"
                                                    onClick={() => apriPannello(m.id, 'prenotazioni')}
                                                >
                                                    Prenotazioni ({elenco.length})
                                                </Button>
                                                <Button
                                                    variant="text"
                                                    color="inherit"
                                                    size="small"
                                                    onClick={() => apriPannello(m.id, 'feedback')}
                                                >
                                                    Feedback ({recensioni.length})
                                                </Button>
                                                <Button
                                                    component={Link}
                                                    to={`/esposizione/${m.id}`}
                                                    variant="outlined"
                                                    color="inherit"
                                                    size="small"
                                                    aria-label={`Vedi la mostra ${m.titolo}`}
                                                >
                                                    Vedi
                                                </Button>
                                                <Button
                                                    component={Link}
                                                    to={`/admin/modifica/${m.id}`}
                                                    variant="outlined"
                                                    color="primary"
                                                    size="small"
                                                >
                                                    Modifica
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="error"
                                                    size="small"
                                                    onClick={() => eliminaMostra(m.id)}
                                                >
                                                    Elimina
                                                </Button>
                                            </Box>
                                        </Box>

                                        {/* pannelli apribili con l'elenco delle prenotazioni e dei feedback */}
                                        <Collapse
                                            in={aperta?.id === m.id && aperta?.tipo === 'prenotazioni'}
                                            unmountOnExit
                                        >
                                            <Box sx={{ mt: 2 }}>
                                                {elenco.length === 0 ? (
                                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                                        Nessuna prenotazione.
                                                    </Typography>
                                                ) : (
                                                    elenco.map((p) => (
                                                        <Typography
                                                            key={p.id}
                                                            variant="body2"
                                                            sx={{
                                                                color: '#ddd',
                                                                py: 0.5,
                                                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                                            }}
                                                        >
                                                            {p.codice && (
                                                                <Link
                                                                    to={`/admin/verifica?codice=${p.codice}`}
                                                                    style={{
                                                                        color: '#c5a059',
                                                                        fontFamily: 'monospace',
                                                                    }}
                                                                >
                                                                    {p.codice}
                                                                </Link>
                                                            )}
                                                            {p.codice && ' · '}
                                                            {p.nome} {p.cognome} · {p.email} · {p.telefono} ·{' '}
                                                            {new Date(p.creata_il + 'Z').toLocaleString('it-IT')}
                                                            {p.ingresso_il && ' · ✓ entrato'}
                                                        </Typography>
                                                    ))
                                                )}
                                            </Box>
                                        </Collapse>

                                        <Collapse in={aperta?.id === m.id && aperta?.tipo === 'feedback'} unmountOnExit>
                                            <Box sx={{ mt: 2 }}>
                                                {recensioni.length === 0 ? (
                                                    <Typography variant="body2" sx={{ color: '#888' }}>
                                                        Nessun feedback.
                                                    </Typography>
                                                ) : (
                                                    recensioni.map((f) => (
                                                        <Box
                                                            key={f.id}
                                                            sx={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                gap: 2,
                                                                py: 0.5,
                                                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                                            }}
                                                        >
                                                            <Typography variant="body2" sx={{ color: '#ddd' }}>
                                                                {'★'.repeat(f.voto)} · {f.nome}
                                                                {f.commento && ` · ${f.commento}`}
                                                            </Typography>
                                                            <Button
                                                                size="small"
                                                                color="error"
                                                                onClick={() => eliminaFeedback(f.id)}
                                                            >
                                                                Elimina
                                                            </Button>
                                                        </Box>
                                                    ))
                                                )}
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
