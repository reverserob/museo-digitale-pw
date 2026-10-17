/**
 * Codice di riferimento e QR code di una prenotazione, da mostrare all'ingresso del museo.
 *
 * @module components/QrPrenotazione
 */
import { Box, Typography } from '@mui/material';
import { qrUrl } from '../services/prenotazioniService';
import useLingua from '../hooks/useLingua';

/**
 * Riquadro con il codice della prenotazione in grande e l'immagine del QR code generata dal backend.
 *
 * @param {object} props Proprietà del componente.
 * @param {string} props.codice Codice della prenotazione (es. `MCD-7K3F-9QXA`).
 * @param {number} [props.dimensione=180] Lato dell'immagine del QR code in pixel.
 * @returns {JSX.Element} Il riquadro.
 * @alias module:components/QrPrenotazione.QrPrenotazione
 */
export default function QrPrenotazione({ codice, dimensione = 180 }) {
    const { t } = useLingua();
    return (
        <Box
            sx={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                p: 2.5,
                border: '1px solid rgba(197, 160, 89, 0.5)',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderRadius: 1,
            }}
        >
            <Typography variant="caption" sx={{ color: '#aaaaaa', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t('qr.codice')}
            </Typography>
            <Typography
                data-testid="codice-prenotazione"
                sx={{
                    color: '#c5a059',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    letterSpacing: 3,
                    fontFamily: 'monospace',
                }}
            >
                {codice}
            </Typography>
            {/* sfondo bianco: i lettori di QR code hanno bisogno di contrasto */}
            <Box
                component="img"
                src={qrUrl(codice)}
                alt={t('qr.alt', { codice })}
                width={dimensione}
                height={dimensione}
                sx={{ backgroundColor: '#ffffff', p: 1, borderRadius: 1 }}
            />
            <Typography variant="body2" sx={{ color: '#cccccc', maxWidth: 300, textAlign: 'center' }}>
                {t('qr.istruzioni')}
            </Typography>
        </Box>
    );
}
