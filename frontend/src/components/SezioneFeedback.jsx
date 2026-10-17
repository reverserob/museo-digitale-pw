/**
 * Sezione dei feedback nella pagina di una mostra: media dei voti, form per lasciare un feedback
 * (solo visitatori prenotati, uno per mostra) ed elenco dei commenti; l'admin può eliminarli.
 *
 * @module components/SezioneFeedback
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Rating, TextField, Button, Alert, Divider } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { getFeedback, inviaFeedback, eliminaFeedback } from '../services/feedbackService';
import { getMiePrenotazioni, getMieiFeedback } from '../services/utentiService';
import useUtente from '../hooks/useUtente';
import useLingua from '../hooks/useLingua';
import { formatoData } from '../i18n/lingua';

// colori dei campi del form su sfondo scuro
const inputStyle = {
    input: { color: 'white' },
    textarea: { color: 'white' },
    label: { color: '#999999' },
};

// data di oggi nel formato AAAA-MM-GG, confrontabile come testo con le date delle mostre
const oggiIso = () => new Date().toISOString().slice(0, 10);

/**
 * Sezione dei feedback di una mostra.
 *
 * Sotto la media dei voti mostra, in ordine di priorità: il messaggio per l'admin, l'avviso di mostra
 * non ancora iniziata, l'invito ad accedere, il feedback già lasciato, l'invito a prenotare oppure il form.
 *
 * @param {object} props Proprietà del componente.
 * @param {module:tipi~Mostra} props.mostra Mostra di cui mostrare i feedback.
 * @param {boolean} [props.admin=false] `true` per l'amministratore: legge ed elimina i feedback, ma non ne scrive.
 * @returns {JSX.Element} La sezione dei feedback.
 * @alias module:components/SezioneFeedback.SezioneFeedback
 */
export default function SezioneFeedback({ mostra, admin = false }) {
    const utente = useUtente();
    const { t, lingua } = useLingua();
    const [elenco, setElenco] = useState([]);
    const [voto, setVoto] = useState(0);
    const [commento, setCommento] = useState('');
    const [errore, setErrore] = useState('');
    const [conferma, setConferma] = useState('');
    const [invio, setInvio] = useState(false);
    // null = verifica in corso; true/false = il visitatore è prenotato a questa mostra
    const [prenotato, setPrenotato] = useState(null);
    // true se il visitatore ha già lasciato il suo (unico) feedback su questa mostra
    const [giaRecensito, setGiaRecensito] = useState(false);

    // carica i feedback della mostra (pubblici, visibili anche senza login)
    useEffect(() => {
        getFeedback(mostra.id)
            .then(setElenco)
            .catch(() => setElenco([]));
    }, [mostra.id]);

    // solo chi si è prenotato a questa mostra può lasciare un feedback, e uno soltanto
    useEffect(() => {
        if (!utente || admin) {
            setPrenotato(null);
            setGiaRecensito(false);
            return;
        }
        // le due richieste partono in parallelo: prenotazioni e feedback del visitatore
        Promise.all([getMiePrenotazioni(), getMieiFeedback().catch(() => [])])
            .then(([miePrenotazioni, mieiFeedback]) => {
                setGiaRecensito(mieiFeedback.some((f) => f.mostra_id === mostra.id));
                setPrenotato(miePrenotazioni.some((p) => p.mostra_id === mostra.id));
            })
            .catch(() => setPrenotato(false));
    }, [utente, admin, mostra.id]);

    // media dei voti (null se non ci sono ancora feedback)
    const media = elenco.length ? elenco.reduce((somma, f) => somma + f.voto, 0) / elenco.length : null;
    const nonIniziata = mostra.data_inizio > oggiIso();
    const conclusa = mostra.data_fine < oggiIso();

    // solo admin: elimina un feedback dopo la conferma e lo toglie dall'elenco senza ricaricare la pagina
    const handleElimina = (id) => {
        if (!window.confirm(t('feedback.confermaElimina'))) return;
        setErrore('');
        eliminaFeedback(id)
            .then(() => setElenco((precedenti) => precedenti.filter((f) => f.id !== id)))
            .catch((err) => setErrore(messaggioErrore(err, t('feedback.erroreElimina'))));
    };

    // invio del feedback: il voto è obbligatorio, il commento facoltativo
    const handleSubmit = (e) => {
        e.preventDefault(); // evita il ricaricamento della pagina
        setErrore('');
        setConferma('');
        if (!voto) {
            setErrore(t('feedback.serveVoto'));
            return;
        }
        setInvio(true);
        inviaFeedback({ mostra_id: mostra.id, voto, commento })
            .then((nuovo) => {
                // il nuovo feedback compare subito in cima all'elenco
                setElenco((precedenti) => [nuovo, ...precedenti]);
                setVoto(0);
                setCommento('');
                setConferma(t('feedback.grazie'));
                setGiaRecensito(true);
            })
            .catch((err) => setErrore(messaggioErrore(err, t('feedback.erroreInvio'))))
            .finally(() => setInvio(false));
    };

    return (
        <Box component="section" sx={{ mt: 8, mb: 10 }}>
            <Divider sx={{ borderColor: 'rgba(197, 160, 89, 0.3)', mb: 4 }} />
            <Typography variant="h5" component="h2" sx={{ color: '#c5a059', mb: 1 }}>
                {t('feedback.titolo')}
            </Typography>

            {media !== null ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Rating value={media} precision={0.5} readOnly />
                    <Typography sx={{ color: '#dddddd' }}>
                        {t('feedback.media', {
                            media: media.toFixed(1),
                            numero: elenco.length,
                            parola: t(elenco.length === 1 ? 'feedback.recensione' : 'feedback.recensioni'),
                        })}
                    </Typography>
                </Box>
            ) : (
                <Typography sx={{ color: '#aaaaaa', mb: 3 }}>{t('feedback.nessuna')}</Typography>
            )}

            {/* cosa mostrare sotto la media, in ordine: admin, mostra non iniziata, utente non collegato,
                verifica in corso, feedback già lasciato, utente non prenotato, altrimenti il form */}
            {admin ? (
                <>
                    <Typography variant="body2" sx={{ color: '#aaaaaa', mb: 3 }}>
                        {t('feedback.admin')}
                    </Typography>
                    {errore && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {errore}
                        </Alert>
                    )}
                </>
            ) : nonIniziata ? (
                <Alert severity="info" sx={{ mb: 4 }}>
                    {t('feedback.nonIniziata')}
                </Alert>
            ) : !utente ? (
                <Alert
                    severity="info"
                    sx={{ mb: 4, maxWidth: 560 }}
                    action={
                        <Button
                            component={Link}
                            to={`/accedi?next=${encodeURIComponent(`/esposizione/${mostra.id}`)}`}
                            color="inherit"
                            size="small"
                        >
                            {t('header.accedi')}
                        </Button>
                    }
                >
                    {t('feedback.accedi')}
                </Alert>
            ) : prenotato === null ? null : giaRecensito ? (
                <Alert severity={conferma ? 'success' : 'info'} sx={{ mb: 4, maxWidth: 560 }}>
                    {conferma || t('feedback.giaLasciato')}
                </Alert>
            ) : !prenotato ? (
                <Alert
                    severity="info"
                    sx={{ mb: 4, maxWidth: 560 }}
                    action={
                        !conclusa && (
                            <Button component={Link} to={`/prenota/${mostra.id}`} color="inherit" size="small">
                                {t('feedback.prenota')}
                            </Button>
                        )
                    }
                >
                    {t('feedback.soloPrenotati')}
                </Alert>
            ) : (
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    aria-label={t('feedback.form')}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560, mb: 5 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography component="legend" sx={{ color: '#dddddd' }}>
                            {t('feedback.tuoVoto')}
                        </Typography>
                        <Rating
                            name="voto"
                            value={voto}
                            onChange={(_, valore) => setVoto(valore || 0)}
                            sx={{ '& .MuiRating-iconEmpty': { color: '#666666' } }}
                        />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#aaaaaa' }}>
                        {t('feedback.pubblicatoCome', {
                            nome: `${utente.nome} ${utente.cognome.charAt(0).toUpperCase()}`,
                        })}
                    </Typography>
                    <TextField
                        label={t('feedback.commento')}
                        value={commento}
                        onChange={(e) => setCommento(e.target.value)}
                        multiline
                        minRows={3}
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 500 } }}
                        sx={inputStyle}
                    />
                    {errore && <Alert severity="error">{errore}</Alert>}
                    <Button
                        type="submit"
                        variant="outlined"
                        color="primary"
                        disabled={invio}
                        sx={{ alignSelf: 'flex-start', borderRadius: 0 }}
                    >
                        {invio ? t('feedback.invio') : t('feedback.invia')}
                    </Button>
                </Box>
            )}

            {elenco.map((f) => (
                <Box key={f.id} sx={{ py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Rating value={f.voto} size="small" readOnly />
                        <Typography sx={{ color: '#ffffff', fontWeight: 'bold' }}>{f.nome}</Typography>
                        <Typography variant="caption" sx={{ color: '#888888' }}>
                            {/* il backend salva le date in UTC: la Z le fa convertire nel fuso orario locale */}
                            {formatoData(f.creato_il + 'Z', lingua)}
                        </Typography>
                        {admin && (
                            <Button
                                size="small"
                                color="error"
                                onClick={() => handleElimina(f.id)}
                                aria-label={t('feedback.eliminaDi', { nome: f.nome })}
                                sx={{ ml: 'auto' }}
                            >
                                {t('mostra.elimina')}
                            </Button>
                        )}
                    </Box>
                    {f.commento && <Typography sx={{ color: '#cccccc', mt: 0.5 }}>{f.commento}</Typography>}
                </Box>
            ))}
        </Box>
    );
}
