// Regola della password, uguale a quella controllata dal backend (registrazione e reset)
export const REGOLE_PASSWORD = [
    { testo: 'almeno 6 caratteri', ok: (p) => p.length >= 6 },
    { testo: 'una lettera maiuscola', ok: (p) => /[A-Z]/.test(p) },
    { testo: 'un numero', ok: (p) => /\d/.test(p) },
];

export const requisitiMancanti = (password) => REGOLE_PASSWORD.filter((r) => !r.ok(password)).map((r) => r.testo);
