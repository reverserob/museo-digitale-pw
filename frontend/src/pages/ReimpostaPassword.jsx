import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, TextField, Button, Alert } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { reimpostaPassword } from '../services/utentiService';
import { requisitiMancanti } from '../utils/password';
import { traduciServer } from '../i18n/lingua';
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
    sx: { input: { color: 'white' }, label: { color: '#999999' } },
};

export default function ReimpostaPassword() {
    const [parametri] = useSearchParams();
    const { t } = useLingua();
    const token = parametri.get('token') || '';
    const [password, setPassword] = useState('');
    const [conferma, setConferma] = useState('');
    const [errore, setErrore] = useState('');
    const [fatto, setFatto] = useState('');
    const [invio, setInvio] = useState(false);

    const mancanti = requisitiMancanti(password).map((chiave) => t(chiave));
    const confermaErrata = conferma.length > 0 && conferma !== password;
    const valida = mancanti.length === 0 && conferma === password;

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrore('');
        setInvio(true);
        reimpostaPassword(token, password)
            .then((testo) => setFatto(traduciServer(testo)))
            .catch((err) => setErrore(messaggioErrore(err, t('reset.erroreSalva'))))
            .finally(() => setInvio(false));
    };

    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Typography variant="h4" sx={{ color: '#c5a059', mb: 3 }}>
                        {t('reset.nuovaTitolo')}
                    </Typography>

                    {!token ? (
                        <Alert severity="error">
                            {t('reset.linkNonValido')}{' '}
                            <Link to="/password-dimenticata">{t('reset.richiedineUno')}</Link>.
                        </Alert>
                    ) : fatto ? (
                        <>
                            <Alert severity="success" sx={{ mb: 3 }}>
                                {fatto}
                            </Alert>
                            <Button component={Link} to="/accedi" variant="contained" sx={{ borderRadius: 0 }}>
                                {t('reset.vaiAccesso')}
                            </Button>
                        </>
                    ) : (
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                        >
                            <TextField
                                {...campo}
                                label={t('reset.nuova')}
                                type="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                error={password.length > 0 && mancanti.length > 0}
                                helperText={
                                    mancanti.length === 0
                                        ? t('comune.passwordValida')
                                        : t('comune.serve', { elenco: mancanti.join(', ') })
                                }
                                required
                            />
                            <TextField
                                {...campo}
                                label={t('comune.confermaPassword')}
                                type="password"
                                autoComplete="new-password"
                                value={conferma}
                                onChange={(e) => setConferma(e.target.value)}
                                error={confermaErrata}
                                helperText={confermaErrata ? t('comune.passwordNonCoincidono') : ''}
                                required
                            />
                            {errore && (
                                <Alert severity="error">
                                    {errore}{' '}
                                    <Link to="/password-dimenticata" style={{ color: 'inherit' }}>
                                        {t('reset.richiediNuovo')}
                                    </Link>
                                </Alert>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={invio || !valida}
                                sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}
                            >
                                {invio ? t('comune.attendere') : t('reset.salva')}
                            </Button>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
