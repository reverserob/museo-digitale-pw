/**
 * Chiamate al backend per i feedback dei visitatori.
 *
 * @module services/feedbackService
 */
import { api } from './api';

/**
 * Pubblica un feedback (`POST /api/feedback`). Solo per visitatori prenotati alla mostra:
 * il backend controlla le regole (mostra iniziata, prenotazione, un solo feedback).
 *
 * @param {object} dati Dati del feedback.
 * @param {number} dati.mostra_id Mostra da recensire.
 * @param {number} dati.voto Voto da 1 a 5.
 * @param {string} [dati.commento] Commento facoltativo (massimo 500 caratteri).
 * @returns {Promise<module:tipi~Feedback>} Il feedback salvato.
 */
export const inviaFeedback = (dati) => api.post('/api/feedback', dati).then((res) => res.data);

/**
 * Elenco pubblico dei feedback, dal più recente (`GET /api/feedback`).
 *
 * @param {number} [mostraId] Se indicato restituisce solo i feedback di quella mostra.
 * @returns {Promise<module:tipi~Feedback[]>} I feedback.
 */
export const getFeedback = (mostraId) =>
    api.get('/api/feedback', { params: mostraId ? { mostra_id: mostraId } : {} }).then((res) => res.data);

/**
 * Elimina un feedback (`DELETE /api/feedback/{id}`). Solo amministratore (moderazione).
 *
 * @param {number} id Identificativo del feedback.
 * @returns {Promise<{message: string}>} Conferma dell'eliminazione.
 */
export const eliminaFeedback = (id) => api.delete(`/api/feedback/${id}`).then((res) => res.data);
