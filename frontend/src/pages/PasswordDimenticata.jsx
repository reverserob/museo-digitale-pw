import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, TextField, Button, Alert } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { passwordDimenticata } from '../services/utentiService';
import { traduciServer } from '../i18n/lingua';
import useLingua from '../hooks/useLingua';

const cardSx = {
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(197, 160, 89, 0.5)',
    backgroundColor: 'rgba(10, 10, 10, 0.85)',
    p: { xs: 1, sm: 4 },
};
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

export default function PasswordDimenticata() {
    const { t } = useLingua();
    const [email, setEmail] = useState('');
    const [conferma, setConferma] = useState('');
    const [errore, setErrore] = useState('');
    const [invio, setInvio] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrore('');
        setInvio(true);
        passwordDimenticata(email.trim())
            .then((testo) => setConferma(traduciServer(testo)))
            .catch((err) => setErrore(messaggioErrore(err, t('reset.errore'))))
            .finally(() => setInvio(false));
    };

    return (
        <Container maxWidth="sm" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Typography variant="h4" sx={{ color: '#c5a059', mb: 1 }}>
                        {t('reset.titolo')}
                    </Typography>
                    <Typography sx={{ color: '#aaaaaa', mb: 3 }}>{t('reset.intro')}</Typography>

                    {conferma ? (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {conferma}
                        </Alert>
                    ) : (
                        <Box
                            component="form"
                            onSubmit={handleSubmit}
                            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                        >
                            <TextField
                                label={t('comune.email')}
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                fullWidth
                                sx={inputStyle}
                                required
                            />
                            {errore && <Alert severity="error">{errore}</Alert>}
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={invio || !email.trim()}
                                sx={{ borderRadius: 0, py: 1.5, fontWeight: 'bold' }}
                            >
                                {invio ? t('reset.invio') : t('reset.invia')}
                            </Button>
                        </Box>
                    )}
                    <Button component={Link} to="/accedi" sx={{ mt: 2, color: '#bbbbbb' }}>
                        {t('reset.tornaAccesso')}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
}
