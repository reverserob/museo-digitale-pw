import { useEffect, useState } from 'react';
import { EVENTO_SESSIONE } from '../services/api';
import { isLoggedIn } from '../services/authService';

// true quando l'amministratore è collegato; si aggiorna a ogni login o logout
export default function useAdmin() {
    const [admin, setAdmin] = useState(isLoggedIn);

    useEffect(() => {
        const aggiorna = () => setAdmin(isLoggedIn());
        window.addEventListener(EVENTO_SESSIONE, aggiorna);
        return () => window.removeEventListener(EVENTO_SESSIONE, aggiorna);
    }, []);

    return admin;
}
