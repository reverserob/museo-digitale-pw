import { Box, Typography } from '@mui/material';

/**
 * Riquadri con gli indicatori principali e barre delle prenotazioni per mostra.
 * I numeri arrivano già calcolati da `GET /api/statistiche`.
 *
 * @module components/IndicatoriDashboard
 */

// stile comune dei riquadri
const boxSx = {
    p: 2,
    border: '1px solid rgba(197, 160, 89, 0.35)',
    backgroundColor: 'rgba(197, 160, 89, 0.06)',
    borderRadius: 1,
};

/**
 * Un singolo riquadro: etichetta, numero grande e (facoltativo) una riga di dettaglio.
 *
 * @private
 * @param {object} props Proprietà del componente.
 * @param {string} props.etichetta Nome dell'indicatore.
 * @param {(number|string)} props.valore Valore da mostrare in grande.
 * @param {string} [props.dettaglio] Riga di dettaglio facoltativa.
 * @returns {JSX.Element} Il riquadro.
 * @alias module:components/IndicatoriDashboard.Indicatore
 */
function Indicatore({ etichetta, valore, dettaglio }) {
    return (
        <Box sx={boxSx}>
            <Typography variant="caption" sx={{ color: '#aaaaaa', textTransform: 'uppercase', letterSpacing: 1 }}>
                {etichetta}
            </Typography>
            <Typography sx={{ color: '#c5a059', fontSize: '2rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                {valore}
            </Typography>
            {dettaglio && (
                <Typography variant="caption" sx={{ color: '#888888' }}>
                    {dettaglio}
                </Typography>
            )}
        </Box>
    );
}

/**
 * Indicatori della dashboard amministratore.
 *
 * @param {object} props Proprietà del componente.
 * @param {?module:tipi~Statistiche} props.statistiche Indicatori calcolati dal backend; con `null` non mostra nulla.
 * @returns {?JSX.Element} Riquadri e barre, oppure `null` finché i dati non arrivano.
 * @alias module:components/IndicatoriDashboard.IndicatoriDashboard
 */
export default function IndicatoriDashboard({ statistiche }) {
    // finché i dati non sono arrivati non mostro nulla
    if (!statistiche) return null;
    const s = statistiche;
    // valore massimo per calcolare la lunghezza delle barre in percentuale (almeno 1, per non dividere per zero)
    const massimo = Math.max(1, ...s.per_mostra.map((m) => m.prenotazioni));

    return (
        <Box component="section" aria-label="Indicatori" sx={{ mb: 4 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                    gap: 2,
                    mb: 3,
                }}
            >
                <Indicatore
                    etichetta="Prenotazioni"
                    valore={s.totale_prenotazioni}
                    dettaglio={`${s.prenotazioni_ultimi_7_giorni} negli ultimi 7 giorni`}
                />
                <Indicatore
                    etichetta="Mostre in corso"
                    valore={s.mostre_in_corso}
                    dettaglio={`${s.mostre_future} in arrivo · ${s.mostre_concluse} concluse`}
                />
                <Indicatore etichetta="Feedback" valore={s.totale_feedback} />
                <Indicatore
                    etichetta="Voto medio"
                    valore={s.voto_medio !== null ? s.voto_medio.toFixed(1) : '–'}
                    dettaglio="su 5 stelle"
                />
            </Box>

            <Typography variant="subtitle2" sx={{ color: '#c5a059', mb: 1.5, letterSpacing: 1 }}>
                PRENOTAZIONI PER MOSTRA
            </Typography>
            {/* una riga per mostra: titolo, stato, numero di prenotazioni, voto medio e barra proporzionale */}
            {s.per_mostra.map((m) => (
                <Box key={m.mostra_id} sx={{ mb: 1.2 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 2,
                            color: '#dddddd',
                            fontSize: '0.85rem',
                        }}
                    >
                        <span>
                            {m.titolo} <span style={{ color: '#888888' }}>({m.stato})</span>
                        </span>
                        <span>
                            {m.prenotazioni}
                            {m.voto_medio !== null && ` · ★ ${m.voto_medio.toFixed(1)}`}
                        </span>
                    </Box>
                    <Box sx={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, mt: 0.5 }}>
                        <Box
                            data-testid={`barra-${m.mostra_id}`}
                            sx={{
                                height: '100%',
                                width: `${(m.prenotazioni / massimo) * 100}%`,
                                backgroundColor: '#c5a059',
                                borderRadius: 3,
                            }}
                        />
                    </Box>
                </Box>
            ))}
        </Box>
    );
}
