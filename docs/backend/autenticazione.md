# Autenticazione

Il backend usa **token firmati con HMAC-SHA256** (senza librerie esterne) che contengono email, ruolo e scadenza.
I ruoli sono tre: `admin` (area riservata), `utente` (visitatore registrato) e `reset` (link per reimpostare la password).
Le password dei visitatori sono salvate solo come hash **PBKDF2-SHA256** con sale casuale.

::: auth
