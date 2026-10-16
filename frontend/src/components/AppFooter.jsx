import { Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, Divider } from '@mui/material';
import useLingua from '../hooks/useLingua';

const titolo = { color: '#c5a059', mb: 1.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.85rem' };
const riga = { color: '#cccccc', fontSize: '0.95rem', lineHeight: 1.8 };

// Footer con orari, indirizzo e contatti per le prenotazioni (dati di esempio del progetto)
export default function AppFooter() {
    const { t } = useLingua();
    return (
        // il contenitore spinge il footer in fondo alla pagina e lascia spazio sopra
        <Box sx={{ mt: 'auto', pt: { xs: 8, md: 10 } }}>
            <Box
                component="footer"
                sx={{
                    borderTop: '1px solid rgba(197, 160, 89, 0.3)',
                    backgroundColor: 'rgba(5, 5, 5, 0.85)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <Container maxWidth="lg" sx={{ py: 6 }}>
                    <Grid container spacing={5}>
                        <Grid size={{ xs: 12, md: 4 }} component="section" aria-label={t('footer.orariTitolo')}>
                            <Typography variant="h6" component="h2" sx={titolo}>
                                {t('footer.orariTitolo')}
                            </Typography>
                            <Typography sx={riga}>{t('footer.giorni')}</Typography>
                            <Typography sx={{ ...riga, color: '#ffffff', fontWeight: 700 }}>
                                {t('footer.orario')}
                            </Typography>
                            <Typography sx={{ ...riga, color: '#999999' }}>{t('footer.domenica')}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }} component="section" aria-label={t('footer.doveTitolo')}>
                            <Typography variant="h6" component="h2" sx={titolo}>
                                {t('footer.doveTitolo')}
                            </Typography>
                            <Typography component="address" sx={{ ...riga, fontStyle: 'normal' }}>
                                {t('footer.indirizzo1')}
                                <br />
                                {t('footer.indirizzo2')}
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }} component="section" aria-label={t('footer.prenotazioniTitolo')}>
                            <Typography variant="h6" component="h2" sx={titolo}>
                                {t('footer.prenotazioniTitolo')}
                            </Typography>
                            <Typography sx={riga}>
                                <a href="tel:+390212345678" style={{ color: 'inherit' }}>
                                    {t('footer.telefono')}
                                </a>
                            </Typography>
                            <Typography sx={riga}>
                                <a href={`mailto:${t('footer.email')}`} style={{ color: '#c5a059' }}>
                                    {t('footer.email')}
                                </a>
                            </Typography>
                            <Typography sx={{ ...riga, color: '#999999' }}>
                                <Link to="/esposizioni" style={{ color: 'inherit' }}>
                                    {t('footer.online')}
                                </Link>
                            </Typography>
                        </Grid>
                    </Grid>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 4 }} />
                    <Typography sx={{ color: '#777777', fontSize: '0.8rem', textAlign: 'center' }}>
                        {t('footer.diritti', { anno: new Date().getFullYear() })}
                    </Typography>
                </Container>
            </Box>
        </Box>
    );
}
