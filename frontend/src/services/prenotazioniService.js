/**
 * Chiamate al backend per le prenotazioni.
 *
 * @module services/prenotazioniService
 */
import { api, API_URL } from './api';

/**
 * Prenota una mostra (`POST /api/prenota`). Solo visitatori registrati:
 * nome, cognome ed email vengono presi dall'account; il backend invia l'email di conferma.
 *
 * @param {object} dati Dati della prenotazione.
 * @param {number} dati.mostra_id Mostra da prenotare.
 * @param {string} [dati.telefono] Telefono, se diverso da quello dell'account.
 * @returns {Promise<{message: string, id: number, codice: string}>} Conferma con id e codice di riferimento
 *   della prenotazione (es. `MCD-7K3F-9QXA`), da mostrare all'ingresso.
 */
export const prenota = (dati) => api.post('/api/prenota', dati).then((res) => res.data);

/**
 * Elenco delle prenotazioni, dalla più recente (`GET /api/prenotazioni`). Solo amministratore.
 *
 * @param {number} [mostraId] Se indicato restituisce solo le prenotazioni di quella mostra.
 * @returns {Promise<module:tipi~Prenotazione[]>} Le prenotazioni.
 */
export const getPrenotazioni = (mostraId) =>
    api.get('/api/prenotazioni', { params: mostraId ? { mostra_id: mostraId } : {} }).then((res) => res.data);

/**
 * Indirizzo dell'immagine PNG del QR code di una prenotazione (`GET /api/prenotazioni/qr/{codice}`).
 * Il QR code contiene l'indirizzo della pagina di verifica dell'area riservata.
 *
 * @param {string} codice Codice della prenotazione.
 * @returns {string} URL dell'immagine, da usare come `src` di un tag `<img>`.
 */
export const qrUrl = (codice) => `${API_URL}/api/prenotazioni/qr/${encodeURIComponent(codice)}`;

/**
 * Verifica una prenotazione all'ingresso (`GET /api/prenotazioni/verifica/{riferimento}`). Solo amministratore.
 *
 * @param {string} riferimento Codice (`MCD-7K3F-9QXA`, anche in minuscolo o senza trattini) o numero della prenotazione.
 * @returns {Promise<module:tipi~VerificaPrenotazione>} Dati della prenotazione e stato dell'ingresso.
 */
export const verificaPrenotazione = (riferimento) =>
    api.get(`/api/prenotazioni/verifica/${encodeURIComponent(riferimento.trim())}`).then((res) => res.data);

/**
 * Registra l'ingresso del visitatore (`POST /api/prenotazioni/verifica/{riferimento}/ingresso`). Solo amministratore.
 * Ogni prenotazione vale per un solo ingresso, mentre la mostra è aperta.
 *
 * @param {string} riferimento Codice o numero della prenotazione.
 * @returns {Promise<module:tipi~VerificaPrenotazione>} La prenotazione aggiornata (stato `gia_entrato`).
 */
export const registraIngresso = (riferimento) =>
    api.post(`/api/prenotazioni/verifica/${encodeURIComponent(riferimento.trim())}/ingresso`).then((res) => res.data);
