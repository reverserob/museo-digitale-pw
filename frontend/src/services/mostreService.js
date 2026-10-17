/**
 * Tutte le chiamate al backend che riguardano le mostre.
 * I componenti usano queste funzioni e non conoscono gli indirizzi delle API.
 *
 * @module services/mostreService
 */
import { api } from './api';

/**
 * Elenco pubblico delle mostre, ordinate per data di inizio (`GET /api/mostre`).
 *
 * @returns {Promise<module:tipi~Mostra[]>} Le mostre del catalogo.
 */
export const getMostre = () => api.get('/api/mostre').then((res) => res.data);

/**
 * Dettaglio pubblico di una mostra (`GET /api/mostre/{id}`).
 *
 * @param {number|string} id Identificativo della mostra.
 * @returns {Promise<module:tipi~Mostra>} La mostra (errore 404 se non esiste).
 */
export const getMostra = (id) => api.get(`/api/mostre/${id}`).then((res) => res.data);

/**
 * Pubblica una nuova mostra (`POST /api/mostre`). Solo amministratore.
 *
 * @param {FormData} formData Campi `titolo`, `descrizione`, `data_inizio`, `data_fine` e uno o più file `immagini` (multipart/form-data).
 * @returns {Promise<module:tipi~Mostra>} La mostra creata.
 */
export const creaMostra = (formData) => api.post('/api/mostre', formData).then((res) => res.data);

/**
 * Modifica una mostra (`PUT /api/mostre/{id}`). Solo amministratore.
 *
 * @param {number|string} id Identificativo della mostra.
 * @param {FormData} formData Come in {@link module:services/mostreService.creaMostra}, più `immagini_esistenti`
 *   (elenco JSON delle immagini già salvate da mantenere).
 * @returns {Promise<module:tipi~Mostra>} La mostra aggiornata.
 */
export const aggiornaMostra = (id, formData) => api.put(`/api/mostre/${id}`, formData).then((res) => res.data);

/**
 * Elimina una mostra con le sue prenotazioni e i suoi feedback (`DELETE /api/mostre/{id}`). Solo amministratore.
 *
 * @param {number|string} id Identificativo della mostra.
 * @returns {Promise<{message: string}>} Conferma dell'eliminazione.
 */
export const eliminaMostra = (id) => api.delete(`/api/mostre/${id}`).then((res) => res.data);
