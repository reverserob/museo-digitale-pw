/**
 * Pagina di accesso dei visitatori (`/accedi`) con due schede: Accedi (login) e Registrati (nuovo account).
 *
 * @module pages/Accedi
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Tabs, Tab, Box, TextField, Button, Alert } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { loginUtente, registrazione } from '../services/utentiService';
import useUtente from '../hooks/useUtente';
import useAdmin from '../hooks/useAdmin';
import { logout } from '../services/authService';
import { REGOLE_PASSWORD } from '../utils/password';
import useLingua from '../hooks/useLingua';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };
// proprietà comuni a tutti i campi del form
const campo = { slotProps: { inputLabel: { shrink: true } }, fullWidth: true, sx: inputStyle };

/**
 * Controllo dell'email durante la digitazione.
 *
 * @private
 * @param {string} valore Email digitata.
 * @returns {string} Chiave del messaggio che spiega l'errore specifico (spazi, chiocciola mancante,
 *   dominio non valido...) oppure `''` se l'email è valida o il campo è vuoto.
 * @alias module:pages/Accedi.erroreEmail
 */
function erroreEmail(valore) {
    const email = valore.trim();
    if (!email) return '';
    if (/\s/.test(email)) return 'accedi.emailSpazi';
    const chiocciole = (email.match(/@/g) || []).length;
    if (chiocciole === 0) return 'accedi.emailChiocciola';
    if (chiocciole > 1) return 'accedi.emailDueChiocciole';
    const [locale, dominio] = email.split('@');
    if (!locale) return 'accedi.emailLocale';
    if (!dominio) return 'accedi.emailDominioMancante';
    if (!/^[A-Za-z0-9._%+-]+$/.test(locale) || !/^[A-Za-z0-9.-]+$/.test(dominio)) return 'accedi.emailCaratteri';
    if (locale.startsWith('.') || locale.endsWith('.') || email.includes('..')) return 'accedi.emailPunti';
    if (!/^([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(dominio)) return 'accedi.emailDominio';
    return '';
}

// nome e cognome: almeno 3 caratteri
const erroreNome = (valore) => (valore.length > 0 && valore.trim().length < 3 ? 'accedi.nomeCorto' : '');

// accetto solo indirizzi interni al sito come destinazione dopo il login
const destinazioneSicura = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/profilo');

/**
 * Pagina Accedi / Registrati.
 *
 * Dopo l'accesso porta all'indirizzo indicato nel parametro `next` (solo indirizzi interni al sito),
 * altrimenti all'area personale. Se è già collegato l'admin o un visitatore mostra solo dei collegamenti.
 *
 * @returns {JSX.Element} La pagina.
 * @alias module:pages/Accedi.Accedi
 */
export default function Accedi() {
    const navigate = useNavigate();
    const [parametri] = useSearchParams();
    const next = destinazioneSicura(parametri.get('next'));
    const utente = useUtente();
    const admin = useAdmin();
    const { t } = useLingua();

    // scheda attiva: 0 = Accedi, 1 = Registrati
    const [scheda, setScheda] = useState(0);
    const [dati, setDati] = useState({ nome: '', cognome: '', email: '', telefono: '', password: '', conferma: '' });
    const [errore, setErrore] = useState('');
    const [invio, setInvio] = useState(false);

    // restituisce il gestore onChange di un campo: aggiorna solo quella proprietà di dati
    const aggiorna = (nomeCampo) => (e) => setDati({ ...dati, [nomeCampo]: e.target.value });

    const requisitiMancanti = REGOLE_PASSWORD.filter((r) => !r.ok(dati.password)).map((r) => t(r.chiave));
    const passwordValida = requisitiMancanti.length === 0;
    const confermaErrata = dati.conferma.length > 0 && dati.conferma !== dati.password;

    // le funzioni di controllo restituiscono la chiave del messaggio, tradotta qui
    const traduciChiave = (chiave) => (chiave ? t(chiave) : '');
    const errori = {
        nome: traduciChiave(erroreNome(dati.nome)),
        cognome: traduciChiave(erroreNome(dati.cognome)),
        email: traduciChiave(erroreEmail(dati.email)),
        telefono: dati.telefono && !/^\d{6,15}$/.test(dati.telefono.trim()) ? t('comune.soloCifre') : '',
    };

    // il pulsante Registrati si attiva solo quando tutti i campi rispettano le regole del backend
    const registrazioneValida =
        dati.nome.trim().length >= 3 &&
        dati.cognome.trim().length >= 3 &&
        dati.email.trim() !== '' &&
        !errori.email &&
        /^\d{6,15}$/.test(dati.telefono.trim()) &&
        passwordValida &&
        dati.conferma === dati.password;

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrore('');
        setInvio(true);
        // la stessa funzione gestisce login e registrazione, in base alla scheda attiva
        const richiesta =
            scheda === 0
                ? loginUtente(dati.email.trim(), dati.password)
                : registrazione({
                      nome: dati.nome.trim(),
                      cognome: dati.cognome.trim(),
                      email: dati.email.trim(),
                      telefono: dati.telefono.trim(),
                      password: dati.password,
                  });
        richiesta
            // dopo la registrazione la pagina successiva mostra la conferma (email inviata)
            .then(() => navigate(next, { replace: true, state: scheda === 1 ? { registrato: true } : null }))
            .catch((err) => setErrore(messaggioErrore(err, t('accedi.errore'))))
            .finally(() => setInvio(false));
    };

    // amministratore collegato: niente login visitatori, solo il collegamento alla dashboard
    if (admin) {
        return (
            <Container maxWidth="sm" sx={{ mt: { xs: 5, md: 10 } }}>
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Typography variant="h5" sx={{ color: '#c5a059', mb: 2 }}>
                            {t('accedi.admin')}
                        </Typography>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            {t('accedi.adminInfo')}
                        </Alert>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button component={Link} to="/admin" variant="contained" sx={{ borderRadius: 0 }}>
                                {t('accedi.adminDashboard')}
                            </Button>
                            <Button onClick={logout} variant="outlined" sx={{ borderRadius: 0 }}>
                                {t('accedi.adminEsci')}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        );
    }

    // visitatore già collegato: collegamenti all'area personale e alle mostre
    if (utente) {
        return (
            <Container maxWidth="sm" sx={{ mt: { xs: 5, md: 10 } }}>
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Typography variant="h5" sx={{ color: '#c5a059', mb: 2 }}>
                            {t('accedi.giaCollegato', { nome: `${utente.nome} ${utente.cognome}` })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button component={Link} to="/profilo" variant="contained" sx={{ borderRadius: 0 }}>
                                {t('accedi.miaArea')}
                            </Button>
                            <Button component={Link} to="/esposizioni" variant="outlined" sx={{ borderRadius: 0 }}>
                                {t('accedi.tornaMostre')}
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Typography variant="h4" sx={{ color: '#c5a059', mb: 1 }}>
                        {scheda === 0 ? t('accedi.titoloAccedi') : t('accedi.titoloRegistrati')}
                    </Typography>
                    <Typography sx={{ color: '#aaaaaa', mb: 3 }}>{t('accedi.intro')}</Typography>

                    <Tabs
                        value={scheda}
                        onChange={(_, valore) => {
                            setScheda(valore);
                            setErrore('');
                        }}
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{ mb: 3, '& .MuiTab-root': { color: '#bbbbbb' } }}
                    >
                        <Tab label={t('accedi.schedaAccedi')} />
                        <Tab label={t('accedi.schedaRegistrati')} />
                    </Tabs>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                    >
                        {/* i campi nome, cognome, telefono e conferma password compaiono solo nella scheda Registrati */}
                        {scheda === 1 && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <TextField
                                    {...campo}
                                    label={t('comune.nome')}
                                    value={dati.nome}
                                    onChange={aggiorna('nome')}
                                    error={Boolean(errori.nome)}
                                    helperText={errori.nome}
                                    required
                                />
                                <TextField
                                    {...campo}
                                    label={t('comune.cognome')}
                                    value={dati.cognome}
                                    onChange={aggiorna('cognome')}
                                    error={Boolean(errori.cognome)}
                                    helperText={errori.cognome}
                                    required
                                />
                            </Box>
                        )}
                        <TextField
                            {...campo}
                            label={t('comune.email')}
                            type="email"
                            autoComplete="email"
                            value={dati.email}
                            onChange={aggiorna('email')}
                            error={Boolean(errori.email)}
                            helperText={errori.email}
                            required
                        />
                        {scheda === 1 && (
                            <TextField
                                {...campo}
                                label={t('comune.telefono')}
                                autoComplete="tel"
                                value={dati.telefono}
                                onChange={aggiorna('telefono')}
                                error={Boolean(errori.telefono)}
                                helperText={errori.telefono || t('comune.soloCifre')}
                                required
                            />
                        )}
                        <TextField
                            {...campo}
                            label={t('comune.password')}
                            type="password"
                            autoComplete={scheda === 0 ? 'current-password' : 'new-password'}
                            value={dati.password}
                            onChange={aggiorna('password')}
                            error={scheda === 1 && dati.password.length > 0 && !passwordValida}
                            helperText={
                                scheda !== 1
                                    ? ''
                                    : passwordValida
                                      ? t('comune.passwordValida')
                                      : t('comune.serve', { elenco: requisitiMancanti.join(', ') })
                            }
                            required
                        />
                        {scheda === 1 && (
                            <TextField
                                {...campo}
                                label={t('comune.confermaPassword')}
                                type="password"
                                autoComplete="new-password"
                                value={dati.conferma}
                                onChange={aggiorna('conferma')}
                                error={confermaErrata}
                                helperText={confermaErrata ? t('comune.passwordNonCoincidono') : ''}
                                required
                            />
                        )}
                        {scheda === 0 && (
                            <Button
                                component={Link}
                                to="/password-dimenticata"
                                size="small"
                                sx={{ alignSelf: 'flex-end', mt: -1.5, color: '#c5a059', textTransform: 'none' }}
                            >
                                {t('accedi.dimenticata')}
                            </Button>
                        )}
                        {errore && <Alert severity="error">{errore}</Alert>}
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={invio || (scheda === 1 && !registrazioneValida)}
                            sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}
                        >
                            {invio
                                ? t('comune.attendere')
                                : scheda === 0
                                  ? t('accedi.pulsanteAccedi')
                                  : t('accedi.pulsanteRegistrati')}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
