/**
 * Hook React che indica se l'amministratore è collegato.
 *
 * @module hooks/useAdmin
 */
import { useEffect, useState } from 'react';
import { EVENTO_SESSIONE } from '../services/api';
import { isLoggedIn } from '../services/authService';

/**
 * Restituisce `true` quando l'amministratore è collegato; si aggiorna a ogni login o logout
 * ascoltando l'evento {@link module:services/api.EVENTO_SESSIONE}.
 *
 * @example
 * const admin = useAdmin();
 * return admin ? <PannelloAdmin /> : null;
 *
 * @returns {boolean} `true` se l'admin è collegato (e nessun visitatore lo è).
 * @alias module:hooks/useAdmin.useAdmin
 */
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
