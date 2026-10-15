import { useEffect, useState } from 'react';
import { Box, Typography, Rating, TextField, Button, Alert, Divider } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getFeedback, inviaFeedback } from '../services/feedbackService';

const inputStyle = {
    input: { color: 'white' },
    textarea: { color: 'white' },
    label: { color: '#999999' },
};

// data di oggi nel formato AAAA-MM-GG, confrontabile con le date delle mostre
const oggiIso = () => new Date().toISOString().slice(0, 10);

export default function SezioneFeedback({ mostra }) {
    const [elenco, setElenco] = useState([]);
    const [nome, setNome] = useState('');
    const [voto, setVoto] = useState(0);
    const [commento, setCommento] = useState('');
    const [errore, setErrore] = useState('');
    const [conferma, setConferma] = useState('');
    const [invio, setInvio] = useState(false);

    useEffect(() => {
        getFeedback(mostra.id)
            .then(setElenco)
            .catch(() => setElenco([]));
    }, [mostra.id]);

    const media = elenco.length ? elenco.reduce((somma, f) => somma + f.voto, 0) / elenco.length : null;
    const nonIniziata = mostra.data_inizio > oggiIso();

    const handleElimina = (id) => {
        if (!window.confirm('Eliminare questo feedback?')) return;
        setErrore('');
        eliminaFeedback(id)
            .then(() => setElenco((precedenti) => precedenti.filter((f) => f.id !== id)))
            .catch((err) => setErrore(messaggioErrore(err, "Errore durante l'eliminazione del feedback.")));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrore('');
        setConferma('');
        if (!voto) {
            setErrore('Seleziona un voto da 1 a 5 stelle.');
            return;
        }
        setInvio(true);
        inviaFeedback({ mostra_id: mostra.id, nome, voto, commento })
            .then((nuovo) => {
                setElenco((precedenti) => [nuovo, ...precedenti]);
                setNome('');
                setVoto(0);
                setCommento('');
                setConferma('Grazie! Il tuo feedback è stato pubblicato.');
            })
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile inviare il feedback.')))
            .finally(() => setInvio(false));
    };

    return (
        <Box component="section" sx={{ mt: 8, mb: 10 }}>
            <Divider sx={{ borderColor: 'rgba(197, 160, 89, 0.3)', mb: 4 }} />
            <Typography variant="h5" sx={{ color: '#c5a059', mb: 1 }}>
                Opinioni dei visitatori
            </Typography>

            {media !== null ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Rating value={media} precision={0.5} readOnly />
                    <Typography sx={{ color: '#dddddd', fontFamily: 'sans-serif' }}>
                        {media.toFixed(1)} su 5 · {elenco.length} {elenco.length === 1 ? 'recensione' : 'recensioni'}
                    </Typography>
                </Box>
            ) : (
                <Typography sx={{ color: '#aaaaaa', fontFamily: 'sans-serif', mb: 3 }}>
                    Nessuna recensione per ora.
                </Typography>
            )}

            {nonIniziata ? (
                <Alert severity="info" sx={{ mb: 4 }}>
                    La mostra non è ancora iniziata: potrai lasciare un feedback dopo la visita.
                </Alert>
            ) : (
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    aria-label="Lascia un feedback"
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560, mb: 5 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography component="legend" sx={{ color: '#dddddd', fontFamily: 'sans-serif' }}>
                            Il tuo voto
                        </Typography>
                        <Rating
                            name="voto"
                            value={voto}
                            onChange={(_, valore) => setVoto(valore || 0)}
                            sx={{ '& .MuiRating-iconEmpty': { color: '#666666' } }}
                        />
                    </Box>
                    <TextField
                        label="Nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 60 } }}
                        sx={inputStyle}
                    />
                    <TextField
                        label="Commento (facoltativo)"
                        value={commento}
                        onChange={(e) => setCommento(e.target.value)}
                        multiline
                        minRows={3}
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 500 } }}
                        sx={inputStyle}
                    />
                    {errore && <Alert severity="error">{errore}</Alert>}
                    {conferma && <Alert severity="success">{conferma}</Alert>}
                    <Button
                        type="submit"
                        variant="outlined"
                        color="primary"
                        disabled={invio}
                        sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
                    >
                        {invio ? 'Invio in corso...' : 'Invia feedback'}
                    </Button>
                </Box>
            )}

            {elenco.map((f) => (
                <Box key={f.id} sx={{ py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Rating value={f.voto} size="small" readOnly />
                        <Typography sx={{ color: '#ffffff', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                            {f.nome}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888888', fontFamily: 'sans-serif' }}>
                            {new Date(f.creato_il + 'Z').toLocaleDateString('it-IT')}
                        </Typography>
                        {admin && (
                            <Button
                                size="small"
                                color="error"
                                onClick={() => handleElimina(f.id)}
                                aria-label={`Elimina il feedback di ${f.nome}`}
                                sx={{ ml: 'auto' }}
                            >
                                Elimina
                            </Button>
                        )}
                    </Box>
                    {f.commento && (
                        <Typography sx={{ color: '#cccccc', mt: 0.5, fontFamily: 'sans-serif' }}>
                            {f.commento}
                        </Typography>
                    )}
                </Box>
            ))}
        </Box>
    );
}
