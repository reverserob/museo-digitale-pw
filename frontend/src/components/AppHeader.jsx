import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import useUtente from '../hooks/useUtente';
import useAdmin from '../hooks/useAdmin';
import { logoutUtente } from '../services/utentiService';
import { logout } from '../services/authService';

export default function AppHeader() {
    const utente = useUtente();
    const admin = useAdmin();
    const navigate = useNavigate();

    const esci = () => {
        if (admin) logout();
        else logoutUtente();
        navigate('/');
    };

    return (
        <AppBar position="static" color="transparent" elevation={0} className="app-header">
            <Toolbar>
                <Typography variant="h6" className="app-header__title">
                    <Link to="/">MUSEO CIVICO DIGITALE</Link>
                </Typography>
                {admin ? (
                    // amministratore collegato: niente Accedi/Registrati dei visitatori
                    <>
                        <Button component={Link} to="/admin" color="inherit" className="app-header__button">
                            Ciao, Admin
                        </Button>
                        <Button onClick={esci} color="inherit" className="app-header__button">
                            Esci
                        </Button>
                    </>
                ) : utente ? (
                    <>
                        <Button component={Link} to="/profilo" color="inherit" className="app-header__button">
                            Ciao, {utente.nome}
                        </Button>
                        <Button onClick={esci} color="inherit" className="app-header__button">
                            Esci
                        </Button>
                    </>
                ) : (
                    <>
                        <Button component={Link} to="/accedi" color="inherit" className="app-header__button">
                            Accedi
                        </Button>
                        {/* l'area riservata si raggiunge solo quando nessun visitatore è collegato */}
                        <Button component={Link} to="/admin" color="inherit" className="app-header__button">
                            Area Riservata
                        </Button>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
}
