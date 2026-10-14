import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

export default function AppHeader() {
    return (
        <AppBar position="static" color="transparent" elevation={0} className="app-header">
            <Toolbar>
                <Typography variant="h6" className="app-header__title">
                    <Link to="/">MUSEO CIVICO DIGITALE</Link>
                </Typography>
                <Button component={Link} to="/admin" color="inherit" className="app-header__button">
                    Area Riservata
                </Button>
            </Toolbar>
        </AppBar>
    );
}
