import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import useUtente from '../hooks/useUtente';
import { logoutUtente } from '../services/utentiService';

export default function AppHeader() {
    const utente = useUtente();
    const navigate = useNavigate();

    const esci = () => {
        logoutUtente();
        navigate('/');
    };

    return (
        <AppBar position="static" color="transparent" elevation={0} className="app-header">
            <Toolbar>
                <Typography variant="h6" className="app-header__title">
                    <Link to="/">MUSEO CIVICO DIGITALE</Link>
                </Typography>
                {utente ? (
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
