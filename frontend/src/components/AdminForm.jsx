import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid } from '@mui/material';

export default function AdminForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [titolo, setTitolo] = useState('');
    const [descrizione, setDescrizione] = useState('');
    const [dataInizio, setDataInizio] = useState('');
    const [dataFine, setDataFine] = useState('');
    const [fileImmagini, setFileImmagini] = useState(null);
    const [messaggio, setMessaggio] = useState('');

    useEffect(() => {
        if (isEditMode) {
            axios.get(`http://127.0.0.1:8000/api/mostre/${id}`)
                .then(res => {
                    setTitolo(res.data.titolo);
                    setDescrizione(res.data.descrizione);
                    setDataInizio(res.data.data_inizio || '');
                    setDataFine(res.data.data_fine || '');
                })
                .catch(err => console.error(err));
        }
    }, [id, isEditMode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('titolo', titolo);
        formData.append('descrizione', descrizione);
        formData.append('data_inizio', dataInizio);
        formData.append('data_fine', dataFine);

        if (fileImmagini) {
            for (let i = 0; i < fileImmagini.length; i++) {
                formData.append('immagini', fileImmagini[i]);
            }
        }

        const config = { headers: { 'Content-Type': 'multipart/form-data' } };

        const request = isEditMode
            ? axios.put(`http://127.0.0.1:8000/api/mostre/${id}`, formData, config)
            : axios.post('http://127.0.0.1:8000/api/mostre', formData, config);

        request
            .then(() => {
                setMessaggio(isEditMode ? "Mostra modificata con successo!" : "Nuova mostra pubblicata con successo!");
                setTimeout(() => navigate('/admin'), 1200);
            })
            .catch(err => console.error("Errore salvataggio:", err));
    };

    const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };

    return (
        <Container maxWidth="md" sx={{ mt: 10, mb: 10 }}>
            <Button onClick={() => navigate('/admin')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alla Dashboard
            </Button>

            <Card elevation={0} sx={{ backdropFilter: 'blur(12px)', border: '1px solid rgba(197, 160, 89, 0.5)', backgroundColor: 'rgba(10, 10, 10, 0.85)', p: 4 }}>
                <CardContent>
                    <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 4 }}>
                        {isEditMode ? `Modifica Mostra (ID: ${id})` : 'Carica Nuova Mostra'}
                    </Typography>

                    {messaggio && (
                        <Box sx={{ p: 2, mb: 4, backgroundColor: 'rgba(76, 175, 80, 0.2)', border: '1px solid #4caf50', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ color: '#81c784', fontWeight: 'bold' }}>{messaggio}</Typography>
                        </Box>
                    )}

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField fullWidth label="Titolo dell'Esposizione" value={titolo} onChange={(e) => setTitolo(e.target.value)} required sx={inputStyle} />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Data Inizio (es. 10 Ottobre 2026)" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} required sx={inputStyle} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Data Fine (es. 15 Gennaio 2027)" value={dataFine} onChange={(e) => setDataFine(e.target.value)} required sx={inputStyle} />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={4} label="Descrizione Dettagliata" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} required sx={inputStyle} />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="body2" sx={{ color: '#cccccc', mb: 1, fontFamily: 'sans-serif' }}>
                                    Seleziona le foto dal computer:
                                </Typography>
                                <Button variant="outlined" component="label" sx={{ color: '#c5a059', borderColor: '#c5a059', borderRadius: 0 }}>
                                    Carica Immagini
                                    <input type="file" hidden multiple accept="image/*" onChange={(e) => setFileImmagini(e.target.files)} />
                                </Button>
                                {fileImmagini && (
                                    <Typography variant="caption" sx={{ color: '#81c784', display: 'block', mt: 1 }}>
                                        {fileImmagini.length} file selezionati.
                                    </Typography>
                                )}
                            </Grid>
                        </Grid>

                        <Box display="flex" gap={2} mt={2}>
                            <Button type="submit" variant="contained" color="primary" size="large" sx={{ borderRadius: 0, py: 1.5, px: 5, fontWeight: 'bold' }}>
                                {isEditMode ? 'SALVA MODIFICHE' : 'PUBBLICA MOSTRA'}
                            </Button>
                            <Button onClick={() => navigate('/admin')} variant="outlined" color="inherit" size="large" sx={{ borderRadius: 0, py: 1.5, px: 3 }}>
                                ANNULLA
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
