/**
 * Modulo Contatti: la domanda del visitatore registrato arriva per email alla casella del museo.
 *
 * @module services/contattiService
 */
import { api } from './api';

/**
 * Invia una domanda al museo (`POST /api/contatti`). Richiede un visitatore collegato.
 *
 * @param {module:tipi~RichiestaContatto} dati Campi del modulo.
 * @returns {Promise<string>} Messaggio di conferma restituito dal backend.
 */
export const inviaContatto = (dati) => api.post('/api/contatti', dati).then((res) => res.data.message);
