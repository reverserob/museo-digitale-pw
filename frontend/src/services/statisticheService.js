import { api } from './api';

// solo admin: indicatori calcolati dal backend per la dashboard
export const getStatistiche = () => api.get('/api/statistiche').then((res) => res.data);
