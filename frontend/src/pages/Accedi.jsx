import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Tabs, Tab, Box, TextField, Button, Alert } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { loginUtente, registrazione } from '../services/utentiService';
import useUtente from '../hooks/useUtente';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };
const campo = { slotProps: { inputLabel: { shrink: true } }, fullWidth: true, sx: inputStyle };

const REGOLE_PASSWORD = [
    { testo: 'almeno 6 caratteri', ok: (p) => p.length >= 6 },
    { testo: 'una lettera maiuscola', ok: (p) => /[A-Z]/.test(p) },
    { testo: 'un numero', ok: (p) => /\d/.test(p) },
];

function erroreEmail(valore) {
    const email = valore.trim();
    if (!email) return '';
    if (/\s/.test(email)) return "L'email non può contenere spazi";
    const chiocciole = (email.match(/@/g) || []).length;
    if (chiocciole === 0) return 'Manca la @ (es. nome@dominio.it)';
    if (chiocciole > 1) return "L'email deve contenere una sola @";
    const [locale, dominio] = email.split('@');
    if (!locale) return 'Manca la parte prima della @';
    if (!dominio) return 'Manca il dominio dopo la @ (es. gmail.com)';
    if (!/^[A-Za-z0-9._%+-]+$/.test(locale) || !/^[A-Za-z0-9.-]+$/.test(dominio))
        return "L'email contiene caratteri non ammessi";
    if (locale.startsWith('.') || locale.endsWith('.') || email.includes('..')) return "Punti non validi nell'email";
    if (!/^([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(dominio))
        return 'Il dominio non è valido (es. gmail.com)';
    return '';
}

const erroreNome = (valore) => (valore.length > 0 && valore.trim().length < 3 ? 'Inserisci almeno 3 caratteri' : '');

// accetto solo indirizzi interni al sito come destinazione dopo il login
const destinazioneSicura = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/profilo');

export default function Accedi() {
    const navigate = useNavigate();
    const [parametri] = useSearchParams();
    const next = destinazioneSicura(parametri.get('next'));
    const utente = useUtente();

    const [scheda, setScheda] = useState(0);
    const [dati, setDati] = useState({ nome: '', cognome: '', email: '', telefono: '', password: '', conferma: '' });
    const [errore, setErrore] = useState('');
    const [invio, setInvio] = useState(false);

    const aggiorna = (nomeCampo) => (e) => setDati({ ...dati, [nomeCampo]: e.target.value });

    const requisitiMancanti = REGOLE_PASSWORD.filter((r) => !r.ok(dati.password)).map((r) => r.testo);
    const passwordValida = requisitiMancanti.length === 0;
    const confermaErrata = dati.conferma.length > 0 && dati.conferma !== dati.password;

    const errori = {
        nome: erroreNome(dati.nome),
        cognome: erroreNome(dati.cognome),
        email: erroreEmail(dati.email),
        telefono: dati.telefono && !/^\d{6,15}$/.test(dati.telefono.trim()) ? 'Solo cifre, da 6 a 15' : '',
    };

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
            .then(() => navigate(next, { replace: true }))
            .catch((err) => setErrore(messaggioErrore(err, 'Operazione non riuscita. Riprova.')))
            .finally(() => setInvio(false));
    };

    if (utente) {
        return (
            <Container maxWidth="sm" sx={{ mt: { xs: 5, md: 10 } }}>
                <Card elevation={0} sx={cardSx}>
                    <CardContent>
                        <Typography variant="h5" sx={{ color: '#c5a059', mb: 2 }}>
                            Sei già collegato come {utente.nome} {utente.cognome}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button component={Link} to="/profilo" variant="contained" sx={{ borderRadius: 0 }}>
                                La mia area
                            </Button>
                            <Button component={Link} to="/" variant="outlined" sx={{ borderRadius: 0 }}>
                                Torna alle mostre
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
                        {scheda === 0 ? 'Accedi' : 'Crea un account'}
                    </Typography>
                    <Typography sx={{ color: '#aaaaaa', fontFamily: 'sans-serif', mb: 3 }}>
                        Per prenotare una visita o lasciare un feedback serve un account gratuito.
                    </Typography>

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
                        <Tab label="Accedi" />
                        <Tab label="Registrati" />
                    </Tabs>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                    >
                        {scheda === 1 && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <TextField
                                    {...campo}
                                    label="Nome"
                                    value={dati.nome}
                                    onChange={aggiorna('nome')}
                                    error={Boolean(errori.nome)}
                                    helperText={errori.nome}
                                    required
                                />
                                <TextField
                                    {...campo}
                                    label="Cognome"
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
                            label="Email"
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
                                label="Telefono"
                                autoComplete="tel"
                                value={dati.telefono}
                                onChange={aggiorna('telefono')}
                                error={Boolean(errori.telefono)}
                                helperText={errori.telefono || 'Solo cifre, da 6 a 15'}
                                required
                            />
                        )}
                        <TextField
                            {...campo}
                            label="Password"
                            type="password"
                            autoComplete={scheda === 0 ? 'current-password' : 'new-password'}
                            value={dati.password}
                            onChange={aggiorna('password')}
                            error={scheda === 1 && dati.password.length > 0 && !passwordValida}
                            helperText={
                                scheda !== 1
                                    ? ''
                                    : passwordValida
                                        ? 'Password valida'
                                        : `Serve: ${requisitiMancanti.join(', ')}`
                            }
                            required
                        />
                        {scheda === 1 && (
                            <TextField
                                {...campo}
                                label="Conferma password"
                                type="password"
                                autoComplete="new-password"
                                value={dati.conferma}
                                onChange={aggiorna('conferma')}
                                error={confermaErrata}
                                helperText={confermaErrata ? 'Le password non coincidono' : ''}
                                required
                            />
                        )}
                        {errore && <Alert severity="error">{errore}</Alert>}
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={invio || (scheda === 1 && !registrazioneValida)}
                            sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}
                        >
                            {invio ? 'Attendere...' : scheda === 0 ? 'ACCEDI' : 'CREA ACCOUNT'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
