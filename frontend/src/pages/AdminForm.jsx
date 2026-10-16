import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Typography, Card, CardContent, Button, Box, TextField, Grid, Alert } from '@mui/material';
import { messaggioErrore, imageUrl } from '../services/api';
import { getMostra, creaMostra, aggiornaMostra } from '../services/mostreService';

const labelSx = { color: '#c5a059', mb: 1, fontWeight: 500 };
const inputStyle = {
    input: { color: 'white', colorScheme: 'dark' },
    textarea: { color: 'white' },
};

// Miniatura di un'immagine con il pulsante per toglierla
function Miniatura({ src, nome, onRimuovi }) {
    return (
        <Box sx={{ position: 'relative', width: 110, border: '1px solid rgba(197, 160, 89, 0.4)' }}>
            <img src={src} alt={nome} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
            <Typography variant="caption" noWrap sx={{ color: '#cccccc', display: 'block', px: 0.5 }}>
                {nome}
            </Typography>
            <Button
                size="small"
                onClick={onRimuovi}
                aria-label={`Rimuovi ${nome}`}
                sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 0,
                    px: 0.8,
                    lineHeight: 1.4,
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                }}
            >
                ✕
            </Button>
        </Box>
    );
}

// "/static/uploads/abc.webp" -> "abc.webp"
const nomeFile = (percorso) => percorso.split('/').pop();

export default function AdminForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [titolo, setTitolo] = useState('');
    const [descrizione, setDescrizione] = useState('');
    const [dataInizio, setDataInizio] = useState('');
    const [dataFine, setDataFine] = useState('');
    // in modifica: percorsi delle immagini già salvate che l'admin decide di tenere
    const [immaginiAttuali, setImmaginiAttuali] = useState([]);
    // nuove immagini scelte: ogni nuova selezione si aggiunge a quelle già presenti
    const [fileImmagini, setFileImmagini] = useState([]);
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
                    setImmaginiAttuali(
                        (mostra.immagini || '')
                            .split(',')
                            .map((p) => p.trim())
                            .filter(Boolean)
                    );
                })
                .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare la mostra.')));
        }
    }, [id, isEditMode]);

    const dateValide = !dataInizio || !dataFine || dataFine >= dataInizio;
    const totaleImmagini = immaginiAttuali.length + fileImmagini.length;
    const immaginiOk = totaleImmagini > 0;

    // anteprime delle immagini scelte (URL temporanei liberati quando cambia l'elenco)
    const anteprime = useMemo(() => fileImmagini.map((file) => URL.createObjectURL(file)), [fileImmagini]);
    useEffect(() => () => anteprime.forEach((url) => URL.revokeObjectURL(url)), [anteprime]);

    const aggiungiImmagini = (e) => {
        const nuovi = Array.from(e.target.files || []);
        setFileImmagini((precedenti) => {
            // evita di aggiungere due volte lo stesso file
            const giaPresenti = new Set(precedenti.map((f) => `${f.name}-${f.size}`));
            return [...precedenti, ...nuovi.filter((f) => !giaPresenti.has(`${f.name}-${f.size}`))];
        });
        // svuota l'input, così si può riselezionare anche un file appena rimosso
        e.target.value = '';
    };

    const rimuoviImmagine = (indice) => setFileImmagini((precedenti) => precedenti.filter((_, i) => i !== indice));
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
        fileImmagini.forEach((file) => formData.append('immagini', file));
        // in modifica il server tiene solo le immagini attuali elencate qui e aggiunge le nuove in coda
        if (isEditMode) formData.append('immagini_esistenti', JSON.stringify(immaginiAttuali));

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
            <Button onClick={() => navigate('/admin')} sx={{ color: '#bbbbbb', mb: 4 }}>
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
                                <Typography variant="body2" sx={{ color: '#cccccc', mb: 1 }}>
                                    {isEditMode
                                        ? 'Foto della mostra (jpg, png, webp, gif - max 5 MB ciascuna): togli quelle che non vuoi e aggiungine di nuove.'
                                        : 'Aggiungi foto (jpg, png, webp, gif - max 5 MB ciascuna):'}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    sx={{ color: '#c5a059', borderColor: '#c5a059', borderRadius: 0 }}
                                >
                                    {isEditMode ? 'Aggiungi Immagini' : 'Carica Immagini *'}
                                    <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={aggiungiImmagini}
                                    />
                                </Button>
                                <Typography variant="caption" sx={{ color: '#999999', display: 'block', mt: 1 }}>
                                    Puoi selezionare più foto insieme oppure aggiungerle una alla volta. La prima sarà
                                    l'immagine principale della mostra.
                                </Typography>
                                {totaleImmagini > 0 ? (
                                    <>
                                        <Typography
                                            variant="caption"
                                            sx={{ color: '#81c784', display: 'block', mt: 1 }}
                                        >
                                            {totaleImmagini}{' '}
                                            {totaleImmagini === 1 ? 'immagine selezionata' : 'immagini selezionate'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
                                            {immaginiAttuali.map((percorso) => (
                                                <Miniatura
                                                    key={percorso}
                                                    src={imageUrl(percorso)}
                                                    nome={nomeFile(percorso)}
                                                    onRimuovi={() =>
                                                        setImmaginiAttuali((attuali) =>
                                                            attuali.filter((p) => p !== percorso)
                                                        )
                                                    }
                                                />
                                            ))}
                                            {fileImmagini.map((file, i) => (
                                                <Miniatura
                                                    key={`${file.name}-${file.size}`}
                                                    src={anteprime[i]}
                                                    nome={file.name}
                                                    onRimuovi={() => rimuoviImmagine(i)}
                                                />
                                            ))}
                                        </Box>
                                    </>
                                ) : (
                                    isEditMode && (
                                        <Typography
                                            variant="caption"
                                            sx={{ color: '#e57373', display: 'block', mt: 1 }}
                                        >
                                            La mostra deve avere almeno un'immagine.
                                        </Typography>
                                    )
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
