import { api } from './api';

// Chiamate al backend per i feedback dei visitatori

export const inviaFeedback = (dati) => api.post('/api/feedback', dati).then((res) => res.data);

// pubblica: se mostraId è indicato restituisce solo i feedback di quella mostra
export const getFeedback = (mostraId) =>
    api.get('/api/feedback', { params: mostraId ? { mostra_id: mostraId } : {} }).then((res) => res.data);

// solo admin (moderazione)
export const eliminaFeedback = (id) => api.delete(`/api/feedback/${id}`).then((res) => res.data);
