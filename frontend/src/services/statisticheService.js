/**
 * Indicatori della dashboard amministratore.
 *
 * @module services/statisticheService
 */
import { api } from './api';

/**
 * Indicatori calcolati dal backend per la dashboard (`GET /api/statistiche`). Solo amministratore.
 *
 * @returns {Promise<module:tipi~Statistiche>} Totali e dettaglio per mostra.
 */
export const getStatistiche = () => api.get('/api/statistiche').then((res) => res.data);
