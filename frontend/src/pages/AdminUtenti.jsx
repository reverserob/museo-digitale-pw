/**
 * Gestione degli account dei visitatori (`/admin/utenti`, solo amministratore).
 *
 * Completa il CRUD degli utenti lato area riservata: elenco con ricerca (Read), correzione di nome,
 * cognome e telefono (Update) ed eliminazione dell'account (Delete). La creazione (Create) avviene con la
 * registrazione del visitatore, che sceglie la propria password.
 *
 * @module pages/AdminUtenti
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableContainer,
} from '@mui/material';
import { messaggioErrore } from '../services/api';
import { aggiornaUtente, eliminaUtente, getUtenti } from '../services/utentiService';

const cardSx = {
    p: { xs: 2, md: 4 },
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(197, 160, 89, 0.3)',
};
const inputStyle = { input: { color: 'white' }, label: { color: '#999999' } };
const cella = { color: '#dddddd', borderColor: 'rgba(255,255,255,0.1)' };
const intestazione = { ...cella, color: '#c5a059', fontWeight: 'bold' };

// stesse regole della registrazione e del backend
const datiValidi = (d) =>
    d.nome.trim().length >= 3 && d.cognome.trim().length >= 3 && /^\d{6,15}$/.test(d.telefono.trim());

// data (salvata in UTC) nel formato italiano
const data = (iso) => new Date(iso + 'Z').toLocaleDateString('it-IT');

/**
 * Pagina di gestione utenti: tabella degli account con ricerca, modifica in linea ed eliminazione.
 *
 * @returns {JSX.Element} La pagina.
 * @alias module:pages/AdminUtenti.AdminUtenti
 */
export default function AdminUtenti() {
    const [utenti, setUtenti] = useState(null);
    const [ricerca, setRicerca] = useState('');
    const [errore, setErrore] = useState('');
    const [messaggio, setMessaggio] = useState('');
    // account in modifica: id e valori del form in linea
    const [inModifica, setInModifica] = useState(null);
    const [attesa, setAttesa] = useState(false);

    useEffect(() => {
        getUtenti()
            .then(setUtenti)
            .catch((err) => setErrore(messaggioErrore(err, 'Impossibile caricare gli utenti.')));
    }, []);

    // filtro su nome, cognome ed email, senza distinzione tra maiuscole e minuscole
    const filtrati = useMemo(() => {
        const testo = ricerca.trim().toLowerCase();
        if (!utenti || !testo) return utenti;
        return utenti.filter((u) => `${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(testo));
    }, [utenti, ricerca]);

    const avvisa = (testo) => {
        setErrore('');
        setMessaggio(testo);
    };

    const salva = () => {
        const { id, nome, cognome, telefono } = inModifica;
        setAttesa(true);
        aggiornaUtente(id, { nome: nome.trim(), cognome: cognome.trim(), telefono: telefono.trim() })
            .then((aggiornato) => {
                setUtenti((elenco) => elenco.map((u) => (u.id === id ? aggiornato : u)));
                setInModifica(null);
                avvisa(`Dati di ${aggiornato.nome} ${aggiornato.cognome} aggiornati.`);
            })
            .catch((err) => setErrore(messaggioErrore(err, "Impossibile aggiornare l'utente.")))
            .finally(() => setAttesa(false));
    };

    const elimina = (u) => {
        const conferma =
            `Eliminare l'account di ${u.nome} ${u.cognome} (${u.email})? ` +
            'Le prenotazioni non ancora usate saranno annullate, quelle già usate resteranno in forma anonima.';
        if (!window.confirm(conferma)) return;
        setAttesa(true);
        eliminaUtente(u.id)
            .then(() => {
                setUtenti((elenco) => elenco.filter((x) => x.id !== u.id));
                avvisa(`Account di ${u.nome} ${u.cognome} eliminato.`);
            })
            .catch((err) => setErrore(messaggioErrore(err, "Impossibile eliminare l'utente.")))
            .finally(() => setAttesa(false));
    };

    // campo del form di modifica in linea
    const campo = (nome, etichetta) => (
        <TextField
            size="small"
            value={inModifica[nome]}
            onChange={(e) => setInModifica({ ...inModifica, [nome]: e.target.value })}
            slotProps={{ htmlInput: { 'aria-label': etichetta } }}
            sx={{ ...inputStyle, width: { xs: 110, md: 120 } }}
        />
    );

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 5, md: 10 }, mb: 10 }}>
            <Button component={Link} to="/admin" sx={{ color: '#bbbbbb', mb: 4 }}>
                ← Torna alla Dashboard
            </Button>
            <Card elevation={0} sx={cardSx}>
                <CardContent>
                    <Typography variant="h4" component="h1" sx={{ color: '#c5a059', mb: 1 }}>
                        Gestione utenti
                    </Typography>
                    <Typography sx={{ color: '#aaaaaa', mb: 3 }}>
                        Account dei visitatori registrati: puoi correggere nome, cognome e telefono oppure eliminare un
                        account. L&apos;email identifica l&apos;account e non si modifica.
                    </Typography>

                    <TextField
                        label="Cerca per nome, cognome o email"
                        value={ricerca}
                        onChange={(e) => setRicerca(e.target.value)}
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ ...inputStyle, mb: 3, width: { xs: '100%', sm: 360 } }}
                    />

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
                    {!errore && utenti === null && <CircularProgress color="primary" />}
                    {filtrati?.length === 0 && (
                        <Typography sx={{ color: '#aaaaaa' }}>
                            {utenti.length === 0
                                ? 'Nessun utente registrato.'
                                : 'Nessun utente corrisponde alla ricerca.'}
                        </Typography>
                    )}

                    {filtrati?.length > 0 && (
                        <TableContainer>
                            <Table size="small" aria-label="Utenti registrati">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={intestazione}>Nome</TableCell>
                                        <TableCell sx={intestazione}>Cognome</TableCell>
                                        <TableCell sx={intestazione}>Email</TableCell>
                                        <TableCell sx={intestazione}>Telefono</TableCell>
                                        <TableCell sx={intestazione}>Registrato il</TableCell>
                                        <TableCell sx={intestazione} align="center">
                                            Prenotazioni
                                        </TableCell>
                                        <TableCell sx={intestazione} align="center">
                                            Feedback
                                        </TableCell>
                                        <TableCell sx={intestazione} align="right">
                                            Azioni
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtrati.map((u) =>
                                        inModifica?.id === u.id ? (
                                            <TableRow key={u.id}>
                                                <TableCell sx={cella}>{campo('nome', 'Nome')}</TableCell>
                                                <TableCell sx={cella}>{campo('cognome', 'Cognome')}</TableCell>
                                                <TableCell sx={cella}>{u.email}</TableCell>
                                                <TableCell sx={cella}>{campo('telefono', 'Telefono')}</TableCell>
                                                <TableCell sx={cella}>{data(u.creato_il)}</TableCell>
                                                <TableCell sx={cella} align="center">
                                                    {u.prenotazioni}
                                                </TableCell>
                                                <TableCell sx={cella} align="center">
                                                    {u.feedback}
                                                </TableCell>
                                                {/* pulsanti uno sotto l'altro: la tabella resta nella larghezza della pagina */}
                                                <TableCell sx={cella} align="right">
                                                    <Button
                                                        onClick={salva}
                                                        size="small"
                                                        variant="contained"
                                                        disabled={attesa || !datiValidi(inModifica)}
                                                        sx={{ borderRadius: 0, display: 'block', ml: 'auto', mb: 0.5 }}
                                                    >
                                                        Salva
                                                    </Button>
                                                    <Button
                                                        onClick={() => setInModifica(null)}
                                                        size="small"
                                                        sx={{ color: '#bbbbbb', display: 'block', ml: 'auto' }}
                                                    >
                                                        Annulla
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow key={u.id}>
                                                <TableCell sx={cella}>{u.nome}</TableCell>
                                                <TableCell sx={cella}>{u.cognome}</TableCell>
                                                <TableCell sx={cella}>{u.email}</TableCell>
                                                <TableCell sx={cella}>{u.telefono}</TableCell>
                                                <TableCell sx={cella}>{data(u.creato_il)}</TableCell>
                                                <TableCell sx={cella} align="center">
                                                    {u.prenotazioni}
                                                </TableCell>
                                                <TableCell sx={cella} align="center">
                                                    {u.feedback}
                                                </TableCell>
                                                <TableCell sx={cella} align="right">
                                                    <Button
                                                        onClick={() => setInModifica({ ...u })}
                                                        size="small"
                                                        variant="outlined"
                                                        disabled={attesa}
                                                        aria-label={`Modifica ${u.nome} ${u.cognome}`}
                                                        sx={{
                                                            borderRadius: 0,
                                                            display: 'block',
                                                            ml: 'auto',
                                                            mb: 0.5,
                                                            minWidth: 96,
                                                        }}
                                                    >
                                                        Modifica
                                                    </Button>
                                                    <Button
                                                        onClick={() => elimina(u)}
                                                        size="small"
                                                        color="error"
                                                        variant="outlined"
                                                        disabled={attesa}
                                                        aria-label={`Elimina ${u.nome} ${u.cognome}`}
                                                        sx={{
                                                            borderRadius: 0,
                                                            display: 'block',
                                                            ml: 'auto',
                                                            minWidth: 96,
                                                        }}
                                                    >
                                                        Elimina
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
}
