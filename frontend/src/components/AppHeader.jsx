import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import useUtente from '../hooks/useUtente';

export default function AppHeader() {
    const utente = useUtente();

    return (
        <AppBar position="static" color="transparent" elevation={0} className="app-header">
            <Toolbar>
                <Typography variant="h6" className="app-header__title">
                    <Link to="/">MUSEO CIVICO DIGITALE</Link>
                </Typography>
                {utente ? (
                    <Button component={Link} to="/profilo" color="inherit" className="app-header__button">
                        Ciao, {utente.nome}
                    </Button>
                ) : (
                    <Button component={Link} to="/accedi" color="inherit" className="app-header__button">
                        Accedi
                    </Button>
                )}
                <Button component={Link} to="/admin" color="inherit" className="app-header__button">
                    Area Riservata
                </Button>
            </Toolbar>
        </AppBar>
    );
}
