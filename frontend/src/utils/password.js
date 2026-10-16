// Regola della password, uguale a quella controllata dal backend (registrazione e reset).
// "chiave" è il testo da mostrare, tradotto con t() nella lingua scelta.
export const REGOLE_PASSWORD = [
    { chiave: 'password.lunghezza', ok: (p) => p.length >= 6 },
    { chiave: 'password.maiuscola', ok: (p) => /[A-Z]/.test(p) },
    { chiave: 'password.numero', ok: (p) => /\d/.test(p) },
];

export const requisitiMancanti = (password) => REGOLE_PASSWORD.filter((r) => !r.ok(password)).map((r) => r.chiave);
