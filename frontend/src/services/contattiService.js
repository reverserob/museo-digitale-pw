import { api } from './api';

// Modulo Contatti: la domanda del visitatore registrato arriva per email alla casella del museo
export const inviaContatto = (dati) => api.post('/api/contatti', dati).then((res) => res.data.message);
