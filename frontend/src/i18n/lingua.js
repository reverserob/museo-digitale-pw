import { TESTI, MESSAGGI_SERVER_EN } from './testi';

// Lingua dell'interfaccia: 'it' (predefinita) o 'en', ricordata nel browser
export const LINGUE = ['it', 'en'];
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

export const getLingua = () => leggiLinguaSalvata();

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

// t('chiave', { nome: 'Mario' }) -> testo nella lingua scelta, con i segnaposto {nome} sostituiti.
// Se manca la traduzione inglese si usa l'italiano; se manca anche quello, la chiave stessa.
export const traduci = (chiave, parametri = {}, lingua = getLingua()) => {
    const testo = TESTI[lingua]?.[chiave] ?? TESTI.it[chiave] ?? chiave;
    return testo.replace(/\{(\w+)\}/g, (intero, nome) => (nome in parametri ? String(parametri[nome]) : intero));
};

// I messaggi del backend sono in italiano: in inglese li traduco quando li conosco.
// Gestisce anche gli errori di validazione nel formato "campo: messaggio · campo: messaggio".
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

// data e ora nel formato della lingua scelta
export const formatoData = (iso, lingua = getLingua()) =>
    new Date(iso).toLocaleDateString(lingua === 'en' ? 'en-GB' : 'it-IT');
