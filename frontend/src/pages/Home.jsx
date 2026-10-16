import { Link } from 'react-router-dom';
import { Container, Typography, Grid, Box, Button, Card, CardContent } from '@mui/material';
import useLingua from '../hooks/useLingua';

const PUNTI = [
    { icona: '🖼️', titolo: 'home.puntoMostreTitolo', testo: 'home.puntoMostre' },
    { icona: '🎟️', titolo: 'home.puntoPrenotaTitolo', testo: 'home.puntoPrenota' },
    { icona: '⭐', titolo: 'home.puntoOpinioniTitolo', testo: 'home.puntoOpinioni' },
];

const quadro = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 8,
    border: '1px solid rgba(197, 160, 89, 0.35)',
    display: 'block',
};

// Pagina iniziale: presenta il museo e porta alle esposizioni correnti
export default function Home() {
    const { t } = useLingua();

    const pulsante = (
        <Button
            component={Link}
            to="/esposizioni"
            variant="contained"
            color="primary"
            size="large"
            sx={{ borderRadius: 0, px: 5, py: 1.8, fontWeight: 700 }}
        >
            {t('home.vaiEsposizioni')} →
        </Button>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 10 } }}>
            {/* apertura */}
            <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" sx={{ color: '#c5a059', fontSize: '0.85rem' }}>
                        {t('home.sopratitolo')}
                    </Typography>
                    <Typography
                        variant="h2"
                        component="h1"
                        sx={{ color: '#ffffff', fontSize: { xs: '2.6rem', md: '4rem' }, lineHeight: 1.05, mb: 3 }}
                    >
                        {t('home.titolo')}
                    </Typography>
                    <Typography sx={{ color: '#cccccc', fontSize: '1.15rem', lineHeight: 1.8, mb: 5, maxWidth: 520 }}>
                        {t('home.sottotitolo')}
                    </Typography>
                    {pulsante}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.3fr 1fr',
                            gridTemplateRows: { xs: '150px 150px', md: '210px 210px' },
                            gap: 2,
                        }}
                        aria-hidden="true"
                    >
                        <Box sx={{ gridRow: 'span 2' }}>
                            <img src="/images/home/caravaggio.webp" alt="" style={quadro} />
                        </Box>
                        <img src="/images/home/monet.webp" alt="" style={quadro} />
                        <img src="/images/home/leonardo-da-vinci.webp" alt="" style={quadro} />
                    </Box>
                </Grid>
            </Grid>

            {/* il museo */}
            <Box
                component="section"
                aria-labelledby="titolo-museo"
                sx={{ mt: { xs: 8, md: 12 }, pt: 6, borderTop: '1px solid rgba(197, 160, 89, 0.3)' }}
            >
                <Grid container spacing={{ xs: 3, md: 8 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Typography id="titolo-museo" variant="h4" component="h2" sx={{ color: '#c5a059' }}>
                            {t('home.chiSiamoTitolo')}
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Typography sx={{ color: '#dddddd', fontSize: '1.05rem', lineHeight: 1.9, mb: 2 }}>
                            {t('home.chiSiamo1')}
                        </Typography>
                        <Typography sx={{ color: '#bbbbbb', fontSize: '1.05rem', lineHeight: 1.9 }}>
                            {t('home.chiSiamo2')}
                        </Typography>
                    </Grid>
                </Grid>
            </Box>

            {/* cosa offre */}
            <Grid container spacing={3} sx={{ mt: { xs: 6, md: 8 } }}>
                {PUNTI.map((punto) => (
                    <Grid key={punto.titolo} size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
                        <Card
                            elevation={0}
                            sx={{ flex: 1, backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.25)' }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Typography sx={{ fontSize: '1.8rem', mb: 1 }} aria-hidden="true">
                                    {punto.icona}
                                </Typography>
                                <Typography variant="h6" component="h3" sx={{ color: '#ffffff', mb: 1 }}>
                                    {t(punto.titolo)}
                                </Typography>
                                <Typography sx={{ color: '#bbbbbb', lineHeight: 1.7 }}>{t(punto.testo)}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ textAlign: 'center', mt: { xs: 6, md: 9 } }}>{pulsante}</Box>
        </Container>
    );
}
