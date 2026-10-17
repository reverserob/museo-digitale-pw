/**
 * Lingua dell'interfaccia: `'it'` (predefinita) o `'en'`, ricordata nel browser.
 * Contiene le funzioni di traduzione dei testi e dei messaggi del backend.
 *
 * @module i18n/lingua
 */
import { TESTI, MESSAGGI_SERVER_EN } from './testi';

/**
 * Lingue disponibili.
 *
 * @type {string[]}
 */
export const LINGUE = ['it', 'en'];

/**
 * Nome dell'evento del browser lanciato quando cambia la lingua (ascoltato da {@link module:hooks/useLingua}).
 *
 * @type {string}
 */
export const EVENTO_LINGUA = 'lingua-cambiata';
const CHIAVE = 'lingua';

const leggiLinguaSalvata = () => {
    try {
        const salvata = localStorage.getItem(CHIAVE);
        return LINGUE.includes(salvata) ? salvata : 'it';
    } catch {
        return 'it';
    }
};

/**
 * Lingua scelta nelle visite precedenti.
 *
 * @returns {('it'|'en')} La lingua salvata, oppure `'it'`.
 */
export const getLingua = () => leggiLinguaSalvata();

/**
 * Salva la lingua scelta, aggiorna l'attributo `lang` della pagina e avvisa i componenti.
 * Le lingue non previste vengono ignorate.
 *
 * @param {string} lingua `'it'` oppure `'en'`.
 * @returns {void}
 */
export const setLingua = (lingua) => {
    if (!LINGUE.includes(lingua)) return;
    try {
        localStorage.setItem(CHIAVE, lingua);
    } catch {
        /* localStorage non disponibile */
    }
    document.documentElement.lang = lingua;
    window.dispatchEvent(new Event(EVENTO_LINGUA));
};

/**
 * Restituisce il testo di una chiave nella lingua scelta, con i segnaposto `{nome}` sostituiti.
 * Se manca la traduzione inglese si usa l'italiano; se manca anche quello, la chiave stessa.
 *
 * @example
 * traduci('header.ciao', { nome: 'Mario' }, 'it'); // 'Ciao, Mario'
 *
 * @param {string} chiave Chiave del testo (vedi {@link module:i18n/testi}).
 * @param {Object<string, (string|number)>} [parametri={}] Valori dei segnaposto.
 * @param {('it'|'en')} [lingua] Lingua; predefinita quella scelta dall'utente.
 * @returns {string} Testo tradotto.
 */
export const traduci = (chiave, parametri = {}, lingua = getLingua()) => {
    const testo = TESTI[lingua]?.[chiave] ?? TESTI.it[chiave] ?? chiave;
    return testo.replace(/\{(\w+)\}/g, (intero, nome) => (nome in parametri ? String(parametri[nome]) : intero));
};

/**
 * Traduce in inglese un messaggio del backend (che risponde sempre in italiano), quando è conosciuto.
 * Gestisce anche gli errori di validazione nel formato `"campo: messaggio · campo: messaggio"`.
 *
 * @param {string} messaggio Messaggio ricevuto dal backend.
 * @param {('it'|'en')} [lingua] Lingua; predefinita quella scelta dall'utente.
 * @returns {string} Messaggio tradotto, oppure invariato se in italiano o sconosciuto.
 */
export const traduciServer = (messaggio, lingua = getLingua()) => {
    if (lingua === 'it' || typeof messaggio !== 'string') return messaggio;
    const traduciUno = (testo) => {
        if (MESSAGGI_SERVER_EN[testo]) return MESSAGGI_SERVER_EN[testo];
        const separatore = testo.indexOf(': ');
        if (separatore > 0) {
            const resto = testo.slice(separatore + 2);
            if (MESSAGGI_SERVER_EN[resto]) return `${testo.slice(0, separatore)}: ${MESSAGGI_SERVER_EN[resto]}`;
        }
        return testo;
    };
    return messaggio.split(' · ').map(traduciUno).join(' · ');
};

/**
 * Formatta una data nel formato della lingua scelta (`gg/mm/aaaa` in entrambe le lingue).
 *
 * @param {string} iso Data in formato ISO.
 * @param {('it'|'en')} [lingua] Lingua; predefinita quella scelta dall'utente.
 * @returns {string} Data formattata.
 */
export const formatoData = (iso, lingua = getLingua()) =>
    new Date(iso).toLocaleDateString(lingua === 'en' ? 'en-GB' : 'it-IT');
