import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Card, CardContent, Button, Box, CircularProgress, TextField } from '@mui/material';

export default function FormPrenotazione() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mostra, setMostre] = useState(null);

    const [quantita, setQuantita] = useState(1);
    const [acquirente, setAcquirente] = useState({ nome: '', cognome: '', email: '', telefono: '' });
    const [ospiti, setOspiti] = useState([]);

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/mostre/${id}`)
            .then(response => setMostre(response.data))
            .catch(error => console.error(error));
    }, [id]);

    useEffect(() => {
        const numeroOspiti = Math.min(Math.max(quantita - 1, 0), 4);
        setOspiti(prev => {
            const nuoviOspiti = [...prev];
            while (nuoviOspiti.length < numeroOspiti) nuoviOspiti.push({ id: Math.random(), nome: '', cognome: '', email: '', telefono: '' });
            while (nuoviOspiti.length > numeroOspiti) nuoviOspiti.pop();
            return nuoviOspiti;
        });
    }, [quantita]);

    const handleAcquirenteChange = (campo) => (e) => setAcquirente({ ...acquirente, [campo]: e.target.value });
    const handleOspiteChange = (index, campo) => (e) => {
        const nuoviOspiti = [...ospiti];
        nuoviOspiti[index][campo] = e.target.value;
        setOspiti(nuoviOspiti);
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateTelefono = (telefono) => /^[0-9+\s-]{8,15}$/.test(telefono);

    const isAcquirenteValid = acquirente.nome.trim() && acquirente.cognome.trim() && validateEmail(acquirente.email) && validateTelefono(acquirente.telefono);
    const isOspitiValid = ospiti.every(o => o.nome.trim() && o.cognome.trim() && validateEmail(o.email) && validateTelefono(o.telefono));
    const formValido = isAcquirenteValid && isOspitiValid && quantita >= 1 && quantita <= 5 && quantita <= (mostra?.capienza_massima || 5);

    const handlePrenotazione = () => {
        alert(`Prenotazione di ${quantita} biglietti validata. Verifica la console!`);
    };

    if (!mostra) return <Box textAlign="center" mt={20}><CircularProgress color="primary" /></Box>;

    const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

    return (
        <Container maxWidth="md" sx={{ mt: 10 }}>
            <Button onClick={() => navigate(`/esposizione/${id}`)} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna ai dettagli della mostra
            </Button>

            <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.8)', p: 4 }}>
                <CardContent>
                    <Typography variant="h4" gutterBottom sx={{ color: '#c5a059' }}>Acquisto Biglietti: {mostra.titolo}</Typography>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={4} mb={5} p={3} sx={{ backgroundColor: 'rgba(197, 160, 89, 0.1)', borderRadius: 2, border: '1px solid rgba(197, 160, 89, 0.3)' }}>
                        <Typography variant="h6" sx={{ color: '#c5a059', letterSpacing: 1 }}>Configura Prenotazione</Typography>
                        <TextField
                            label="Quantità (Max 5)"
                            type="number"
                            size="small"
                            InputProps={{ inputProps: { min: 1, max: 5 } }}
                            value={quantita}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') setQuantita('');
                                else if (Number(val) > 5) setQuantita(5);
                                else if (Number(val) < 1) setQuantita(1);
                                else setQuantita(Number(val));
                            }}
                            onBlur={() => { if (quantita === '') setQuantita(1); }}
                            sx={{ width: 150, input: { color: 'white' }, label: { color: '#c5a059' }, fieldset: { borderColor: '#c5a059' } }}
                        />
                    </Box>

                    <Box sx={{ mb: 4, p: 4, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" sx={{ color: '#c5a059', mb: 3 }}>Biglietto 1 (Intestatario)</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}><TextField fullWidth label="Nome" value={acquirente.nome} onChange={handleAcquirenteChange('nome')} sx={inputStyle} /></Grid>
                            <Grid item xs={12} sm={6}><TextField fullWidth label="Cognome" value={acquirente.cognome} onChange={handleAcquirenteChange('cognome')} sx={inputStyle} /></Grid>
                            <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={acquirente.email} onChange={handleAcquirenteChange('email')} error={acquirente.email.length > 0 && !validateEmail(acquirente.email)} sx={inputStyle} /></Grid>
                            <Grid item xs={12} sm={6}><TextField fullWidth label="Telefono" value={acquirente.telefono} onChange={handleAcquirenteChange('telefono')} error={acquirente.telefono.length > 0 && !validateTelefono(acquirente.telefono)} sx={inputStyle} /></Grid>
                        </Grid>
                    </Box>

                    {ospiti.map((ospite, index) => (
                        <Box key={ospite.id} sx={{ mb: 4, p: 4, backgroundColor: 'rgba(255, 255, 255, 0.01)', borderRadius: 2, border: '1px dashed rgba(197, 160, 89, 0.3)' }}>
                            <Typography variant="h6" sx={{ color: '#e0e0e0', mb: 3 }}>Biglietto {index + 2} (Ospite)</Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}><TextField fullWidth label="Nome" value={ospite.nome} onChange={handleOspiteChange(index, 'nome')} sx={inputStyle} /></Grid>
                                <Grid item xs={12} sm={6}><TextField fullWidth label="Cognome" value={ospite.cognome} onChange={handleOspiteChange(index, 'cognome')} sx={inputStyle} /></Grid>
                                <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={ospite.email} onChange={handleOspiteChange(index, 'email')} error={ospite.email.length > 0 && !validateEmail(ospite.email)} sx={inputStyle} /></Grid>
                                <Grid item xs={12} sm={6}><TextField fullWidth label="Telefono" value={ospite.telefono} onChange={handleOspiteChange(index, 'telefono')} error={ospite.telefono.length > 0 && !validateTelefono(ospite.telefono)} sx={inputStyle} /></Grid>
                            </Grid>
                        </Box>
                    ))}

                    <Box sx={{ borderTop: '1px solid rgba(197, 160, 89, 0.3)', pt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" color="primary" size="large" onClick={handlePrenotazione} disabled={!formValido} sx={{ borderRadius: 0, px: 5, letterSpacing: 1, fontWeight: 'bold' }}>
                            PAGA ORA
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
