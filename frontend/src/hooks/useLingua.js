/**
 * Hook React per la lingua dell'interfaccia (italiano / inglese).
 *
 * @module hooks/useLingua
 */
import { useCallback, useEffect, useState } from 'react';
import { EVENTO_LINGUA, getLingua, setLingua, traduci } from '../i18n/lingua';

/**
 * Restituisce la lingua scelta, la funzione `t()` per i testi e `setLingua`.
 * Il componente si aggiorna quando la lingua cambia (evento {@link module:i18n/lingua.EVENTO_LINGUA}).
 *
 * @example
 * const { t, lingua, setLingua } = useLingua();
 * t('header.ciao', { nome: 'Mario' }); // 'Ciao, Mario' oppure 'Hi, Mario'
 *
 * @returns {{lingua: ('it'|'en'), setLingua: function(string): void, t: function(string, Object=): string}}
 *   Lingua attuale, funzione per cambiarla e funzione di traduzione.
 * @alias module:hooks/useLingua.useLingua
 */
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
