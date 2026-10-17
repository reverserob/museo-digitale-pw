/**
 * Chiamate al backend per le prenotazioni.
 *
 * @module services/prenotazioniService
 */
import { api } from './api';

/**
 * Prenota una mostra (`POST /api/prenota`). Solo visitatori registrati:
 * nome, cognome ed email vengono presi dall'account; il backend invia l'email di conferma.
 *
 * @param {object} dati Dati della prenotazione.
 * @param {number} dati.mostra_id Mostra da prenotare.
 * @param {string} [dati.telefono] Telefono, se diverso da quello dell'account.
 * @returns {Promise<{message: string, id: number}>} Conferma con l'id della prenotazione.
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
