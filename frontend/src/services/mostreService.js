import { api } from './api';

// Tutte le chiamate al backend che riguardano le mostre.
// I componenti usano queste funzioni e non conoscono gli indirizzi delle API.

// pubbliche: elenco e dettaglio
export const getMostre = () => api.get('/api/mostre').then((res) => res.data);

export const getMostra = (id) => api.get(`/api/mostre/${id}`).then((res) => res.data);

// formData contiene titolo, descrizione, date e immagini (multipart/form-data)
export const creaMostra = (formData) => api.post('/api/mostre', formData).then((res) => res.data);

// solo admin: modifica ed eliminazione
export const aggiornaMostra = (id, formData) => api.put(`/api/mostre/${id}`, formData).then((res) => res.data);

export const eliminaMostra = (id) => api.delete(`/api/mostre/${id}`).then((res) => res.data);
