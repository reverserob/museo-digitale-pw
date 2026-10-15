import { useEffect, useState } from 'react';
import { EVENTO_SESSIONE } from '../services/api';
import { getUtente } from '../services/utentiService';

// Restituisce il visitatore collegato e si aggiorna quando fa login o logout
export default function useUtente() {
    const [utente, setUtente] = useState(getUtente);

    useEffect(() => {
        const aggiorna = () => setUtente(getUtente());
        window.addEventListener(EVENTO_SESSIONE, aggiorna);
        // login/logout fatti in un'altra scheda del browser
        window.addEventListener('storage', aggiorna);
        return () => {
            window.removeEventListener(EVENTO_SESSIONE, aggiorna);
            window.removeEventListener('storage', aggiorna);
        };
    }, []);

    return utente;
}
