/**
 * Verifica delle prenotazioni all'ingresso del museo (`/admin/verifica`, solo amministratore).
 *
 * Il personale inserisce il codice di prenotazione (o il numero) comunicato dal visitatore, oppure inquadra
 * con il telefono il QR code ricevuto per email: il QR contiene l'indirizzo di questa pagina con il codice
 * già compilato (`/admin/verifica?codice=MCD-XXXX-XXXX`), quindi la verifica parte da sola.
 *
 * @module pages/AdminVerifica
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Card, CardContent, Typography, Box, TextField, Button, Alert, Chip } from '@mui/material';
import { messaggioErrore } from '../services/api';
import { registraIngresso, verificaPrenotazione } from '../services/prenotazioniService';

const cardSx = {
    p: { xs: 2, md: 4 },
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(197, 160, 89, 0.3)',
};
const inputStyle = { input: { color: 'white', letterSpacing: 2 }, label: { color: '#999999' } };

// come presentare ogni stato restituito dal backend
const STATI = {
    valida: { colore: 'success', testo: 'Prenotazione valida: il visitatore può entrare.' },
    gia_entrato: { colore: 'warning', testo: 'Ingresso già registrato: la prenotazione è stata usata.' },
    non_iniziata: { colore: 'warning', testo: 'La mostra non è ancora iniziata.' },
    conclusa: { colore: 'error', testo: 'La mostra è già conclusa.' },
};

// data e ora (salvate in UTC) nel formato italiano
const dataOra = (iso) => new Date(iso + 'Z').toLocaleString('it-IT');

/**
 * Pagina di verifica: ricerca per codice o numero, dati della prenotazione, stato e pulsante "Registra ingresso".
 *
 * @returns {JSX.Element} La pagina.
 * @alias module:pages/AdminVerifica.AdminVerifica
 */
export default function AdminVerifica() {
    const [parametri, setParametri] = useSearchParams();
    const [riferimento, setRiferimento] = useState(parametri.get('codice') || '');
    const [risultato, setRisultato] = useState(null);
    const [errore, setErrore] = useState('');
    const [messaggio, setMessaggio] = useState('');
    const [attesa, setAttesa] = useState(false);

    const verifica = useCallback((valore) => {
        const testo = (valore || '').trim();
        if (!testo) return;
        setAttesa(true);
        setErrore('');
        setMessaggio('');
        setRisultato(null);
        verificaPrenotazione(testo)
            .then(setRisultato)
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile verificare la prenotazione.')))
            .finally(() => setAttesa(false));
    }, []);

    // aperta dal QR code: il codice è già nell'indirizzo e la verifica parte subito
    useEffect(() => {
        const daIndirizzo = parametri.get('codice');
        if (daIndirizzo) verifica(daIndirizzo);
        // solo all'apertura della pagina
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        // il codice cercato finisce nell'indirizzo: la pagina si può ricaricare o condividere
        setParametri(riferimento.trim() ? { codice: riferimento.trim() } : {}, { replace: true });
        verifica(riferimento);
    };

    const handleIngresso = () => {
        setAttesa(true);
        setErrore('');
        registraIngresso(risultato.codice || String(risultato.id))
            .then((aggiornato) => {
                setRisultato(aggiornato);
                setMessaggio(`Ingresso registrato per ${aggiornato.nome} ${aggiornato.cognome}.`);
            })
            .catch((err) => setErrore(messaggioErrore(err, "Impossibile registrare l'ingresso.")))
            .finally(() => setAttesa(false));
    };

    const stato = risultato ? STATI[risultato.stato] : null;

    return (
        <Container maxWidth="md" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Button component={Link} to="/admin" sx={{ color: '#bbbbbb', mb: 4 }}>
                ← Torna alla Dashboard
            </Button>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Typography variant="h4" component="h1" sx={{ color: '#c5a059', mb: 1 }}>
                        Verifica prenotazione
                    </Typography>
                    <Typography sx={{ color: '#aaaaaa', mb: 4 }}>
                        Inserisci il codice comunicato dal visitatore (es. MCD-7K3F-9QXA) o il numero della
                        prenotazione, oppure inquadra con il telefono il QR code ricevuto per email.
                    </Typography>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        aria-label="Verifica prenotazione"
                        sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start', mb: 4 }}
                    >
                        <TextField
                            label="Codice o numero della prenotazione"
                            value={riferimento}
                            onChange={(e) => setRiferimento(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true }, htmlInput: { autoCapitalize: 'characters' } }}
                            sx={{ ...inputStyle, flex: 1, minWidth: 240 }}
                            autoFocus
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={attesa || !riferimento.trim()}
                            sx={{ borderRadius: 0, fontWeight: 'bold', py: 1.8 }}
                        >
                            Verifica
                        </Button>
                    </Box>

                    {errore && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {errore}
                        </Alert>
                    )}
                    {messaggio && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {messaggio}
                        </Alert>
                    )}

                    {risultato && (
                        <Box
                            component="section"
                            aria-label="Risultato della verifica"
                            sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: 3 }}
                        >
                            <Alert severity={stato.colore} sx={{ mb: 3 }}>
                                {stato.testo}
                            </Alert>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                                <Typography variant="h5" sx={{ color: '#ffffff' }}>
                                    {risultato.nome} {risultato.cognome}
                                </Typography>
                                <Chip
                                    label={risultato.codice || `n. ${risultato.id}`}
                                    sx={{ fontFamily: 'monospace', letterSpacing: 1, color: '#c5a059' }}
                                    variant="outlined"
                                />
                            </Box>
                            <Typography sx={{ color: '#dddddd' }}>
                                <b>Mostra:</b> {risultato.titolo_mostra} (dal {risultato.data_inizio} al{' '}
                                {risultato.data_fine})
                            </Typography>
                            <Typography sx={{ color: '#dddddd' }}>
                                <b>Contatti:</b> {risultato.email} · {risultato.telefono}
                            </Typography>
                            <Typography sx={{ color: '#aaaaaa' }}>
                                Prenotazione n. {risultato.id} del {dataOra(risultato.creata_il)}
                            </Typography>
                            {risultato.ingresso_il && (
                                <Typography sx={{ color: '#ffb74d', mt: 1 }}>
                                    Ingresso registrato il {dataOra(risultato.ingresso_il)}
                                </Typography>
                            )}
                            {risultato.stato === 'valida' && (
                                <Button
                                    onClick={handleIngresso}
                                    variant="contained"
                                    color="success"
                                    disabled={attesa}
                                    sx={{ mt: 3, borderRadius: 0, fontWeight: 'bold' }}
                                >
                                    Registra ingresso
                                </Button>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
