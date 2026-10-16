import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Select, MenuItem, Box } from '@mui/material';
import useUtente from '../hooks/useUtente';
import useAdmin from '../hooks/useAdmin';
import useLingua from '../hooks/useLingua';
import { logoutUtente } from '../services/utentiService';
import { logout } from '../services/authService';

// menu a tendina della lingua: ITA / EN
function SceltaLingua() {
    const { lingua, setLingua, t } = useLingua();
    return (
        <Select
            value={lingua}
            onChange={(e) => setLingua(e.target.value)}
            variant="standard"
            disableUnderline
            inputProps={{ 'aria-label': t('lingua.etichetta') }}
            sx={{
                ml: 1,
                color: '#c5a059',
                fontSize: '0.85rem',
                fontWeight: 600,
                '& .MuiSvgIcon-root': { color: '#c5a059' },
            }}
        >
            <MenuItem value="it">ITA</MenuItem>
            <MenuItem value="en">EN</MenuItem>
        </Select>
    );
}

export default function AppHeader() {
    const utente = useUtente();
    const admin = useAdmin();
    const { t } = useLingua();
    const navigate = useNavigate();

    const esci = () => {
        if (admin) logout();
        else logoutUtente();
        navigate('/');
    };

    return (
        <AppBar position="static" color="transparent" elevation={0} className="app-header">
            <Toolbar sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                <Typography variant="h6" className="app-header__title">
                    <Link to="/">MUSEO CIVICO DIGITALE</Link>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button component={Link} to="/esposizioni" color="inherit" className="app-header__button">
                        {t('header.esposizioni')}
                    </Button>
                    {admin ? (
                        // amministratore collegato: niente Accedi/Registrati dei visitatori
                        <>
                            <Button component={Link} to="/admin" color="inherit" className="app-header__button">
                                {t('header.ciaoAdmin')}
                            </Button>
                            <Button onClick={esci} color="inherit" className="app-header__button">
                                {t('header.esci')}
                            </Button>
                        </>
                    ) : utente ? (
                        <>
                            <Button component={Link} to="/profilo" color="inherit" className="app-header__button">
                                {t('header.ciao', { nome: utente.nome })}
                            </Button>
                            <Button onClick={esci} color="inherit" className="app-header__button">
                                {t('header.esci')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button component={Link} to="/accedi" color="inherit" className="app-header__button">
                                {t('header.accedi')}
                            </Button>
                            {/* l'area riservata si raggiunge solo quando nessun visitatore è collegato */}
                            <Button component={Link} to="/admin" color="inherit" className="app-header__button">
                                {t('header.areaRiservata')}
                            </Button>
                        </>
                    )}
                    <SceltaLingua />
                </Box>
            </Toolbar>
        </AppBar>
    );
}
