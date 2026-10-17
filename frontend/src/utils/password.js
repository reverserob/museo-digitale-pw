/**
 * Regole della password, uguali a quelle controllate dal backend (registrazione e reset).
 *
 * @module utils/password
 */

/**
 * Una regola della password.
 *
 * @typedef {object} RegolaPassword
 * @property {string} chiave Chiave del testo da mostrare, tradotto con `t()` nella lingua scelta.
 * @property {function(string): boolean} ok Restituisce `true` se la password rispetta la regola.
 */

/**
 * Elenco delle regole: almeno 6 caratteri, una lettera maiuscola e un numero.
 *
 * @type {RegolaPassword[]}
 */
export const REGOLE_PASSWORD = [
    { chiave: 'password.lunghezza', ok: (p) => p.length >= 6 },
    { chiave: 'password.maiuscola', ok: (p) => /[A-Z]/.test(p) },
    { chiave: 'password.numero', ok: (p) => /\d/.test(p) },
];

/**
 * Restituisce le chiavi dei requisiti non rispettati.
 *
 * @example
 * requisitiMancanti('museo'); // ['password.lunghezza', 'password.maiuscola', 'password.numero']
 * requisitiMancanti('Museo2026'); // []
 *
 * @param {string} password Password da controllare.
 * @returns {string[]} Chiavi dei requisiti mancanti (array vuoto = password valida).
 */
export const requisitiMancanti = (password) => REGOLE_PASSWORD.filter((r) => !r.ok(password)).map((r) => r.chiave);
