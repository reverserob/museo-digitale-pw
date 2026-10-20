# Architettura

## Architettura generale e deploy

Il sistema è composto da tre livelli (presentazione, logica applicativa, dati) distribuiti su servizi diversi:

```mermaid
flowchart LR
    subgraph Client["Dispositivo dell'utente"]
        B["Browser<br/>(visitatore o amministratore)"]
    end
    subgraph Vercel["Vercel (CDN)"]
        F["Front-end React<br/>file statici HTML, JS, CSS"]
    end
    subgraph Render["Render (Web Service)"]
        U["Uvicorn<br/>server ASGI"] --> A["Applicazione FastAPI<br/>router + servizi"]
        A --> O["SQLAlchemy ORM"]
        O --> D[("SQLite<br/>museo.db")]
        A --> S["Cartella static/uploads<br/>immagini delle mostre"]
    end
    subgraph Brevo["Brevo"]
        M["API email transazionali"]
    end
    B -- "1. HTTPS: scarica l'applicazione" --> F
    B -- "2. HTTPS + JSON: chiamate REST /api/..." --> U
    B -- "3. HTTPS: immagini /static/..." --> U
    A -- "4. HTTPS: invio email di conferma" --> M
    M -- "SMTP" --> E["Casella email del visitatore"]
```

1. Il browser scarica da Vercel il front-end, cioè file statici distribuiti tramite una rete di server vicini all'utente (CDN).
2. L'applicazione React, in esecuzione nel browser, chiama le API REST del back-end su Render scambiando dati in formato JSON.
3. Le immagini delle mostre sono servite direttamente dal back-end come file statici.

## Struttura del backend

```
backend/
├── main.py                 → crea l'app, configura CORS, file statici e gestori errori, include i router
├── settings.py             → configurazione letta dalle variabili d'ambiente (.env / .env.local)
├── database.py             → connessione SQLAlchemy e dipendenza get_db()
├── models.py               → modelli ORM (Mostra, Prenotazione, Feedback, Utente)
├── schemas.py              → schemi Pydantic per la validazione di input e output
├── auth.py                 → hash delle password, token con ruolo, controlli di accesso (admin e visitatori)
├── routers/
│   ├── login.py            → POST /api/login (amministratore)
│   ├── utenti.py           → CRUD degli utenti: registrazione, login, profilo, eliminazione dell'account e gestione dall'area riservata (/api/utenti)
│   ├── mostre.py           → CRUD delle mostre (/api/mostre)
│   ├── prenotazioni.py     → POST /api/prenota (una per mostra, con codice), GET /api/prenotazioni, QR code, verifica e ingresso
│   ├── feedback.py         → POST, GET e DELETE /api/feedback
│   ├── statistiche.py      → GET /api/statistiche (indicatori della dashboard)
│   └── contatti.py         → POST /api/contatti (modulo Contatti, invio email al museo)
├── services/
│   ├── mostre_service.py   → ricerca di una mostra e controllo delle date (usato da più router)
│   ├── email_service.py    → email di conferma (API Brevo o SMTP), con QR code in allegato
│   ├── prenotazioni_service.py → codice di prenotazione, QR code (libreria segno) e stato dell'ingresso
│   ├── utenti_service.py   → modifica del profilo ed eliminazione dell'account con anonimizzazione
│   ├── immagini_service.py → validazione e salvataggio delle immagini caricate
│   ├── statistiche_service.py → calcolo degli indicatori per la dashboard
│   ├── rate_limit_service.py → limite ai tentativi di login (slowapi)
│   ├── error_service.py    → formattazione degli errori di validazione (422)
│   ├── migrazioni_service.py → aggiunge al database esistente le colonne introdotte dopo la prima versione
│   └── seed_service.py     → inserimento delle mostre iniziali lette da data/mostre.json
├── data/mostre.json        → dati delle mostre iniziali
├── static/uploads/         → immagini delle mostre
└── tests/                  → test automatici (pytest)
```

I vantaggi di questa organizzazione sono:
- **Leggibilità**: chi cerca le rotte delle mostre apre `routers/mostre.py`, chi deve modificare il testo dell'email apre `services/email_service.py`.
- **Riutilizzo**: i servizi sono funzioni indipendenti dalle rotte; ad esempio `trova_mostra` (in `services/mostre_service.py`) è usata dai router delle mostre, delle prenotazioni e dei feedback, senza che un router dipenda dall'altro.
- **Manutenibilità**: aggiungere una nuova area funzionale significa creare un nuovo router e registrarlo in `main.py` con `app.include_router(...)`, senza toccare il codice esistente. I router `feedback`, `statistiche` e `utenti` sono stati aggiunti proprio in questo modo.
- **Documentazione**: ogni router ha un proprio tag, quindi nella Swagger UI le rotte compaiono raggruppate in *Area riservata*, *Visitatori*, *Mostre*, *Prenotazioni* e *Feedback*.

## Struttura del frontend

```
frontend/src/
├── main.jsx               → punto di ingresso: font e montaggio dell'app
├── App.jsx                → tema, router con le pagine di config/routes.json, header e footer
├── config/routes.json     → elenco delle rotte (percorso, pagina, protezione)
├── pages/                 → una pagina per ogni rotta
├── components/            → header (con IconaMuseo), footer, sezione feedback, indicatori, QrPrenotazione, ProtectedRoute, ErrorBoundary
├── services/              → chiamate HTTP al backend (axios) e gestione dei token
├── hooks/                 → useUtente, useAdmin, useLingua
├── i18n/                  → testi in italiano e inglese, funzioni di traduzione
├── utils/password.js      → regole della password condivise
└── tipi.js                → forma dei dati scambiati con il backend (solo documentazione)
```

In `frontend/public/` ci sono le immagini statiche della home e `favicon.svg`, l'icona del museo mostrata nella scheda del browser.

Le pagine non chiamano mai direttamente le API: usano le funzioni dei moduli `services/*`, che sono gli unici a conoscere gli indirizzi del backend. I dettagli sono nella [documentazione del frontend](../frontend.md).

## Modello dei dati

```mermaid
erDiagram
    MOSTRE ||--o{ PRENOTAZIONI : "riceve"
    MOSTRE ||--o{ FEEDBACK : "riceve"
    UTENTI |o--o{ PRENOTAZIONI : "effettua"
    UTENTI |o--o{ FEEDBACK : "scrive"

    UTENTI {
        int id PK
        string nome "2-100 caratteri"
        string cognome "2-100 caratteri"
        string email "unica, minuscolo"
        string telefono "6-15 cifre"
        string password_hash "PBKDF2-SHA256 con sale"
        datetime creato_il "UTC"
    }

    MOSTRE {
        int id PK
        string titolo "obbligatorio, 3-200 caratteri"
        text descrizione "obbligatoria"
        string immagini "percorsi separati da virgola"
        date data_inizio
        date data_fine "non precede data_inizio"
    }
    PRENOTAZIONI {
        int id PK
        int mostra_id FK "mostre.id, ON DELETE CASCADE"
        int utente_id FK "utenti.id, ON DELETE SET NULL"
        string nome "copiato dall'account"
        string cognome "copiato dall'account"
        string email "copiata dall'account"
        string telefono "6-15 cifre"
        datetime creata_il "UTC"
        string codice "unico, es. MCD-7K3F-9QXA"
        datetime ingresso_il "UTC, NULL se non ancora entrato"
    }
    FEEDBACK {
        int id PK
        int mostra_id FK "mostre.id, ON DELETE CASCADE"
        int utente_id FK "utenti.id, ON DELETE SET NULL"
        string nome "es. Mario R."
        int voto "da 1 a 5"
        text commento "facoltativo, max 500"
        datetime creato_il "UTC"
    }
```

### Descrizione delle entità
- **mostre**: memorizza le esposizioni culturali (il catalogo). Le immagini sono salvate su disco e nel database se ne conservano i percorsi relativi (es. `/static/uploads/<file>.webp`).
- **prenotazioni**: memorizza le prenotazioni effettuate dai visitatori, con data e ora di creazione.
- **feedback**: memorizza le recensioni dei visitatori, con voto da 1 a 5 e commento facoltativo.
- **utenti**: memorizza gli account dei visitatori. La password non viene mai salvata: si conserva solo il suo hash PBKDF2-SHA256, calcolato con un sale casuale e 200.000 iterazioni. L'email è unica.

**Relazioni**: una mostra ha zero o più prenotazioni e zero o più feedback (relazioni 1:N); ogni prenotazione e ogni feedback appartengono a una sola mostra. Un utente può avere più prenotazioni e più feedback (al massimo uno per mostra). Nella prenotazione nome, cognome ed email vengono copiati dall'account al momento della prenotazione, così lo storico resta leggibile anche se l'account cambia; `utente_id` è facoltativo perché i feedback dimostrativi del seeding non hanno un autore. Eliminando una mostra vengono eliminati anche le prenotazioni e i feedback collegati (cascade), così nel database non restano righe "orfane".

**Vincoli applicativi**: i dati inseriti dagli utenti vengono validati a livello di schema (Pydantic con espressioni regolari e validatori personalizzati) prima di essere salvati. Non è possibile prenotare una mostra già conclusa, né lasciare un feedback su una mostra non ancora iniziata.

**Aggiornamento dei database esistenti**: `create_all` crea le tabelle nuove ma non aggiunge colonne a quelle già presenti. All'avvio `migrazioni_service.py` controlla lo schema e, se manca, aggiunge la colonna `utente_id` alle tabelle `prenotazioni` e `feedback` e le colonne `codice` e `ingresso_il` alla tabella `prenotazioni` con `ALTER TABLE`; alle prenotazioni già presenti assegna un codice e crea l'indice unico sulla colonna. Così un `museo.db` creato con una versione precedente continua a funzionare senza perdere dati.

**Indicatori**: i dati delle tabelle mostre, prenotazioni e feedback alimentano la dashboard. Il servizio `statistiche_service.py` calcola i conteggi con query di aggregazione (`COUNT` e `AVG` raggruppati per mostra con `GROUP BY`), invece di caricare in memoria tutte le righe.

## Sequenza: prenotazione di una visita

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitatore
    participant FE as Front-end React
    participant API as FastAPI (router prenotazioni)
    participant PY as Schema Pydantic
    participant DB as SQLite (SQLAlchemy)
    participant BG as BackgroundTasks
    participant EM as Brevo / SMTP

    V->>FE: Clic su PRENOTA da una mostra
    alt Visitatore non collegato
        FE-->>V: Pagina Accedi (poi torna alla prenotazione)
    end
    FE-->>V: Form con nome, cognome ed email dell'account
    V->>FE: Conferma o modifica il telefono e invia
    FE->>API: POST /api/prenota (JSON + token del visitatore)
    API->>API: richiedi_utente: verifica firma, scadenza e ruolo del token
    API->>PY: Validazione PrenotazioneCreate
    alt Dati non validi
        PY-->>API: ValidationError
        API-->>FE: 422 con messaggio leggibile
        FE-->>V: Alert con l'errore
    else Dati validi
        API->>DB: SELECT mostra WHERE id = mostra_id
        alt Mostra inesistente o conclusa
            API-->>FE: 404 oppure 400
            FE-->>V: Alert con l'errore
        else Mostra prenotabile
            API->>DB: INSERT prenotazione (dati dell'account + codice MCD-XXXX-XXXX) + COMMIT
            API->>BG: add_task(invia_email_background)
            API-->>FE: 201 Created
            FE-->>V: "Prenotazione confermata" con codice e QR code
            BG->>EM: Invio email con codice e QR code (anche in allegato PNG)
            EM-->>V: Email nella casella del visitatore
        end
    end
```

## Sequenza: accesso all'area riservata e dashboard
```mermaid
sequenceDiagram
    autonumber
    actor A as Amministratore
    participant FE as Front-end React
    participant API as FastAPI
    participant RL as slowapi (limite tentativi)
    participant AU as auth.py
    participant DB as SQLite

    A->>FE: Inserisce email e password
    FE->>API: POST /api/login
    API->>RL: Controllo tentativi per indirizzo IP
    alt Più di 5 tentativi al minuto
        RL-->>FE: 429 Too Many Requests
    else Entro il limite
        API->>AU: verifica_credenziali (confronto a tempo costante)
        alt Credenziali errate
            API-->>FE: 401 Credenziali errate
        else Credenziali corrette
            AU-->>API: crea_token (firma HMAC-SHA256)
            API-->>FE: 200 access_token
            FE->>FE: Salva il token in sessionStorage
            par Caricamento dati della dashboard
                FE->>API: GET /api/mostre
                FE->>API: GET /api/prenotazioni (Bearer token)
                FE->>API: GET /api/feedback
                FE->>API: GET /api/statistiche (Bearer token)
            end
            API->>AU: richiedi_admin: verifica firma e scadenza
            API->>DB: Query di aggregazione (COUNT, AVG, GROUP BY)
            API-->>FE: Dati in JSON
            FE-->>A: Indicatori, elenco mostre, prenotazioni e feedback
        end
    end
```

## Sequenza: verifica della prenotazione all'ingresso

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitatore
    actor P as Personale del museo
    participant FE as Front-end React
    participant API as FastAPI (router prenotazioni)
    participant DB as SQLite

    V->>P: Mostra il QR code (o comunica il codice MCD-XXXX-XXXX)
    P->>FE: Inquadra il QR: apre /admin/verifica?codice=...
    alt Personale non collegato
        FE-->>P: Pagina di login (next = pagina di verifica)
        P->>FE: Accede come amministratore
    end
    FE->>API: GET /api/prenotazioni/verifica/{codice} (token admin)
    API->>DB: SELECT prenotazione WHERE codice = ...
    alt Codice inesistente
        API-->>FE: 404 Nessuna prenotazione trovata
    else Prenotazione trovata
        API-->>FE: Dati del visitatore e della mostra + stato
        FE-->>P: "Prenotazione valida" (oppure già usata, mostra non iniziata o conclusa)
        P->>FE: Registra ingresso
        FE->>API: POST /api/prenotazioni/verifica/{codice}/ingresso
        API->>DB: UPDATE ingresso_il = ora attuale
        API-->>FE: 200 (un secondo tentativo riceve 409)
        FE-->>P: "Ingresso registrato"
    end
```
