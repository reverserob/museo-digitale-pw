import { useCallback, useEffect, useState } from 'react';
import { EVENTO_LINGUA, getLingua, setLingua, traduci } from '../i18n/lingua';

// Restituisce la lingua scelta, la funzione t() per i testi e setLingua; si aggiorna quando la lingua cambia
export default function useLingua() {
    const [lingua, setStato] = useState(getLingua);

    useEffect(() => {
        const aggiorna = () => setStato(getLingua());
        window.addEventListener(EVENTO_LINGUA, aggiorna);
        return () => window.removeEventListener(EVENTO_LINGUA, aggiorna);
    }, []);

    // useCallback: t cambia solo quando cambia la lingua, così i componenti si aggiornano al momento giusto
    const t = useCallback((chiave, parametri) => traduci(chiave, parametri, lingua), [lingua]);
    return { lingua, setLingua, t };
}
