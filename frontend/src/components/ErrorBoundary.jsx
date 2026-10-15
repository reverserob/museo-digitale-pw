import { Component } from 'react';
import { Container, Alert, Button, Typography } from '@mui/material';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { errore: null };
    }

    static getDerivedStateFromError(errore) {
        return { errore };
    }

    componentDidCatch(errore, info) {
        console.error('Errore nella pagina:', errore, info.componentStack);
    }

    render() {
        if (!this.state.errore) return this.props.children;
        return (
            <Container maxWidth="md" sx={{ mt: 10 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    Si è verificato un errore durante la visualizzazione della pagina.
                </Alert>
                <Typography
                    component="pre"
                    sx={{ color: '#bbbbbb', fontSize: '0.8rem', whiteSpace: 'pre-wrap', mb: 3 }}
                >
                    {String(this.state.errore?.message || this.state.errore)}
                </Typography>
                <Button variant="outlined" onClick={() => window.location.assign('/')}>
                    Torna alla home
                </Button>
            </Container>
        );
    }
}
