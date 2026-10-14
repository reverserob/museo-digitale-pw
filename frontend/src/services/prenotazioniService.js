import { api } from './api';

// Chiamate al backend per le prenotazioni

export const prenota = (dati) => api.post('/api/prenota', dati).then((res) => res.data);

// solo admin: se mostraId è indicato restituisce le prenotazioni di quella mostra
export const getPrenotazioni = (mostraId) =>
    api.get('/api/prenotazioni', { params: mostraId ? { mostra_id: mostraId } : {} }).then((res) => res.data);
