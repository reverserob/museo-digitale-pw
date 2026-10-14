import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid, Alert } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getMostra, creaMostra, aggiornaMostra } from '../services/mostreService';

const labelSx = { color: '#c5a059', mb: 1, fontWeight: 500 };
const inputStyle = {
    input: { color: 'white', colorScheme: 'dark' },
    textarea: { color: 'white' },
};

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
    const [errore, setErrore] = useState('');
    const [salvataggio, setSalvataggio] = useState(false);

    useEffect(() => {
        if (isEditMode) {
            getMostra(id)
                .then((mostra) => {
                    setTitolo(mostra.titolo);
                    setDescrizione(mostra.descrizione);
                    setDataInizio(mostra.data_inizio || '');
                    setDataFine(mostra.data_fine || '');
                })
                .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare la mostra.')));
        }
    }, [id, isEditMode]);

    const dateValide = !dataInizio || !dataFine || dataFine >= dataInizio;
    const immaginiOk = isEditMode || (fileImmagini && fileImmagini.length > 0);
    const isFormValid =
        titolo.trim().length >= 3 &&
        descrizione.trim().length >= 10 &&
        dataInizio &&
        dataFine &&
        dateValide &&
        immaginiOk;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isFormValid) return;
        setErrore('');
        setSalvataggio(true);

        const formData = new FormData();
        formData.append('titolo', titolo.trim());
        formData.append('descrizione', descrizione.trim());
        formData.append('data_inizio', dataInizio);
        formData.append('data_fine', dataFine);
        if (fileImmagini) {
            Array.from(fileImmagini).forEach((file) => formData.append('immagini', file));
        }

        // Il Content-Type multipart (con il boundary) viene impostato da axios
        const request = isEditMode ? aggiornaMostra(id, formData) : creaMostra(formData);

        request
            .then(() => {
                setMessaggio(isEditMode ? 'Mostra modificata con successo!' : 'Nuova mostra pubblicata con successo!');
                setTimeout(() => navigate('/admin'), 1200);
            })
            .catch((err) => {
                setErrore(messaggioErrore(err, 'Errore durante il salvataggio.'));
                setSalvataggio(false);
            });
    };

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Button onClick={() => navigate('/admin')} sx={{ color: '#bbbbbb', mb: 4, fontFamily: 'sans-serif' }}>
                ← Torna alla Dashboard
            </Button>

            <Card
                elevation={0}
                sx={{
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(197, 160, 89, 0.5)',
                    backgroundColor: 'rgba(10, 10, 10, 0.85)',
                    p: { xs: 1, sm: 4 },
                }}
            >
                <CardContent>
                    <Typography variant="h4" gutterBottom sx={{ color: '#c5a059', mb: 4 }}>
                        {isEditMode ? `Modifica Mostra (ID: ${id})` : 'Carica Nuova Mostra'}
                    </Typography>

                    {messaggio && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {messaggio}
                        </Alert>
                    )}
                    {errore && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {errore}
                        </Alert>
                    )}

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                    >
                        <Grid container spacing={3}>
                            <Grid size={12}>
                                <Typography variant="body2" sx={labelSx}>
                                    Titolo dell'Esposizione *
                                </Typography>
                                <TextField
                                    fullWidth
                                    value={titolo}
                                    onChange={(e) => setTitolo(e.target.value)}
                                    required
                                    error={titolo.length > 0 && titolo.trim().length < 3}
                                    helperText={
                                        titolo.length > 0 && titolo.trim().length < 3 ? 'Almeno 3 caratteri' : ''
                                    }
                                    sx={inputStyle}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" sx={labelSx}>
                                    Data Inizio *
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="date"
                                    value={dataInizio}
                                    onChange={(e) => setDataInizio(e.target.value)}
                                    required
                                    sx={inputStyle}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography variant="body2" sx={labelSx}>
                                    Data Fine *
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="date"
                                    value={dataFine}
                                    onChange={(e) => setDataFine(e.target.value)}
                                    required
                                    error={!dateValide}
                                    helperText={!dateValide ? 'Deve essere successiva alla data di inizio' : ''}
                                    slotProps={{ htmlInput: { min: dataInizio || undefined } }}
                                    sx={inputStyle}
                                />
                            </Grid>

                            <Grid size={12}>
                                <Typography variant="body2" sx={labelSx}>
                                    Descrizione Mostra *
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={4}
                                    value={descrizione}
                                    onChange={(e) => setDescrizione(e.target.value)}
                                    required
                                    error={descrizione.length > 0 && descrizione.trim().length < 10}
                                    helperText={
                                        descrizione.length > 0 && descrizione.trim().length < 10
                                            ? 'Almeno 10 caratteri'
                                            : ''
                                    }
                                    sx={inputStyle}
                                />
                            </Grid>

                            <Grid size={12}>
                                <Typography variant="body2" sx={{ color: '#cccccc', mb: 1, fontFamily: 'sans-serif' }}>
                                    {isEditMode
                                        ? 'Sostituisci le foto (facoltativo: se non carichi nulla restano quelle attuali):'
                                        : 'Aggiungi foto (jpg, png, webp, gif - max 5 MB ciascuna):'}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{ color: '#c5a059', borderColor: '#c5a059', borderRadius: 0 }}
                                >
                                    {isEditMode ? 'Carica Immagini' : 'Carica Immagini *'}
                                    <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={(e) => setFileImmagini(e.target.files)}
                                    />
                                </Button>
                                {fileImmagini && fileImmagini.length > 0 && (
                                    <Typography variant="caption" sx={{ color: '#81c784', display: 'block', mt: 1 }}>
                                        {fileImmagini.length} file selezionati.
                                    </Typography>
                                )}
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="large"
                                disabled={!isFormValid || salvataggio}
                                sx={{ borderRadius: 0, py: 1.5, px: 5, fontWeight: 'bold' }}
                            >
                                {salvataggio ? 'Salvataggio...' : isEditMode ? 'SALVA MODIFICHE' : 'PUBBLICA MOSTRA'}
                            </Button>
                            <Button
                                onClick={() => navigate('/admin')}
                                variant="outlined"
                                color="inherit"
                                size="large"
                                sx={{ borderRadius: 0, py: 1.5, px: 3 }}
                            >
                                ANNULLA
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
