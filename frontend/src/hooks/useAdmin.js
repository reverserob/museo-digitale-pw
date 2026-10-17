import { useEffect, useState } from 'react';
import { EVENTO_SESSIONE } from '../services/api';
import { isLoggedIn } from '../services/authService';

// true quando l'amministratore è collegato; si aggiorna a ogni login o logout
export default function useAdmin() {
    const [admin, setAdmin] = useState(isLoggedIn);

    useEffect(() => {
        // ricalcola lo stato ogni volta che api.js segnala un cambio di sessione
        const aggiorna = () => setAdmin(isLoggedIn());
        window.addEventListener(EVENTO_SESSIONE, aggiorna);
        // pulizia quando il componente viene smontato
        return () => window.removeEventListener(EVENTO_SESSIONE, aggiorna);
    }, []);

    return admin;
}
