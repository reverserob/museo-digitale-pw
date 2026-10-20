# RELAZIONE TECNICA DI PROGETTO
## Project Work - MUSEO DIGITALE
## Tema n. 1: La digitalizzazione dell’impresa
### PW 2 Digitalizzazione dei processi aziendali in un’impresa culturale:
Progettazione di una piattaforma informatica per la gestione di servizi, dati e utenti

**Autrice:** Roberta Randazzo
**Repository:** [github.com/reverserob/museo-digitale-pw](https://github.com/reverserob/museo-digitale-pw)
**Applicazione online:** [museo-digitale-pw-azure.vercel.app](https://museo-digitale-pw-azure.vercel.app/)

#### Indice
1. [Contesto organizzativo](#1-contesto-organizzativo)
2. [Problema e analisi del processo](#2-problema-e-analisi-del-processo)
3. [Requisiti e soluzione proposta](#3-requisiti-e-soluzione-proposta)
4. [Architettura del sistema](#4-architettura-del-sistema)
5. [Modello dei dati](#5-modello-dei-dati)
6. [Diagrammi UML](#6-diagrammi-uml)
7. [Documentazione delle API](#7-documentazione-delle-api)
8. [Architettura dei calcolatori applicata al progetto](#8-architettura-dei-calcolatori-applicata-al-progetto)
9. [Scelte tecnologiche e sicurezza](#9-scelte-tecnologiche-e-sicurezza)
10. [Implementazione del front-end](#10-implementazione-del-front-end)
11. [Qualità del codice e test automatici](#11-qualità-del-codice-e-test-automatici) (con la documentazione generata dal codice)
12. [Test funzionali e scenari d'uso](#12-test-funzionali-e-scenari-duso)
13. [Istruzioni per l'esecuzione](#13-istruzioni-per-lesecuzione)
14. [Deploy](#14-deploy)
15. [Limiti e sviluppi futuri](#15-limiti-e-sviluppi-futuri)
16. [Dichiarazione sull'uso di strumenti di intelligenza artificiale](#16-dichiarazione-sulluso-di-strumenti-di-intelligenza-artificiale)

---

### 1. Contesto organizzativo
Il progetto è ambientato in un **museo civico di medie dimensioni** (organizzazione simulata), di proprietà comunale, che affianca alla collezione permanente un programma di **mostre temporanee**: tre o quattro esposizioni all'anno, ciascuna della durata di alcuni mesi.

Lo scenario ipotizzato è il seguente:

| Aspetto | Situazione ipotizzata |
|---|---|
| Natura giuridica | Museo civico, gestito dal Comune |
| Visitatori | circa 25.000 all'anno, con picchi nei fine settimana e durante le inaugurazioni |
| Offerta | collezione permanente + 3-4 mostre temporanee all'anno, visite su prenotazione |
| Personale | direttore, curatore delle mostre, 2 addetti all'accoglienza e alla biglietteria, 1 addetto alla segreteria e alla comunicazione |
| Dotazione informatica | PC d'ufficio, casella email istituzionale, fogli di calcolo; nessun gestionale dedicato alle prenotazioni |
| Canali verso il pubblico | sito istituzionale statico, telefono, email, profili social |

In questo contesto il personale è ridotto e le stesse persone si occupano sia dell'accoglienza sia delle attività amministrative: ogni ora dedicata a operazioni ripetitive (rispondere al telefono, ricopiare prenotazioni, aggiornare il sito) è tolta alla cura dei visitatori e delle mostre.

### 2. Problema e analisi del processo
Il processo scelto per la digitalizzazione è la **gestione delle mostre temporanee e delle prenotazioni delle visite**, che coinvolge tre attori: il visitatore, il personale di accoglienza e la direzione/curatela.

#### 2.1. Processo attuale (AS-IS)
Oggi la prenotazione avviene per telefono o per email. L'addetto controlla la disponibilità su un registro (cartaceo o foglio di calcolo), annota i dati del visitatore e risponde con un'email scritta a mano. Il catalogo delle mostre è pubblicato sul sito istituzionale, aggiornato su richiesta da un fornitore esterno.

Il processo è modellato con un **diagramma di attività UML**: le partizioni (swimlane) indicano chi svolge ogni azione, i rombi le decisioni con le condizioni di guardia tra parentesi quadre, il cerchio pieno e il cerchio cerchiato l'inizio e la fine.

![Diagramma di attività UML del processo AS-IS](docs/diagrammi/processo-as-is.png)

*Figura – Diagramma di attività UML del processo AS-IS (sorgente PlantUML: `docs/diagrammi/processo-as-is.puml`).*

**Criticità emerse:**
- **Tempo del personale**: telefonate ed email occupano gli addetti negli stessi orari in cui accolgono il pubblico.
- **Servizio limitato agli orari d'ufficio**: fuori orario non è possibile prenotare.
- **Errori di trascrizione**: nomi, email e numeri di telefono vengono ricopiati più volte (telefono → registro → email → report).
- **Dati frammentati**: il registro non è condiviso; la direzione non sa in tempo reale quante prenotazioni ha ogni mostra.
- **Nessun riscontro dal pubblico**: le opinioni dei visitatori non vengono raccolte in modo strutturato.
- **Catalogo poco aggiornato**: pubblicare o modificare una mostra richiede l'intervento di un fornitore esterno.

#### 2.2. Processo digitalizzato (TO-BE)
Con la piattaforma il visitatore consulta il catalogo e prenota da solo, a qualsiasi ora. La prenotazione viene validata e salvata nel database e la conferma parte automaticamente via email. Il personale gestisce le mostre in autonomia dall'area riservata e la direzione consulta gli indicatori aggiornati in tempo reale.

Nel **diagramma di attività UML** del processo digitalizzato compare la partizione della piattaforma, che svolge in automatico controlli, conferme e calcolo degli indicatori; la barra di fork indica le due azioni parallele (conferma a video ed email).

![Diagramma di attività UML del processo TO-BE](docs/diagrammi/processo-to-be.png)

*Figura – Diagramma di attività UML del processo TO-BE (sorgente PlantUML: `docs/diagrammi/processo-to-be.puml`).*

#### 2.3. Benefici attesi

| Criticità AS-IS | Soluzione TO-BE |
|---|---|
| Prenotazioni solo in orario d'ufficio | Prenotazione online disponibile 24 ore su 24 |
| Dati ricopiati più volte | I dati sono inseriti una sola volta dal visitatore e validati automaticamente |
| Email di conferma scritte a mano | Email generata e inviata dal sistema |
| Registro locale non condiviso | Database unico consultabile dall'area riservata |
| Nessun dato per le decisioni | Dashboard con prenotazioni per mostra, andamento e voto medio |
| Nessun riscontro dal pubblico | Feedback con voto da 1 a 5 e commento, moderabili dall'amministratore |
| Catalogo aggiornato da un fornitore esterno | Il personale pubblica e modifica le mostre in autonomia |

### 3. Requisiti e soluzione proposta
Il presente Project Work ha come obiettivo la progettazione e lo sviluppo di una piattaforma informatica full-stack orientata alla digitalizzazione dei processi del museo.

#### 3.1. Requisiti funzionali
- **RF1 – Catalogo**: la home presenta il museo e porta, con il pulsante "Scopri le esposizioni correnti", all'elenco delle mostre (/esposizioni) e al dettaglio con la galleria di immagini. Il menu contiene le voci Home, Esposizioni e Contatti. Un footer in ogni pagina riporta orari (lunedì–sabato 09:00–18:30), indirizzo e la modalità di prenotazione: le visite si prenotano solo online, con il pulsante PRENOTA nella pagina di ogni mostra.
- **RF2 – Prenotazione**: il visitatore registrato prenota una visita; nome, cognome ed email arrivano dal suo account e può indicare un telefono diverso. Non è possibile prenotare una mostra già conclusa.
- **RF3 – Conferma e codice di prenotazione**: dopo la prenotazione il visitatore riceve un'email di riepilogo con un **codice di riferimento** univoco (es. `MCD-7K3F-9QXA`) e un **QR code**, visibili anche nella pagina di conferma e nell'area personale.
- **RF4 – Feedback**: il visitatore registrato lascia un voto da 1 a 5 e un commento facoltativo su una mostra già iniziata (uno per mostra); i feedback sono visibili a tutti, anche senza account, con nome e iniziale del cognome.
- **RF5 – Accesso riservato**: l'amministratore accede con email e password.
- **RF10 – Account dei visitatori**: chiunque può consultare il catalogo, ma per prenotare e lasciare feedback deve registrarsi (nome, cognome, email, telefono, password) o accedere. Ogni email può essere registrata una sola volta (al secondo tentativo compare l'errore "Utente già registrato"); dopo la registrazione il visitatore riceve un'email di conferma. Nell'area personale il visitatore vede le proprie prenotazioni; può uscire (logout) dall'intestazione del sito e, se dimentica la password, reimpostarla con un link temporaneo ricevuto per email. Può lasciare un feedback solo sulle mostre a cui si è prenotato. Finché un visitatore è collegato, l'area riservata non è accessibile: prima deve uscire.
- **RF16 – Gestione degli account (CRUD utenti)**: il visitatore modifica nome, cognome e telefono dalla propria area personale (l'email identifica l'account e non cambia) e può eliminare il proprio account confermando la password (diritto alla cancellazione); al termine riceve un'**email di conferma dell'eliminazione** con il numero di prenotazioni annullate: le prenotazioni non ancora usate vengono annullate, quelle già usate per l'ingresso restano nello storico in forma anonima e i feedback restano visibili con il nome "Visitatore". L'amministratore, dalla pagina **Gestione utenti**, consulta l'elenco degli account con ricerca, numero di prenotazioni e feedback, ne corregge i dati e può eliminarli con le stesse regole (anche in questo caso il titolare riceve l'email di conferma). La creazione dell'account avviene con la registrazione (RF10).
- **RF6 – Gestione catalogo**: l'amministratore pubblica, modifica ed elimina le mostre e ne carica le immagini.
- **RF7 – Consultazione prenotazioni**: l'amministratore vede le prenotazioni ricevute, suddivise per mostra, con il codice di ciascuna.
- **RF15 – Verifica all'ingresso**: il personale verifica chi si presenta inserendo il codice di prenotazione (o il numero) oppure inquadrando con il telefono il QR code, che apre la pagina di verifica dell'area riservata; la pagina indica se la prenotazione è valida per quel giorno e permette di registrare l'ingresso (una sola volta per prenotazione).
- **RF8 – Moderazione**: l'amministratore può eliminare i feedback non appropriati, sia dalla dashboard sia dalla pagina della mostra aperta da collegato. I visitatori non vedono mai il pulsante di eliminazione.
- **RF11 – Ruoli separati**: l'amministratore non prenota (il pulsante PRENOTA non compare né in home né nel dettaglio della mostra e il server rifiuta la sua prenotazione con 403); da collegato l'intestazione mostra "Ciao, Admin" ed "Esci" al posto di Accedi/Registrati. Solo i visitatori registrati possono prenotare, e ognuno può lasciare un solo feedback per mostra.
- **RF12 – Gestione delle proprie prenotazioni**: ogni visitatore può prenotarsi una sola volta a ciascuna mostra (409 al secondo tentativo; nel catalogo compare "MOSTRA PRENOTATA" e il form non viene mostrato) e può annullare una prenotazione dalla propria area: la prenotazione viene eliminata e arriva un'email di conferma dell'annullamento. Dopo l'annullamento è possibile prenotarsi di nuovo.
- **RF13 – Sito in due lingue**: un menu a tendina nell'intestazione permette di scegliere tra italiano (ITA) e inglese (EN); la scelta viene ricordata nel browser.
- **RF14 – Modulo Contatti**: dalla voce Contatti del menu i visitatori registrati possono inviare una domanda al museo (titolo, descrizione, nome, cognome, email, telefono). La richiesta arriva per email alla casella del museo (variabile `CONTATTI_EMAIL`); con "Rispondi" si scrive direttamente al visitatore. Chi non ha un account vede l'invito ad accedere.
- **RF9 – Dashboard**: l'amministratore consulta indicatori di sintesi (prenotazioni totali e degli ultimi 7 giorni, mostre in corso, in arrivo e concluse, numero di feedback e voto medio, prenotazioni per mostra).

#### 3.2. Requisiti non funzionali
- **Sicurezza**: credenziali fuori dal codice, password dei visitatori salvate solo come hash, token firmati con ruolo (amministratore o visitatore), limite ai tentativi di accesso, validazione di tutti i dati in ingresso, controllo dei file caricati.
- **Usabilità**: interfaccia responsive, messaggi di errore comprensibili, validazione dei form in tempo reale.
- **Manutenibilità**: codice suddiviso per responsabilità, configurazione tramite variabili d'ambiente, test automatici e integrazione continua.
- **Persistenza**: i dati (comprese le immagini caricate) devono restare dopo il riavvio o la sospensione del server: in produzione si usa PostgreSQL.
- **Portabilità**: lo stesso codice funziona con SQLite (sviluppo e test) e PostgreSQL (produzione), cambiando solo la variabile `DATABASE_URL`; il back-end funziona con Python dalla 3.9 alla 3.15.
- **Prestazioni**: email inviate in background dopo la risposta, pagine caricate su richiesta, pacchetto JavaScript principale sotto i 200 KB compresso.
- **Privacy**: dati personali ridotti al minimo, QR code senza dati personali, modifica ed eliminazione dell'account da parte del visitatore (GDPR).

#### 3.3. La soluzione
Per soddisfare i requisiti di scalabilità, manutenibilità e separazione delle responsabilità, si è optato per un’architettura disaccoppiata (Client-Server):

**Back-end**: sviluppato in Python mediante il framework FastAPI, ad alte prestazioni e basato su Type Hints nativi. Gestisce la logica di business, l'interazione con il database relazionale e i servizi di comunicazione asincrona.

**Front-end**: sviluppato in React (con Vite come bundler) e la libreria di componenti grafici Material-UI (MUI). Offre un'interfaccia utente reattiva, fluida e accessibile, comunicando con il back-end esclusivamente tramite chiamate asincrone basate su API REST (axios).

Questa separazione garantisce che il client e il server possano evolvere indipendentemente, riducendo l'accoppiamento strutturale e migliorando la sicurezza complessiva del sistema.

### 4. Architettura del sistema

#### 4.1. Architettura generale e deploy
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
        A --> S["Cartella static/uploads<br/>immagini delle mostre iniziali"]
    end
    subgraph Neon["Neon (PostgreSQL gestito)"]
        D[("PostgreSQL<br/>tabelle + immagini caricate")]
    end
    O -- "TLS, porta 5432" --> D
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
4. Dopo una prenotazione il back-end invia l'email di conferma tramite l'API HTTPS di Brevo (in locale, in alternativa, tramite SMTP). L'email contiene il QR code in allegato e, online, anche come immagine che il programma di posta scarica dal back-end (`/api/prenotazioni/qr/...`).

#### 4.2. Struttura del back-end e separazione delle responsabilità
All'interno del back-end è stato applicato il principio della separazione delle responsabilità (Separation of Concerns): ogni modulo ha un compito preciso e il file principale si limita a configurare l'applicazione e a unire i moduli. Le rotte sono organizzate con gli `APIRouter` di FastAPI, mentre la logica riutilizzabile è raccolta nella cartella `services/`.

**Pattern architetturale.** Questa organizzazione applica il pattern **a livelli** (*layered architecture*) ed è una declinazione dell'**MVC** per le API REST: i router (`routers/`) svolgono il ruolo di *Controller* (ricevono la richiesta, controllano permessi e dati tramite le dipendenze, restituiscono la risposta); i modelli SQLAlchemy (`models.py`), gli schemi Pydantic (`schemas.py`) e i servizi con la logica di business (`services/`) formano il *Model*; la *View* è il front-end React, che riceve solo dati JSON. Ogni livello dipende solo da quello sottostante (router → servizi → modelli → database), quindi può essere sostituito o testato in isolamento, come avviene nei test con il database temporaneo e l'invio delle email simulato.

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
│   ├── utenti.py           → CRUD degli utenti: registrazione, login, profilo (modifica ed eliminazione), prenotazioni personali e gestione account dell'amministratore (/api/utenti)
│   ├── mostre.py           → CRUD delle mostre (/api/mostre)
│   ├── prenotazioni.py     → POST /api/prenota (una per mostra, con codice), GET /api/prenotazioni, QR code, verifica e ingresso
│   ├── feedback.py         → POST, GET e DELETE /api/feedback
│   ├── statistiche.py      → GET /api/statistiche (indicatori della dashboard)
│   └── contatti.py         → POST /api/contatti (modulo Contatti, invio email al museo)
├── services/
│   ├── mostre_service.py   → ricerca di una mostra e controllo delle date (usato da più router)
│   ├── email_service.py    → email di conferma (API Brevo o SMTP), con QR code in allegato
│   ├── prenotazioni_service.py → codice di prenotazione, QR code (libreria segno) e stato dell'ingresso
│   ├── utenti_service.py   → modifica del profilo, riepilogo per l'area riservata ed eliminazione dell'account con anonimizzazione
│   ├── immagini_service.py → validazione e salvataggio delle immagini caricate
│   ├── statistiche_service.py → calcolo degli indicatori per la dashboard
│   ├── rate_limit_service.py → limite ai tentativi di login (slowapi)
│   ├── error_service.py    → formattazione degli errori di validazione (422)
│   ├── migrazioni_service.py → aggiunge al database esistente le colonne introdotte dopo la prima versione
│   └── seed_service.py     → inserimento delle mostre iniziali lette da data/mostre.json
├── data/mostre.json        → dati delle mostre iniziali
├── static/uploads/         → immagini delle mostre iniziali (quelle caricate dall'area riservata sono nel database)
└── tests/                  → test automatici (pytest)
```

I vantaggi di questa organizzazione sono:
- **Leggibilità**: chi cerca le rotte delle mostre apre `routers/mostre.py`, chi deve modificare il testo dell'email apre `services/email_service.py`.
- **Riutilizzo**: i servizi sono funzioni indipendenti dalle rotte; ad esempio `trova_mostra` (in `services/mostre_service.py`) è usata dai router delle mostre, delle prenotazioni e dei feedback, senza che un router dipenda dall'altro.
- **Manutenibilità**: aggiungere una nuova area funzionale significa creare un nuovo router e registrarlo in `main.py` con `app.include_router(...)`, senza toccare il codice esistente. I router `feedback`, `statistiche` e `utenti` sono stati aggiunti proprio in questo modo.
- **Documentazione**: ogni router ha un proprio tag, quindi nella Swagger UI le rotte compaiono raggruppate in *Area riservata*, *Visitatori*, *Mostre*, *Prenotazioni* e *Feedback*.

### 5. Modello dei dati
Il sistema si appoggia a un database relazionale, **PostgreSQL in produzione** e SQLite in sviluppo e nei test, interfacciato tramite l'ORM SQLAlchemy per la gestione trasparente delle entità in oggetti Python. Le tabelle vengono create automaticamente all'avvio e, se il database è vuoto, vengono inserite le mostre dimostrative descritte nel file `data/mostre.json` (seeding): per aggiungere o modificare le mostre iniziali basta modificare il file JSON, senza toccare il codice. Il catalogo iniziale comprende sette mostre, ciascuna con una descrizione del percorso espositivo e almeno un'immagine: *Caravaggio e il suo tempo*, *Leonardo: Il Codice Atlantico*, *Monet: La Natura*, *Dalí e le forme*, *Van Gogh: la Notte stellata e il colore*, *Hokusai: la Grande onda* e *Munch: l'Urlo e l'anima moderna*. Le immagini delle mostre iniziali sono riproduzioni di opere di pubblico dominio (per Dalí un'immagine dimostrativa già presente nel progetto) e si trovano in `static/uploads/`.

Nello stesso file ogni mostra può avere un elenco di `feedback` (nome, voto, commento):
le recensioni indicate vengono inserite insieme alla mostra e collegate a essa tramite la relazione SQLAlchemy, così l'applicazione parte già con dei dati dimostrativi anche per la sezione delle opinioni e per gli indicatori della dashboard. Nei test automatici questi feedback vengono rimossi prima di ogni test, così i conteggi partono sempre da zero.

#### 5.1. Diagramma Entità-Relazione

```mermaid
erDiagram
    MOSTRE ||--o{ PRENOTAZIONI : "riceve"
    MOSTRE ||--o{ FEEDBACK : "riceve"
    UTENTI |o--o{ PRENOTAZIONI : "effettua"
    UTENTI |o--o{ FEEDBACK : "scrive"

    IMMAGINI {
        int id PK
        string nome "unico, uuid + estensione"
        string tipo "MIME, es. image/webp"
        bytes dati "BYTEA in PostgreSQL"
        datetime creata_il "UTC"
    }

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

#### 5.2. Descrizione delle entità
- **immagini**: contiene le immagini caricate dall'area riservata (nome generato dal server, tipo MIME e contenuto binario: `BYTEA` in PostgreSQL, `BLOB` in SQLite), servite da `GET /api/immagini/{nome}`.
- **mostre**: memorizza le esposizioni culturali (il catalogo). Nella colonna `immagini` si conservano i percorsi delle immagini: `/api/immagini/<nome>` per quelle caricate (salvate nella tabella immagini) e `/static/uploads/<file>.webp`).
- **prenotazioni**: memorizza le prenotazioni effettuate dai visitatori, con data e ora di creazione.
- **feedback**: memorizza le recensioni dei visitatori, con voto da 1 a 5 e commento facoltativo.
- **utenti**: memorizza gli account dei visitatori. La password non viene mai salvata: si conserva solo il suo hash PBKDF2-SHA256, calcolato con un sale casuale e 200.000 iterazioni. L'email è unica. Su questa tabella sono disponibili tutte le operazioni CRUD: creazione con la registrazione, lettura del profilo (e dell'elenco, per l'amministratore), modifica di nome, cognome e telefono, eliminazione dell'account.

**Relazioni**: una mostra ha zero o più prenotazioni e zero o più feedback (relazioni 1:N); ogni prenotazione e ogni feedback appartengono a una sola mostra. Un utente può avere più prenotazioni e più feedback (al massimo uno per mostra). Nella prenotazione nome, cognome ed email vengono copiati dall'account al momento della prenotazione, così lo storico resta leggibile anche se l'account cambia; `utente_id` è facoltativo perché i feedback dimostrativi del seeding non hanno un autore. Eliminando una mostra vengono eliminati anche le prenotazioni e i feedback collegati (cascade), così nel database non restano righe "orfane". Eliminando un account, invece, le prenotazioni non ancora usate vengono cancellate, quelle già usate per l'ingresso restano ma senza nome, email e telefono, e i feedback restano con il nome generico "Visitatore" (`utenti_service.elimina_account`, in un'unica transazione).

**Vincoli applicativi**: i dati inseriti dagli utenti vengono validati a livello di schema (Pydantic con espressioni regolari e validatori personalizzati) prima di essere salvati. Non è possibile prenotare una mostra già conclusa, né lasciare un feedback su una mostra non ancora iniziata.

**Aggiornamento dei database esistenti**: `create_all` crea le tabelle nuove ma non aggiunge colonne a quelle già presenti. All'avvio `migrazioni_service.py` controlla lo schema e, se manca, aggiunge la colonna `utente_id` alle tabelle `prenotazioni` e `feedback` e le colonne `codice` e `ingresso_il` alla tabella `prenotazioni` con `ALTER TABLE`; alle prenotazioni già presenti assegna un codice e crea l'indice unico sulla colonna. Così un `museo.db` creato con una versione precedente continua a funzionare senza perdere dati.

**Indicatori**: i dati delle tabelle mostre, prenotazioni e feedback alimentano la dashboard. Il servizio `statistiche_service.py` calcola i conteggi con query di aggregazione (`COUNT` e `AVG` raggruppati per mostra con `GROUP BY`), invece di caricare in memoria tutte le righe.

#### 5.3. Database di produzione: PostgreSQL
**Perché.** Sul piano gratuito di Render il disco del server è *effimero*: a ogni riavvio, nuovo deploy o sospensione per inattività il file SQLite e le immagini caricate venivano cancellati. Per un museo questo significa perdere prenotazioni e mostre. In produzione il database è quindi un **PostgreSQL gestito** su un servizio esterno, che conserva i dati indipendentemente dal ciclo di vita del server. È stato scelto **Neon** perché il piano gratuito non scade (1 GB di spazio e 100 ore di calcolo al mese per progetto, sospensione automatica dopo 5 minuti di inattività); il PostgreSQL gratuito di Render, invece, viene disattivato dopo 30 giorni e non ha backup ([Render](https://render.com/docs/free), [Neon](https://neon.com/faqs/managed-postgres-databases-free-tier), consultati a ottobre 2026). Il codice funziona con qualsiasi PostgreSQL: basta cambiare `DATABASE_URL`.

**Che cosa è cambiato nel codice.** I modelli SQLAlchemy sono rimasti gli stessi:
- `settings.normalizza_database_url` accetta le stringhe fornite dai servizi cloud (`postgres://...` o `postgresql://...`) e le adatta al driver **psycopg 3** (`postgresql+psycopg://...`);
- `database.py` usa per PostgreSQL un pool di connessioni con `pool_pre_ping` e `pool_recycle`: Neon chiude le connessioni inattive quando sospende il calcolo, e senza questo controllo la prima richiesta dopo una pausa fallirebbe; con SQLite attiva il controllo delle chiavi esterne (`PRAGMA foreign_keys`), così i due database si comportano allo stesso modo;
- le regole "una prenotazione e un feedback per visitatore su ogni mostra" sono garantite anche dal database con gli indici unici `uq_prenotazioni_utente_mostra` e `uq_feedback_utente_mostra`: con due richieste contemporanee la seconda riceve 409 invece di creare un duplicato;
- `migrazioni_service.py` usa tipi validi in entrambi i database (`TIMESTAMP` invece di `DATETIME`) e crea gli indici sui database esistenti;
- le **immagini caricate** sono salvate nella tabella `immagini` nella stessa transazione della mostra (se un file non è valido non resta nulla a metà) e vengono eliminate quando si toglie un'immagine o si elimina la mostra.

**Configurazione.**
1. Su [neon.com](https://neon.com) creare un progetto (regione europea, es. Frankfurt) e copiare la *connection string* (`postgresql://utente:password@host/neondb?sslmode=require`).
2. Su Render, nel servizio del back-end → *Environment*, aggiungere `DATABASE_URL` con quella stringa e salvare: il servizio si riavvia, crea le tabelle e inserisce le mostre iniziali. La stringa contiene la password: non va mai scritta nel codice né in `.env.example`.
3. In locale si può continuare con SQLite (nessuna configurazione) oppure usare la stessa variabile nel file `.env`.

**Test eseguiti.**
- L'intera suite del back-end gira anche su un **PostgreSQL 16 vero**: in locale con `TEST_DATABASE_URL=postgresql://... pytest` e nella CI con il job *Backend (PostgreSQL)*, che avvia un container `postgres:16`.
- `tests/test_database.py` contiene test d'integrazione sul database: rifiuto delle prenotazioni e dei feedback duplicati, delle email e dei codici duplicati e dei riferimenti a mostre inesistenti; cancellazione a cascata e relazioni navigabili; CRUD su mostre e utenti; **8 prenotazioni simultanee** dello stesso visitatore, di cui il database ne accetta una sola (solo su PostgreSQL); persistenza di prenotazione e immagine dopo la chiusura di tutte le connessioni.
- **Prova di persistenza con riavvio reale**: lo script `backend/verifica_persistenza.py` avvia il back-end, crea visitatore, mostra con immagine e prenotazione, termina il processo, lo riavvia e verifica che i dati ci siano ancora. Esito su PostgreSQL:

```
Database: postgresql://postgres:***@127.0.0.1:5433/museo
1. Backend avviato (pid 11149)
2. Creati: visitatore verifica-a5be30fc@esempio.it, mostra n. 8 con immagine /api/immagini/ddddfe4532ad44379e8f1b080e2d89c8.png, prenotazione MCD-EPPG-F8V6
3. Backend fermato: processo terminato, connessioni chiuse
4. Backend riavviato (nuovo pid 11156)
5. prenotazione ancora presente: OK
5. mostra ancora presente: OK
5. immagine ancora presente (stessi byte): OK
6. Dati di prova eliminati
Verifica superata: i dati sono rimasti nel database dopo il riavvio.
```

Lo stesso script si può eseguire contro il database su Neon impostando `DATABASE_URL` (la password non viene stampata).

**Limiti del piano gratuito.** 1 GB di spazio (le immagini occupano posto: il limite di 5 MB per file resta), 100 ore di calcolo al mese, nessuna garanzia di disponibilità; dopo 5 minuti senza richieste il calcolo si sospende e la prima query successiva richiede circa un secondo in più, che si somma all'avvio del back-end su Render dopo 15 minuti di inattività. Per un uso reale servirebbero un piano a pagamento con backup e un object storage per immagini numerose o pesanti.

### 6. Diagrammi UML

#### 6.1. Diagramma dei casi d'uso
Gli attori sono il **visitatore** (che consulta il catalogo senza account e si registra per prenotare e lasciare feedback), l'**amministratore** (personale del museo) e il **servizio email** esterno.

```mermaid
flowchart LR
    V(["👤 Visitatore"])
    AM(["👤 Amministratore"])
    EM(["⚙️ Servizio email"])

    subgraph SYS["Piattaforma Museo Civico Digitale"]
        UC1(("Consultare il catalogo"))
        UC2(("Vedere il dettaglio di una mostra"))
        UC3(("Prenotare una visita"))
        UC4(("Ricevere l'email di conferma"))
        UC5(("Lasciare un feedback"))
        UC11(("Registrarsi o accedere"))
        UC12(("Vedere le mie prenotazioni"))
        UC13(("Modificare o eliminare<br/>il mio account"))
        UC6(("Accedere all'area riservata"))
        UC7(("Gestire le mostre<br/>crea, modifica, elimina"))
        UC8(("Consultare le prenotazioni"))
        UC9(("Moderare i feedback"))
        UC10(("Consultare la dashboard"))
        UC14(("Gestire gli utenti<br/>elenco, modifica, elimina"))
        UC15(("Ricevere la conferma<br/>di eliminazione account"))
    end

    V --- UC1
    V --- UC2
    V --- UC3
    V --- UC5
    V --- UC11
    V --- UC12
    V --- UC13
    UC3 -. "richiede" .-> UC11
    UC5 -. "richiede" .-> UC11
    UC12 -. "richiede" .-> UC11
    UC13 -. "richiede" .-> UC11
    UC3 -. "include" .-> UC4
    UC4 --- EM
    UC13 -. "include" .-> UC15
    UC14 -. "include" .-> UC15
    UC15 --- EM
    AM --- UC6
    AM --- UC7
    AM --- UC8
    AM --- UC9
    AM --- UC10
    AM --- UC14
    UC7 -. "richiede" .-> UC6
    UC8 -. "richiede" .-> UC6
    UC9 -. "richiede" .-> UC6
    UC10 -. "richiede" .-> UC6
    UC14 -. "richiede" .-> UC6
```

#### 6.2. Diagramma delle classi
Il diagramma mostra le classi del modello dati (SQLAlchemy), gli schemi di validazione principali (Pydantic) e i moduli di servizio usati dai router. Le frecce tratteggiate indicano una dipendenza: ad esempio uno schema `PrenotazioneCreate` validato viene usato per creare un oggetto `Prenotazione`; `statistiche_service` aggrega i dati di mostre, prenotazioni e feedback.

```mermaid
classDiagram
    direction TB
    class Mostra {
        +int id
        +str titolo
        +str descrizione
        +str immagini
        +date data_inizio
        +date data_fine
        +list~Prenotazione~ prenotazioni
        +list~Feedback~ feedback
    }
    class Prenotazione {
        +int id
        +int mostra_id
        +int utente_id
        +str nome
        +str cognome
        +str email
        +str telefono
        +datetime creata_il
        +str codice
        +datetime ingresso_il
    }
    class Feedback {
        +int id
        +int mostra_id
        +int utente_id
        +str nome
        +int voto
        +str commento
        +datetime creato_il
    }
    class Utente {
        +int id
        +str nome
        +str cognome
        +str email
        +str telefono
        +str password_hash
        +datetime creato_il
    }
    class PrenotazioneCreate {
        <<Pydantic>>
        +int mostra_id
        +str telefono
        +valida_telefono()
    }
    class FeedbackCreate {
        <<Pydantic>>
        +int mostra_id
        +int voto
        +str commento
        +valida_voto()
    }
    class mostre_service {
        <<service>>
        +trova_mostra(db, id) Mostra
        +converti_date(inizio, fine)
    }
    class email_service {
        <<service>>
        +crea_html_conferma()
        +invia_con_brevo()
        +invia_con_smtp()
        +invia_email_background()
    }
    class prenotazioni_service {
        <<service>>
        +genera_codice(db) str
        +normalizza_codice(testo) str
        +genera_qr_png(codice) bytes
        +stato_ingresso(prenotazione, oggi) str
    }
    class statistiche_service {
        <<service>>
        +stato_mostra(mostra, oggi) str
        +calcola_statistiche(db) dict
    }
    class auth {
        <<module>>
        +verifica_credenziali(email, password) bool
        +hash_password(password) str
        +verifica_password(password, hash) bool
        +crea_token(email, ruolo, utente_id) str
        +richiedi_admin(credenziali) str
        +richiedi_utente(credenziali, db) Utente
    }

    Mostra "1" *-- "0..*" Prenotazione
    Mostra "1" *-- "0..*" Feedback
    Utente "0..1" o-- "0..*" Prenotazione
    Utente "0..1" o-- "0..*" Feedback
    PrenotazioneCreate ..> Prenotazione : crea
    FeedbackCreate ..> Feedback : crea
    mostre_service ..> Mostra : usa
    statistiche_service ..> Mostra : aggrega
```

Le linee con il rombo vuoto indicano un'**aggregazione** tra `Utente` e prenotazioni o feedback: se l'account viene eliminato, prenotazioni e feedback restano (con `utente_id` vuoto). Le linee con il rombo pieno indicano una **composizione** tra `Mostra` e le altre due classi (1 a 0..*): prenotazioni e feedback non esistono senza la mostra a cui si riferiscono, e infatti vengono eliminati insieme a essa.

#### 6.3. Diagramma di sequenza: prenotazione di una visita
Il diagramma mostra il percorso completo di una prenotazione, dal form fino all'email, evidenziando che l'email viene inviata **dopo** la risposta al browser.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitatore
    participant FE as Front-end React
    participant API as FastAPI (router prenotazioni)
    participant PY as Schema Pydantic
    participant DB as PostgreSQL (SQLAlchemy)
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

#### 6.4. Diagramma di sequenza: accesso all'area riservata e dashboard

```mermaid
sequenceDiagram
    autonumber
    actor A as Amministratore
    participant FE as Front-end React
    participant API as FastAPI
    participant RL as slowapi (limite tentativi)
    participant AU as auth.py
    participant DB as PostgreSQL

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

#### 6.5. Diagramma di sequenza: verifica della prenotazione all'ingresso
Il visitatore mostra il QR code ricevuto per email (o comunica il codice); il personale lo inquadra con il telefono e apre direttamente la pagina di verifica.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitatore
    actor P as Personale del museo
    participant FE as Front-end React
    participant API as FastAPI (router prenotazioni)
    participant DB as PostgreSQL

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

### 7. Documentazione delle API
FastAPI genera in modo automatico e nativo la documentazione interattiva delle API basata sullo standard OpenAPI. La Swagger UI, con gli endpoint raggruppati per router, è disponibile in tre punti:
- **in locale**, con il back-end avviato: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs), dove si possono esplorare e provare gli endpoint in tempo reale;
- **sul back-end pubblicato**: [museo-digitale-pw.onrender.com/docs](https://museo-digitale-pw.onrender.com/docs), anch'essa interattiva;
- **nel sito di documentazione** su GitHub Pages: [Guida → Swagger UI](https://reverserob.github.io/museo-digitale-pw/guida/swagger/), una copia di sola lettura. Lo schema `openapi.json` viene esportato a ogni pubblicazione dallo script `backend/esporta_openapi.py` (che importa l'applicazione con un database temporaneo), quindi è sempre allineato al codice. Il pulsante *Try it out* è disattivato perché il back-end accetta richieste dal browser solo dal sito del museo (CORS, vedi §9.2).

#### 7.1. Elenco degli endpoint
🔒 = richiede il token dell'amministratore; 👤 = richiede il token di un visitatore registrato. Il token si invia nell'header `Authorization: Bearer <token>`; un token del ruolo sbagliato viene rifiutato (401 o 403).

| Router | Metodo e percorso | Descrizione | Risposte principali |
|---|---|---|---|
| Area riservata | POST /api/login | Verifica le credenziali dell'amministratore e restituisce un token di accesso firmato a tempo. | 200, 401, 429 |
| Visitatori | POST /api/utenti/registrazione | Crea l'account del visitatore (password salvata come hash), invia l'email di conferma e restituisce subito il token e il profilo. Con un'email già registrata risponde 409 "Utente già registrato" e avvisa per email il titolare dell'account. | 201, 409, 422, 429 |
| Visitatori | POST /api/utenti/login | Verifica email e password del visitatore e restituisce token e profilo. | 200, 401, 429 |
| Visitatori | POST /api/utenti/password-dimenticata | Se l'email è registrata invia un link per reimpostare la password (valido 30 minuti, usabile una volta). La risposta è sempre la stessa, così non si rivela quali email sono registrate. | 200, 429 |
| Visitatori | POST /api/utenti/reimposta-password | Riceve il token del link e la nuova password (stessa regola della registrazione) e aggiorna l'hash. | 200, 400, 422, 429 |
| Visitatori | 👤 GET /api/utenti/me | Profilo del visitatore collegato. | 200, 401, 403 |
| Visitatori | 👤 PUT /api/utenti/me | Modifica nome, cognome e telefono del visitatore collegato (stesse regole della registrazione; l'email non cambia). | 200, 401, 403, 422 |
| Visitatori | 👤 DELETE /api/utenti/me | Elimina l'account del visitatore collegato dopo la conferma della password (corpo `{"password": "..."}`): annulla le prenotazioni non ancora usate, rende anonime quelle già usate e i feedback, poi invia in background l'email di conferma dell'eliminazione. Con la password errata risponde 400 (non 401, che chiuderebbe la sessione nel front-end) e non invia nulla. | 200, 400, 401, 403 |
| Visitatori | 👤 GET /api/utenti/me/prenotazioni | Prenotazioni del visitatore collegato, con titolo e periodo della mostra. | 200, 401, 403 |
| Contatti | 👤 POST /api/contatti | Riceve titolo, descrizione, nome, cognome, email e telefono del visitatore registrato e li invia per email alla casella del museo (con l'email del visitatore come indirizzo di risposta). Senza servizio email configurato (sviluppo locale) la richiesta viene scritta nel log. | 200, 401, 403, 422, 429, 503 |
| Visitatori | 👤 DELETE /api/utenti/me/prenotazioni/{prenotazione_id} | Annulla una prenotazione del visitatore collegato e invia in background l'email di conferma dell'annullamento. La prenotazione di un altro visitatore risulta "non trovata"; una prenotazione già usata per l'ingresso non si può annullare (409). | 200, 401, 403, 404, 409 |
| Visitatori | 👤 GET /api/utenti/me/feedback | Feedback già lasciati dal visitatore collegato (il frontend nasconde il form sulle mostre già recensite). | 200, 401, 403 |
| Area riservata | 🔒 GET /api/utenti | Elenco degli account registrati, dal più recente, con numero di prenotazioni e di feedback (senza hash della password). | 200, 401 |
| Area riservata | 🔒 GET /api/utenti/{utente_id} | Dati di un singolo account. | 200, 401, 404 |
| Area riservata | 🔒 PUT /api/utenti/{utente_id} | L'amministratore corregge nome, cognome o telefono di un account. | 200, 401, 404, 422 |
| Area riservata | 🔒 DELETE /api/utenti/{utente_id} | L'amministratore elimina un account, con le stesse regole dell'eliminazione dal profilo; il titolare riceve l'email di conferma. | 200, 401, 404 |
| Area riservata | 🔒 GET /api/statistiche | Indicatori per la dashboard: conteggi di mostre, prenotazioni e feedback, voto medio, dettaglio per mostra. | 200, 401 |
| Mostre | GET /api/mostre | Restituisce la lista di tutte le esposizioni, ordinate per data di inizio. | 200 |
| Mostre | GET /api/mostre/{mostra_id} | Recupera i dettagli di una singola mostra. | 200, 404 |
| Mostre | 🔒 POST /api/mostre | Caricamento di una nuova mostra e delle relative immagini (multipart/form-data). | 201, 400, 401, 422 |
| Mostre | 🔒 PUT /api/mostre/{mostra_id} | Aggiornamento di un'esposizione esistente. Il campo `immagini_esistenti` (lista JSON) indica quali immagini attuali tenere; le nuove immagini caricate si aggiungono in coda. Deve restare almeno un'immagine. | 200, 400, 401, 404 |
| Mostre | 🔒 DELETE /api/mostre/{mostra_id} | Eliminazione di un'esposizione, delle sue prenotazioni e dei suoi feedback. | 200, 401, 404 |
| Prenotazioni | 👤 POST /api/prenota | Salva la prenotazione con i dati dell'account e un codice di riferimento, restituito nella risposta, e avvia in background l'invio dell'email di conferma con codice e QR code. Una sola prenotazione per visitatore su ogni mostra. | 201, 400, 401, 403, 404, 409, 422 |
| Prenotazioni | 🔒 GET /api/prenotazioni | Elenco delle prenotazioni (con codice e ingresso), filtrabile per mostra (`?mostra_id=`). | 200, 401 |
| Mostre | GET /api/immagini/{nome} | Immagine caricata dall'area riservata, letta dalla tabella immagini del database (sopravvive ai riavvii del server). Solo nomi generati dal server; cache lunga nel browser. | 200, 404 |
| Prenotazioni | GET /api/prenotazioni/qr/{codice} | Immagine PNG del QR code di una prenotazione, usata nell'email e nell'area personale. Contiene solo l'indirizzo della pagina di verifica. | 200, 404 |
| Prenotazioni | 🔒 GET /api/prenotazioni/verifica/{riferimento} | Verifica all'ingresso: dati della prenotazione e della mostra e stato (`valida`, `gia_entrato`, `non_iniziata`, `conclusa`). Il riferimento è il codice (anche in minuscolo o senza trattini) o il numero della prenotazione. | 200, 401, 404 |
| Prenotazioni | 🔒 POST /api/prenotazioni/verifica/{riferimento}/ingresso | Registra l'ingresso del visitatore: una sola volta e solo mentre la mostra è aperta. | 200, 400, 401, 404, 409 |
| Feedback | 👤 POST /api/feedback | Salva il feedback del visitatore su una mostra già iniziata (uno per mostra). | 201, 400, 401, 403, 404, 409, 422 |
| Feedback | GET /api/feedback | Elenco pubblico dei feedback, filtrabile per mostra (`?mostra_id=`), dal più recente. | 200 |
| Feedback | 🔒 DELETE /api/feedback/{feedback_id} | Eliminazione di un feedback (moderazione). | 200, 401, 404 |

#### 7.2. Esempi di richiesta e risposta

**Prenotazione** – `POST /api/prenota`
```json
// richiesta (con header Authorization: Bearer <token del visitatore>; il telefono è facoltativo)
{ "mostra_id": 1, "telefono": "3331234567" }

// risposta 201 Created
{ "message": "Prenotazione effettuata con successo!", "id": 12 }

// risposta 422 Unprocessable Entity (telefono non valido)
{ "detail": "telefono: Il numero di telefono deve contenere da 6 a 15 cifre." }

// risposta 401 Unauthorized (nessun token)
{ "detail": "Accedi o registrati per continuare." }
```

**Feedback** – `POST /api/feedback`
```json
// richiesta (con il token del visitatore; il commento è facoltativo)
{ "mostra_id": 1, "voto": 5, "commento": "Allestimento bellissimo" }

// risposta 201 Created (il nome pubblico viene dall'account: nome e iniziale del cognome)
{ "id": 4, "mostra_id": 1, "nome": "Giulia V.", "voto": 5, "commento": "Allestimento bellissimo", "creato_il": "2026-10-15T09:12:44" }

// risposta 409 Conflict (secondo feedback sulla stessa mostra)
{ "detail": "Hai già lasciato un feedback su questa mostra." }

// risposta 400 Bad Request (mostra non ancora iniziata)
{ "detail": "La mostra non è ancora iniziata: potrai lasciare un feedback dopo la visita." }
```

**Registrazione di un visitatore** – `POST /api/utenti/registrazione`
```json
// richiesta
{ "nome": "Giulia", "cognome": "Verdi", "email": "giulia.verdi@esempio.it", "telefono": "3471234567", "password": "password-sicura" }

// risposta 201 Created (il visitatore è già collegato)
{ "access_token": "eyJzdWIiOi...", "token_type": "bearer",
  "utente": { "id": 3, "nome": "Giulia", "cognome": "Verdi", "email": "giulia.verdi@esempio.it", "telefono": "3471234567" } }

// risposta 409 Conflict
{ "detail": "Esiste già un account con questa email." }
```

**Statistiche** – `GET /api/statistiche` (🔒)
```json
{
  "totale_mostre": 4,
  "mostre_in_corso": 1,
  "mostre_future": 3,
  "mostre_concluse": 0,
  "totale_prenotazioni": 11,
  "prenotazioni_ultimi_7_giorni": 11,
  "totale_feedback": 5,
  "voto_medio": 4.6,
  "per_mostra": [
    { "mostra_id": 1, "titolo": "Caravaggio e il suo tempo", "stato": "in corso", "prenotazioni": 4, "feedback": 5, "voto_medio": 4.6 }
  ]
}
```

#### 7.3. Codici di stato utilizzati

| Codice | Significato nel progetto |
|---|---|
| 200 OK / 201 Created | Operazione riuscita / risorsa creata |
| 400 Bad Request | Errore di logica: date incoerenti, mostra conclusa o non iniziata, file non valido o troppo grande, mostra senza immagini |
| 401 Unauthorized | Credenziali errate, token assente, manomesso, scaduto o del ruolo sbagliato per l'area riservata |
| 403 Forbidden | Token valido ma del ruolo sbagliato: l'amministratore che prova a prenotare o a lasciare un feedback |
| 404 Not Found | Mostra o feedback inesistente |
| 409 Conflict | Email già registrata, seconda prenotazione o secondo feedback dello stesso visitatore sulla stessa mostra, ingresso già registrato, annullamento di una prenotazione già usata |
| 422 Unprocessable Entity | Dati che non rispettano lo schema (con messaggio leggibile) |
| 429 Too Many Requests | Troppi tentativi di login o di registrazione dallo stesso indirizzo IP |
| 500 Internal Server Error | Errore imprevisto nel salvataggio (la transazione viene annullata con rollback) |

### 8. Architettura dei calcolatori applicata al progetto
Questa sezione collega le scelte del progetto ai concetti di architettura dei calcolatori: come i dati vengono **rappresentati**, **elaborati**, **memorizzati** e **trasmessi** tra i componenti.

#### 8.1. Modello client-server e comunicazione in rete
Il sistema segue il modello **client-server**: il browser (client) invia richieste, il back-end (server) le elabora e risponde. La comunicazione attraversa la pila dei protocolli di rete:

| Livello | Protocollo nel progetto | Ruolo |
|---|---|---|
| Applicazione | HTTP/1.1 con metodi REST (GET, POST, PUT, DELETE) e dati JSON | Definisce il significato della richiesta e della risposta |
| Sicurezza | TLS (HTTPS) | Cifra i dati in transito, ad esempio password e dati personali |
| Trasporto | TCP | Garantisce che i byte arrivino integri e nell'ordine giusto |
| Rete | IP | Instrada i pacchetti tra il computer dell'utente e i server di Vercel e Render |

Il server è **senza stato** (*stateless*): non conserva sessioni in memoria e ogni richiesta porta con sé tutto ciò che serve, compreso il token di accesso. Questo permetterebbe di avviare più copie del server senza modificare il codice.

Anche il dialogo tra componenti interni segue lo stesso modello: il back-end è a sua volta *client* del servizio Brevo, a cui invia una richiesta HTTPS sulla porta 443. Il protocollo SMTP (porte 25, 465, 587) resta disponibile come alternativa in locale, perché il piano gratuito di Render blocca quelle porte in uscita.

#### 8.2. Processi, thread ed elaborazione asincrona
Il server Uvicorn è un **processo** del sistema operativo che esegue un **ciclo di eventi** (*event loop*): un unico flusso di esecuzione che, mentre una richiesta attende un'operazione di input/output (disco o rete), passa a servirne un'altra invece di restare fermo.

- Le funzioni dichiarate `async def` (ad esempio il caricamento delle immagini) vengono eseguite direttamente nel ciclo di eventi.
- Le funzioni normali `def` (ad esempio le query al database) vengono eseguite da FastAPI in un **pool di thread**, così un'operazione bloccante non ferma le altre richieste.
- L'invio dell'email è affidato ai **BackgroundTasks**: viene eseguito dopo che la risposta è già partita verso il browser. L'utente non attende i tempi di rete del servizio di posta (spesso alcuni secondi), e un eventuale errore di invio non annulla la prenotazione, che è già stata salvata.

È un'applicazione concreta della differenza tra la velocità della CPU (operazioni in nanosecondi) e la lentezza dell'I/O (millisecondi o secondi): il sistema è progettato per non sprecare tempo di CPU in attesa dei dispositivi.

#### 8.3. Gerarchia di memoria e memorizzazione persistente
I dati attraversano diversi livelli della gerarchia di memoria:

| Livello | Cosa contiene nel progetto | Caratteristiche |
|---|---|---|
| Memoria RAM del server | Oggetti Python delle richieste in corso, configurazione letta all'avvio | Veloce ma volatile: si perde allo spegnimento |
| Disco del server (Render) | Codice e immagini delle mostre iniziali; in sviluppo il file SQLite | Sul piano gratuito è effimero: si azzera a ogni riavvio |
| Database PostgreSQL (Neon) | Tabelle e immagini caricate | Persistente e indipendente dal server, raggiunto in rete |
| Memoria del browser | `sessionStorage` con il token dell'amministratore | Locale al dispositivo, si svuota alla chiusura della scheda |
| Cache del browser e CDN | File JavaScript, CSS e immagini già scaricati | Evita di trasferire di nuovo dati invariati |

In sviluppo SQLite memorizza l'intero database in un **unico file** su disco; in produzione PostgreSQL è un processo separato che gestisce i dati in pagine su disco con un proprio buffer in RAM e un registro delle modifiche (WAL) per non perdere le transazioni confermate. Ogni prenotazione viene salvata all'interno di una **transazione** (`commit`): o l'operazione viene scritta completamente o, in caso di errore, viene annullata (`rollback`), così il file non resta in uno stato incoerente. Gli **indici** sulle chiavi esterne (`mostra_id`) permettono di trovare le prenotazioni di una mostra senza leggere tutta la tabella.

#### 8.4. Rappresentazione e codifica dei dati
Gli stessi dati cambiano rappresentazione mentre passano da un componente all'altro:

- **Testo**: tutti i messaggi usano la codifica **UTF-8**, che rappresenta anche le lettere accentate e i simboli (es. "è", "★") con sequenze da 1 a 4 byte.
- **JSON**: formato testuale con cui front-end e back-end si scambiano oggetti. Pydantic converte il JSON in oggetti Python tipizzati (es. stringa `"2026-10-10"` → oggetto `date`) e viceversa.
- **Date**: nel database le date sono di tipo `DATE` e gli orari di creazione sono salvati in UTC, il riferimento orario universale; il front-end li converte nel fuso orario dell'utente.
- **Token di accesso**: è composto da due parti codificate in **Base64 URL-safe** e separate da un punto. La prima contiene i dati in JSON (`{"sub": "admin@museo.it", "ruolo": "admin", "exp": 1792083836}`, dove `ruolo` distingue l'amministratore dai visitatori, che hanno anche il proprio identificativo `uid`, dove `exp` è la scadenza espressa in secondi dal 1° gennaio 1970). La seconda è la **firma HMAC-SHA256**: un'impronta di 256 bit calcolata con la chiave segreta del server. Modificando anche un solo bit del contenuto la firma non corrisponde più e il server rifiuta il token. Base64 è una *codifica*, non una cifratura: il contenuto è leggibile, ma non falsificabile.
- **Password**: le password dei visitatori non vengono memorizzate. Si salva una stringa con algoritmo, numero di iterazioni, **sale** (16 byte casuali) e **hash** PBKDF2-HMAC-SHA256, entrambi in Base64. Ripetere l'hash 200.000 volte rende lento indovinare le password per tentativi, e il sale fa sì che due password uguali producano hash diversi.
- **File**: le immagini viaggiano come dati binari in richieste `multipart/form-data`; il server ne controlla tipo ed estensione e assegna un nome casuale (UUID, identificatore di 128 bit).
- **QR code**: è una matrice bidimensionale di moduli bianchi e neri che codifica un testo, qui l'indirizzo della pagina di verifica (`…/admin/verifica?codice=MCD-XXXX-XXXX`). Ai dati vengono aggiunti dei simboli di controllo calcolati con il codice di correzione d'errore **Reed-Solomon**: con il livello "M" usato nel progetto il QR resta leggibile anche se circa il 15% della superficie è rovinata o coperta. Il server lo genera come immagine PNG (formato con compressione senza perdita, adatto alle immagini a due colori).
- **Allegati email**: le email sono testo, quindi un allegato binario come il PNG del QR code viene codificato in **Base64** (ogni 3 byte diventano 4 caratteri, +33% circa di dimensione) sia nel formato MIME usato da SMTP sia nel JSON inviato all'API di Brevo.

#### 8.5. Compressione dei dati
Ridurre i byte da trasferire rende il sito più veloce, soprattutto su rete mobile:
- Le **immagini** sono in formato **WebP**, che usa una compressione più efficiente di JPEG e PNG: l'immagine di sfondo del sito è passata da circa 478 KB in JPEG a circa 123 KB in WebP, con qualità visiva equivalente. Anche le immagini delle mostre e gli screenshot di questa relazione sono in WebP.
- I file **JavaScript** vengono minificati da Vite (spazi e nomi lunghi eliminati) e trasferiti compressi con **gzip**: il pacchetto principale passa da circa 486 KB a circa 159 KB.

#### 8.6. Suddivisione del codice e caricamento su richiesta
Il front-end usa `React.lazy` e `Suspense`: Vite divide l'applicazione in più file (*code splitting*) e il browser scarica il codice di una pagina solo quando l'utente la apre. Chi visita solo il catalogo non scarica mai il codice dell'area riservata (`AdminDashboard`, `AdminForm`). È lo stesso principio della **memoria virtuale** e della paginazione su richiesta: si carica in memoria solo ciò che serve, nel momento in cui serve.

### 9. Scelte tecnologiche e sicurezza
#### 9.1. Scelta di FastAPI e performance
FastAPI è stato preferito a framework tradizionali (come Django o Flask) per la sua estrema velocità, paragonabile a NodeJS e Go, grazie alla gestione asincrona nativa (async/await) e alla validazione automatica dei dati gestita da Pydantic. Il sistema di dipendenze (`Depends`) permette inoltre di riutilizzare in modo pulito la sessione del database (`get_db`) e il controllo di autenticazione (`richiedi_admin`) in tutte le rotte.

#### 9.2. Gestione del CORS (Cross-Origin Resource Sharing)
Poiché il client React gira su un'origine diversa dal server FastAPI (porta 5173 contro 8000 in sviluppo, Vercel contro Render in produzione), è stato configurato un middleware CORS (CORSMiddleware). Le origini autorizzate non sono "aperte a tutti" ma elencate esplicitamente nella variabile d'ambiente CORS_ORIGINS.

#### 9.3. Invio asincrono delle email tramite BackgroundTasks
Le email automatiche sono sei: conferma della prenotazione (con QR code), annullamento, benvenuto, avviso di registrazione doppia, reset della password e conferma dell'eliminazione dell'account; a queste si aggiunge l'inoltro del modulo Contatti al museo. Per evitare che l'invio delle email di conferma blocchi la risposta HTTP, l'applicazione sfrutta i BackgroundTasks di FastAPI. La funzione `invia_email_background`, contenuta in `services/email_service.py`, viene registrata dal router delle prenotazioni con `background_tasks.add_task(...)`: la risposta di successo viene restituita immediatamente al client React e l'email viene inviata subito dopo. Se il servizio email non è configurato, la prenotazione viene comunque salvata e l'evento viene registrato nei log.

L'invio avviene in due modi alternativi.
In locale si può usare il protocollo SMTP (ad esempio con un account Gmail e una "password per le app").
In produzione, invece, il piano gratuito di Render blocca le connessioni in uscita verso le porte SMTP (25, 465, 587): per questo, quando è impostata la variabile `BREVO_API_KEY`, l'email viene inviata tramite l'API del servizio di email transazionale Brevo, che usa una normale richiesta HTTPS (porta 443). Brevo accetta solo un mittente (`EMAIL_MITTENTE`) verificato nel proprio pannello: con un indirizzo mancante o scritto male risponde `400 valid sender email required`.

**QR code nell'email di conferma.** L'email della prenotazione contiene il codice di riferimento e il QR code in due forme:
- come **allegato PNG** (`prenotazione-MCD-XXXX-XXXX.png`), sempre presente: si vede anche se il programma di posta blocca le immagini esterne;
- come **immagine nel testo**, caricata dall'endpoint pubblico `GET /api/prenotazioni/qr/{codice}`. L'indirizzo del backend viene preso dalla variabile `BACKEND_URL` oppure, se non è impostata, dall'indirizzo da cui è arrivata la prenotazione (su Render `https://museo-digitale-pw.onrender.com`). Quando il backend gira in locale (`127.0.0.1` o `localhost`) l'immagine nel testo **non viene inserita**, perché il programma di posta non potrebbe raggiungere il computer di sviluppo e mostrerebbe un'immagine rotta: in quel caso il testo indica che il QR code è in allegato.

Non si usano immagini incorporate come `data:` URI perché Gmail e Outlook le bloccano. Ogni esito dell'invio viene scritto nel log del server (`Email '...' inviata a ... tramite Brevo` oppure `Errore invio email a ...: <motivo>`), così un problema di configurazione si individua subito senza bloccare la prenotazione.

#### 9.4. Sicurezza e variabili sensibili
Le credenziali del servizio email, quelle dell'amministratore e la chiave di firma dei token non sono scritte nel codice: vengono lette da variabili d'ambiente tramite il modulo `settings.py`. In locale i valori si trovano nei file `.env` o `.env.local`, esclusi dal versionamento tramite `.gitignore`; in produzione si impostano dal pannello Environment di Render. Il file `.env.example` documenta le variabili necessarie senza contenere valori reali.

Una variabile assente o lasciata vuota assume un valore di default pensato solo per lo sviluppo locale; all'avvio il server segnala nei log se sono in uso la chiave o la password dimostrative, in modo che vengano sostituite prima della messa online.

#### 9.5. Autenticazione: area riservata e account dei visitatori
Il controllo delle credenziali avviene sul server e non nel browser. L'endpoint POST /api/login confronta le credenziali con quelle configurate (con confronto a tempo costante, per evitare attacchi basati sui tempi di risposta) e restituisce un token che contiene la scadenza ed è firmato con HMAC-SHA256 tramite la SECRET_KEY. Il token non è cifrato ma firmato: il server può leggerne il contenuto e verificare che non sia stato alterato. Il client invia il token nell'header `Authorization: Bearer`; le rotte riservate usano la dipendenza FastAPI `richiedi_admin` (modulo `auth.py`), che rifiuta con 401 Unauthorized le richieste senza un token valido o scaduto.

**Account dei visitatori.** Chiunque può consultare mostre e feedback, ma per prenotare o recensire serve un account. Con `POST /api/utenti/registrazione` il visitatore indica nome, cognome, email, telefono e una password di almeno 6 caratteri con almeno una lettera maiuscola e un numero (regola controllata sia nel form sia dal server); la password viene trasformata in un hash PBKDF2-HMAC-SHA256 con sale casuale e 200.000 iterazioni (funzioni `hash_password` e `verifica_password` in `auth.py`, solo libreria standard di Python) e non viene mai salvata in chiaro. Login e registrazione restituiscono un token firmato con lo stesso meccanismo dell'amministratore, ma con `"ruolo": "utente"` e l'identificativo dell'account. Le rotte di prenotazione e feedback usano la dipendenza `richiedi_utente`, che verifica firma, scadenza e ruolo e carica l'account dal database; `richiedi_admin` accetta invece solo il ruolo `admin`, quindi un visitatore non può entrare nell'area riservata e l'amministratore non può prenotare. In caso di login errato il messaggio è lo stesso sia per email inesistente sia per password sbagliata, così non si rivela quali email sono registrate.

**Registrazione unica, email e logout.** L'email è un campo univoco: un secondo tentativo con lo stesso indirizzo (anche scritto con maiuscole o spazi diversi) restituisce 409 "Utente già registrato" e al titolare dell'account arriva un'email che lo avvisa del tentativo. Una registrazione riuscita genera invece l'email di benvenuto. Le email partono in background (`BackgroundTasks`), dopo la risposta, così l'utente non aspetta il servizio di posta. Il visitatore esce con il pulsante **Esci** nell'intestazione o nell'area personale: la sessione salvata nel browser viene cancellata.

**Modifica ed eliminazione dell'account.** Con `PUT /api/utenti/me` il visitatore aggiorna nome, cognome e telefono: lo schema `ProfiloUpdateRequest` applica le stesse regole della registrazione e ignora eventuali altri campi, quindi email e password non si possono cambiare per questa via. Le prenotazioni già fatte conservano i dati copiati al momento della prenotazione. Con `DELETE /api/utenti/me` il visitatore elimina l'account (diritto alla cancellazione, art. 17 GDPR): serve la password come conferma, perché un token rubato non basti a cancellare l'account; con password errata la risposta è 400 e non 401, così il front-end non chiude la sessione. Dopo l'eliminazione il token non è più valido (l'account non esiste) e l'email torna libera per una nuova registrazione. Il router legge email e nome prima di cancellare l'account e affida ai `BackgroundTasks` l'invio dell'**email di conferma dell'eliminazione** (`invia_email_account_eliminato`), che indica quante prenotazioni sono state annullate e se l'eliminazione è stata chiesta dal visitatore o fatta dal personale. L'amministratore ha le stesse operazioni sugli account degli altri (`GET`, `PUT` e `DELETE /api/utenti/{id}`, protette da `richiedi_admin`); i percorsi usano il convertitore `{utente_id:int}`, così `/api/utenti/me` non viene mai scambiato per un identificativo.

**Separazione tra visitatore e area riservata.** Nel browser la sessione del visitatore e quella dell'amministratore non possono convivere: il login di un visitatore cancella l'eventuale token admin, e finché un visitatore è collegato la pagina /admin mostra solo l'avviso "Sei collegato come visitatore… devi prima uscire" con il pulsante per farlo. Anche lato server i ruoli restano separati (`richiedi_admin` accetta solo token con ruolo `admin`).

**Recupero della password.** Con `POST /api/utenti/password-dimenticata` il server crea un token firmato con ruolo `reset`, scadenza di 30 minuti (`RESET_PASSWORD_MINUTI`) e un'"impronta" dell'hash della password attuale: appena la password cambia l'impronta non corrisponde più, quindi il link funziona una sola volta. Il link punta al sito da cui è partita la richiesta (se è tra i `CORS_ORIGINS`) oppure a `FRONTEND_URL`. Un token di reset non vale come accesso e un token di accesso non vale come reset. Se il servizio email non è configurato (sviluppo locale) il link viene scritto nel log del backend, così la funzione si può provare comunque.

**Codice di prenotazione e QR code.** Il numero progressivo della prenotazione è prevedibile, quindi per la verifica all'ingresso ogni prenotazione riceve anche un codice casuale nel formato `MCD-XXXX-XXXX`, generato con il modulo `secrets` (generatore crittograficamente sicuro). I caratteri sono scelti da un alfabeto di 31 simboli senza quelli che si confondono leggendo o dettando il codice (0/O, 1/I/L): con 8 caratteri le combinazioni sono circa 850 miliardi, quindi un codice non si può indovinare per tentativi. Il QR code, generato con la libreria `segno` (solo Python), non contiene dati personali ma l'indirizzo della pagina di verifica dell'area riservata (`/admin/verifica?codice=...`): inquadrandolo con la fotocamera del telefono il personale apre la pagina e, se non ha ancora fatto il login, dopo l'accesso torna automaticamente alla verifica (parametro `next`). I dati della prenotazione sono visibili solo con il token dell'amministratore. L'immagine del QR code è inserita nel corpo dell'email (servita dal backend) e anche in allegato PNG, così resta disponibile se il programma di posta blocca le immagini esterne. Ogni prenotazione vale per un solo ingresso: la registrazione salva data e ora in `ingresso_il`, un secondo tentativo restituisce 409 e una prenotazione già usata non si può più annullare.

#### 9.6. Gestione sicura del caricamento file
Il caricamento delle immagini è gestito da `services/immagini_service.py`. Le immagini vengono accettate solo se hanno un'estensione e un tipo MIME da immagine (jpg, png, webp, gif) e non superano la dimensione massima configurata. Il nome dell'immagine viene generato dal server (UUID), evitando sia la sovrascrittura di file esistenti sia attacchi di tipo path traversal; il contenuto è salvato nella tabella `immagini` del database (non sul disco del server, che su Render è effimero) e l'endpoint pubblico accetta solo nomi nel formato generato dal server. In modifica il client invia l'elenco delle immagini attuali da mantenere: il server accetta solo percorsi già associati a quella mostra, così dal form non è possibile collegare file arbitrari. Nel database si salvano percorsi relativi: è il frontend ad anteporre l'indirizzo del backend, così l'applicazione funziona sia in locale sia in produzione. I dati inseriti dagli utenti vengono inoltre "escapati" prima di essere inseriti nel corpo HTML dell'email di conferma.

#### 9.7. Limite ai tentativi di accesso
Per impedire attacchi "a forza bruta" (provare molte password in sequenza), gli endpoint di login (amministratore e visitatori) e di registrazione sono protetti dalla libreria `slowapi`: ogni indirizzo IP può effettuare un numero limitato di tentativi (di default 5 al minuto, configurabile con la variabile `LOGIN_RATE_LIMIT`). Superato il limite il server risponde 429 Too Many Requests con un messaggio leggibile, che il frontend mostra nel form di accesso. Poiché in produzione il backend si trova dietro il proxy di Render, uvicorn viene avviato con l'opzione `--proxy-headers`, così da leggere l'indirizzo IP reale del visitatore.

#### 9.8. Feedback dei visitatori
I feedback si leggono senza account, ma per scriverne uno serve il login: così ogni recensione è legata a una persona registrata e si riducono spam e recensioni multiple. Il server accetta solo voti interi da 1 a 5, commenti di lunghezza limitata, feedback su mostre già iniziate e al massimo un feedback per visitatore su ogni mostra (409 al secondo tentativo) e solo da parte di chi si è prenotato a quella mostra (403 altrimenti: il feedback deve venire da un visitatore reale della mostra). Nel feedback pubblico compaiono solo il nome e l'iniziale del cognome (es. "Giulia V."), mai email o telefono, secondo il principio di minimizzazione dei dati personali. L'amministratore può eliminare i contenuti non appropriati dalla dashboard o dalla pagina della mostra.

### 10. Implementazione del front-end
#### 10.1. Architettura dei componenti e Single Page Application (SPA)
Il front-end è stato sviluppato come una Single Page Application (SPA) modulare basata su React e React Router. Il codice è organizzato per responsabilità:

```
frontend/src/
├── App.jsx        → tema, router e rotte
├── config/        → routes.json (elenco delle rotte) e background.json (immagine di sfondo)
├── pages/         → una pagina per rotta: Home (presentazione), Esposizioni (catalogo), GalleriaMostra, FormPrenotazione, Accedi, AreaPersonale (con modifica ed eliminazione dell'account), PasswordDimenticata, ReimpostaPassword, AdminDashboard, AdminForm, AdminUtenti (gestione utenti), AdminVerifica (verifica all'ingresso), NotFound
├── components/    → componenti riutilizzabili: AppHeader (con icona del museo e menu della lingua), AppFooter, IconaMuseo, QrPrenotazione (codice e QR code), ProtectedRoute, ErrorBoundary, SezioneFeedback, IndicatoriDashboard
├── hooks/         → useUtente, useAdmin (chi è collegato) e useLingua (lingua e funzione t())
├── i18n/          → testi.js (testi italiani e inglesi, traduzioni dei messaggi del server) e lingua.js (lingua scelta e traduzione)
├── services/      → api.js (istanza Axios) e un servizio per area: mostre, prenotazioni, feedback, statistiche, auth (admin), utenti (visitatori)
├── styles/        → fogli di stile del layout
├── tipi.js        → forma dei dati delle API descritta con JSDoc (solo documentazione)
└── tests/         → test automatici (Vitest)
```

Le rotte non sono scritte nel codice ma lette da `config/routes.json`: ogni rotta indica il percorso e il nome della pagina da mostrare. Le rotte riservate all'amministratore sono contrassegnate con `"protected": true` e vengono racchiuse nel componente `ProtectedRoute`, che rimanda alla pagina di accesso chi non ha effettuato il login. Un indirizzo inesistente mostra la pagina `NotFound` (errore 404), collegata alla rotta jolly `*`. Le pagine dei visitatori (prenotazione e area personale) sono contrassegnate con `"protected": "utente"`: chi non ha fatto il login viene mandato alla pagina **Accedi** e, dopo l'accesso o la registrazione, torna automaticamente alla pagina che voleva aprire (parametro `?next=`, accettato solo se punta a un indirizzo interno al sito).

Per alleggerire il primo caricamento, le pagine diverse dalla Home vengono caricate solo quando servono (`React.lazy` e `Suspense`): il browser scarica il codice dell'area riservata solo se l'utente la apre.

Per la progettazione dell'interfaccia grafica è stata adottata la libreria Material-UI (MUI), personalizzando i componenti tramite la prop `sx` e un tema grafico coerente con l'identità visiva dell'istituzione culturale (palette cromatica basata su toni scuri e dettagli color oro). Il layout utilizza il componente `Grid` con dimensioni responsive, così da adattarsi anche ai dispositivi mobili.

Le pagine non contengono gli indirizzi delle API: usano le funzioni dei servizi (ad esempio `getMostre()`, `prenota(dati)`, `inviaFeedback(dati)`, `getStatistiche()`), così ogni indirizzo è definito in un solo punto, in modo analogo ai servizi del backend. I servizi si appoggiano a un client Axios centralizzato (`services/api.js`), che:
- determina l'indirizzo del backend (variabile `VITE_API_URL`, oppure backend locale in sviluppo e Render in produzione);
- aggiunge automaticamente il token giusto a ogni richiesta: quello del visitatore per prenotazioni, invio di feedback e area personale, quello dell'amministratore per le altre rotte riservate; se un token è scaduto lo cancella (e, per l'admin, riporta alla pagina di login);
- costruisce l'indirizzo completo delle immagini a partire dai percorsi relativi salvati nel database.

Gli stati locali dei componenti (useState, useEffect) garantiscono feedback visivi immediati all'utente, ad esempio gli indicatori di caricamento tramite CircularProgress.

**Icona.** Accanto al nome del museo, nell'intestazione, compare un'icona che rappresenta l'edificio del museo (componente `IconaMuseo`, un'immagine SVG che prende il colore oro del titolo). La stessa icona è la favicon del sito (`public/favicon.svg`), cioè l'immagine mostrata nella scheda del browser.

**Tipografia.** Il sito usa due caratteri moderni senza grazie: *Outfit* per titoli e pulsanti e *Manrope* per il testo. Sono inclusi nel pacchetto del frontend (librerie `@fontsource-variable`), quindi non dipendono da servizi esterni come Google Fonts e funzionano anche offline; il tema MUI (`theme.js`) li applica a tutti i componenti.

**Due lingue (italiano e inglese).** Tutti i testi delle pagine pubbliche e dell'area visitatori sono raccolti in `i18n/testi.js`, un dizionario con le stesse chiavi per le due lingue (ad esempio `'feedback.titolo'` → "Opinioni dei visitatori" / "Visitor reviews"). I componenti usano l'hook `useLingua()`, che restituisce la funzione `t(chiave, valori)`; i valori variabili si inseriscono con segnaposto come `{nome}`. Il menu a tendina **ITA / EN** nell'intestazione cambia lingua senza ricaricare la pagina: la scelta viene salvata nel `localStorage`, aggiorna l'attributo `lang` della pagina (utile ai lettori di schermo) e un evento del browser avvisa tutti i componenti aperti. I messaggi restituiti dal backend sono in italiano: quando la lingua è l'inglese, `messaggioErrore` li traduce con una tabella di corrispondenze (compresi gli errori di validazione nel formato "campo: messaggio"). Un test verifica che i due dizionari abbiano esattamente le stesse chiavi e gli stessi segnaposto, così nessun testo resta senza traduzione. Restano in italiano i contenuti inseriti dall'amministratore (titoli e descrizioni delle mostre), le email e le pagine dell'area riservata, usate solo dal personale del museo.

**Home e footer.** La home presenta il museo (testo introduttivo, tre punti di forza e immagini delle collezioni) e porta al catalogo con il pulsante "Scopri le esposizioni correnti"; il catalogo è alla rotta `/esposizioni`. Il componente `AppFooter`, presente in tutte le pagine, mostra orari, indirizzo (dato di esempio inventato per il progetto) e spiega che le prenotazioni avvengono solo online dalla pagina della mostra, con i link alle esposizioni e al modulo Contatti. Non sono indicati email o telefono per le prenotazioni.

**Modulo Contatti.** La pagina `Contatti` (voce del menu) mostra il modulo solo ai visitatori collegati: titolo, descrizione (fino a 2000 caratteri, con contatore), nome, cognome, email e telefono, questi ultimi già compilati con i dati dell'account ma modificabili. I campi sono controllati nel form e di nuovo dal server (`ContattoRequest`); il pulsante si attiva solo con dati validi. Chi non è collegato vede l'invito ad accedere (e dopo l'accesso torna al modulo); l'amministratore vede un avviso. Il backend invia l'email subito, non in background, così in caso di problemi l'utente riceve un messaggio di errore (503) invece di una falsa conferma.

#### 10.2. Feedback e dashboard con indicatori
- **SezioneFeedback** (pagina di dettaglio della mostra): mostra il voto medio con le stelle (componente `Rating` di MUI), l'elenco delle recensioni e il form per lasciarne una nuova. Dopo l'invio la recensione compare subito in cima alla lista, senza ricaricare la pagina. Per le mostre non ancora iniziate il form è sostituito da un messaggio informativo; al visitatore collegato ma non prenotato a quella mostra compare l'avviso "Puoi lasciare un feedback solo sulle mostre a cui ti sei prenotato" con il pulsante **Prenota** (il componente lo verifica con `GET /api/utenti/me/prenotazioni`); chi ha già recensito la mostra vede "Hai già lasciato il tuo feedback su questa mostra" al posto del form (verifica con `GET /api/utenti/me/feedback`, e il form sparisce anche subito dopo l'invio). Se la pagina è aperta dall'amministratore collegato (pulsante **Vedi** della dashboard), compaiono la barra con i comandi **Modifica** ed **Elimina** della mostra e un pulsante **Elimina** accanto a ogni feedback, mentre il form per lasciare un feedback e il pulsante **PRENOTA** sono nascosti. I visitatori non vedono mai questi comandi e, in ogni caso, il server accetta l'eliminazione solo con il token dell'amministratore.
- **Accedi e AreaPersonale**: la pagina Accedi ha due schede, *Accedi* e *Registrati*, con validazione in tempo reale (il pulsante si attiva solo con dati validi). La sessione del visitatore è salvata nel browser (`localStorage`), quindi resta attiva anche chiudendo la scheda; l'header mostra "Accedi" e "Area Riservata" oppure "Ciao, <nome>" con il link all'area personale ed "Esci"; con l'amministratore collegato mostra invece "Ciao, Admin" (link alla dashboard) ed "Esci", senza i comandi dei visitatori. L'header si aggiorna da solo a ogni login o logout (hook `useUtente` e `useAdmin`, che ascoltano lo stesso evento del browser). Se l'admin apre /accedi vede l'invito a uscire prima dall'area riservata, e se apre /prenota viene riportato alla dashboard. Nell'area personale il visitatore vede le proprie prenotazioni ed esce. Nel form di prenotazione nome, cognome ed email sono quelli dell'account (sola lettura) e resta modificabile solo il telefono; nella sezione dei feedback chi non è collegato vede l'invito ad accedere al posto del form.
- **IndicatoriDashboard** (area riservata): quattro riquadri con prenotazioni totali (e degli ultimi 7 giorni), mostre in corso (con quelle in arrivo e concluse), numero di feedback e voto medio, seguiti da un grafico a barre orizzontali delle prenotazioni per mostra. Il grafico è realizzato con semplici elementi grafici proporzionati al valore massimo, senza librerie aggiuntive. Sotto ogni mostra l'amministratore può aprire l'elenco delle prenotazioni o dei feedback ed eliminare questi ultimi.

I calcoli degli indicatori sono svolti dal back-end: il front-end riceve numeri già pronti e si limita a mostrarli. In questo modo i dati sono sempre coerenti con il database e la logica è verificabile con i test del server.

#### 10.3. Strategia di validazione end-to-end (client-server)
Per garantire la massima integrità dei dati e prevenire l'invio di informazioni errate o malevole, il sistema adotta una strategia di validazione a doppio livello.

**Validazione lato client (feedback in tempo reale)**

Nel form di prenotazione e gestione, i campi di input sono associati a espressioni regolari (RegEx) e controlli di lunghezza logici in tempo reale:
- Nome e Cognome: richiedono una lunghezza minima di 3 caratteri (.length >= 3) per evitare stringhe vuote o frammentarie.
- Telefono: viene filtrato tramite RegEx (/^\d{6,15}$/) per accettare esclusivamente da 6 a 15 cifre numeriche.
- Date della mostra: la data di fine non può precedere quella di inizio.
- Email: viene verificata attraverso un pattern formale di validazione sintattica.
- Feedback: il voto è obbligatorio, nome e commento hanno una lunghezza massima.

Il pulsante di invio della form (PRENOTA / PUBBLICA MOSTRA) rimane disattivato (disabled) fino a quando tutte le condizioni di validità non risultano pienamente soddisfatte, guidando l'utente verso la corretta compilazione.

**Validazione lato server (Pydantic e FastAPI)**

Indipendentemente dai controlli effettuati nel browser, il payload ricevuto viene intercettato da schemi di validazione Pydantic (BaseModel e @field_validator). L'utilizzo del tipo nativo EmailStr e di validatori custom garantisce che nessun dato anomalo o non conforme possa violare i vincoli del database SQLite. In caso di errore di validazione il server risponde con 422 Unprocessable Entity e un messaggio leggibile: il gestore `errore_validazione` (`services/error_service.py`), registrato in `main.py` con `app.add_exception_handler`, trasforma l'elenco di errori di Pydantic in un testo mostrabile direttamente all'utente. Gli errori di logica applicativa, come date incoerenti o file non validi, restituiscono 400 Bad Request.

#### 10.4. Gestione globale degli errori nel client
Al fine di evitare schermate bloccate o silenziose in caso di problemi di rete o disservizi del server, le chiamate asincrone sono protette dal metodo .catch() di Axios, che intercetta i codici di errore HTTP restituiti dal back-end (401, 404, 422, 429, 500). È stato implementato un sistema di notifica basato sul componente Alert di Material-UI: in caso di errori di connessione o fallimenti nelle operazioni di scrittura, un messaggio descrittivo compare in modo dinamico all'utente, migliorando sensibilmente la resilienza e l'usabilità complessiva dell'applicazione.

Ogni pagina è inoltre racchiusa in un componente `ErrorBoundary`: se durante la visualizzazione si verifica un errore imprevisto (ad esempio dati non coerenti), al posto di una pagina bianca compare un messaggio con il dettaglio dell'errore e il pulsante per tornare alla home.

### 11. Qualità del codice e test automatici
Per mantenere il codice uniforme e individuare gli errori prima della pubblicazione sono stati adottati strumenti di controllo automatico:

| | Back-end | Front-end |
|---|---|---|
| Controllo del codice (linter) | Ruff | ESLint |
| Formattazione | Ruff format | Prettier |
| Test automatici | pytest + TestClient di FastAPI (226 test, eseguiti su SQLite e su PostgreSQL) | Vitest + React Testing Library (163 test) |

**Test del back-end** (cartella `backend/tests/`): verificano le API in modo completo — login corretto ed errato, rifiuto di token assenti, falsi, manomessi o scaduti, limite ai tentativi di accesso, creazione, modifica ed eliminazione delle mostre, controllo degli upload (tipo, dimensione, nomi di file malevoli), modifica delle immagini (mantenute, rimosse, aggiunte), prenotazioni valide e non valide, mostre concluse, invio dell'email di conferma, feedback validi e non validi, moderazione, calcolo degli indicatori della dashboard, registrazione e login dei visitatori, hash delle password, separazione dei ruoli (un visitatore non entra nell'area riservata e l'admin non prenota), un solo feedback per mostra e solo dopo la prenotazione, email di registrazione e avviso di registrazione doppia, recupero della password (link valido, scaduto, già usato, token non valido), codice di prenotazione (formato, unicità, varianti di scrittura accettate), QR code (contenuto e immagine PNG), email con codice e allegato (immagine nel testo solo con un backend pubblico, solo allegato in locale), verifica e registrazione dell'ingresso (solo admin, una sola volta, mostre non iniziate o concluse), aggiornamento di un database della versione precedente con assegnazione dei codici mancanti. I test usano un database temporaneo e sostituiscono l'invio delle email con una funzione simulata, quindi non modificano i dati reali.

**Test del front-end** (cartella `frontend/src/tests/`): montano le pagine in un browser simulato (jsdom) e sostituiscono le risposte del backend con dati finti. Verificano la visualizzazione delle mostre, la validazione dei form, l'invio delle prenotazioni e dei feedback, login e logout dell'area riservata, registrazione e accesso dei visitatori con ritorno alla pagina richiesta, area personale, scelta del token per ogni chiamata, gli indicatori della dashboard, la protezione delle rotte, la pagina 404 e il caricamento delle pagine "lazy".

**Integrazione continua (GitHub Actions)**: il file `.github/workflows/ci.yml` esegue automaticamente, a ogni push e pull request, linter, controllo della formattazione e test di entrambe le parti, oltre alla build di produzione del front-end. Il back-end viene verificato con tre versioni di Python (3.9, 3.12 e 3.15). Se un controllo fallisce, GitHub lo segnala accanto al commit, impedendo che un errore passi inosservato.

**Documentazione generata dal codice.** Tutti i file del progetto sono commentati in italiano e i commenti sono scritti in un formato che permette di trasformarli in pagine di documentazione:
- **back-end**: docstring in stile Google, con le sezioni *Args*, *Returns* e *Raises* (per gli endpoint sono elencati i codici HTTP di errore, e la prima riga indica metodo e percorso, es. `POST /api/prenota`). Il sito è generato con **MkDocs** (tema Material) e **mkdocstrings**, che legge i docstring senza eseguire il codice e crea una pagina per router, servizi, modelli, schemi e autenticazione, con il collegamento al codice sorgente;
- **front-end**: commenti **JSDoc** (`@module`, `@param`, `@returns`, `@example`) su pagine, componenti, hook e servizi; il file `src/tipi.js` descrive con `@typedef` la forma dei dati restituiti dalle API (Mostra, Utente, Prenotazione, Feedback, Statistiche). La documentazione si genera con `npm run docs`;
- **API**: lo schema OpenAPI esportato da FastAPI alimenta la Swagger UI pubblicata nel sito (§7).

Il sito, che contiene anche la guida all'avvio, le funzionalità con gli screenshot, l'architettura con i diagrammi Mermaid e l'elenco degli endpoint, è pubblicato su **GitHub Pages**: [reverserob.github.io/museo-digitale-pw](https://reverserob.github.io/museo-digitale-pw/). Il workflow `.github/workflows/docs.yml` lo rigenera e lo pubblica a ogni push su `main`; la CI delle pull request esegue `mkdocs build --strict`, che fallisce se una pagina o un collegamento non è valido, così la documentazione resta sempre allineata al codice.

### 12. Test funzionali e scenari d'uso
I test automatici verificano il codice; i test funzionali verificano invece che l'applicazione, usata da una persona reale, si comporti come previsto. Gli scenari seguenti sono stati eseguiti sull'applicazione avviata in locale (back-end e front-end), con un database popolato con le mostre iniziali e alcune prenotazioni e feedback di prova.

#### 12.1. Riepilogo degli scenari

| ID | Scenario | Attore | Passi | Risultato atteso | Esito |
|---|---|---|---|---|---|
| TF01 | Consultazione del catalogo | Visitatore | Aprire la home page | Le mostre sono elencate con titolo, periodo e descrizione | ✅ Superato |
| TF02 | Dettaglio di una mostra | Visitatore | Clic su "Scopri di più" | Compaiono galleria, periodo espositivo, pulsante "Prenota" e opinioni dei visitatori | ✅ Superato |
| TF03 | Invio di un feedback | Visitatore | Scegliere 5 stelle, scrivere nome e commento, "Invia feedback" | Messaggio di conferma; la recensione compare in cima alla lista e la media si aggiorna | ✅ Superato |
| TF04 | Prenotazione con dati errati | Visitatore | Inserire nome di 2 lettere, email incompleta, telefono con trattino | Ogni campo errato è evidenziato con il motivo; il pulsante "Prenota" resta disattivato | ✅ Superato |
| TF05 | Prenotazione corretta | Visitatore | Correggere i dati e premere "Prenota" | Messaggio "Prenotazione confermata" con l'indirizzo email del visitatore | ✅ Superato |
| TF06 | Ricezione dell'email | Visitatore | Controllare la casella dopo TF05 | Arriva l'email di riepilogo con titolo e periodo della mostra | ✅ Superato |
| TF07 | Indirizzo inesistente | Visitatore | Aprire `/pagina-inesistente` | Viene mostrata la pagina 404 con il collegamento alla home | ✅ Superato |
| TF08 | Login con password errata | Amministratore | Inserire una password sbagliata | Messaggio "Credenziali errate."; l'area riservata non si apre | ✅ Superato |
| TF09 | Dashboard con indicatori | Amministratore | Accedere con le credenziali corrette | Riquadri con prenotazioni, mostre in corso, feedback e voto medio; barre per mostra | ✅ Superato |
| TF10 | Prenotazioni di una mostra | Amministratore | Clic su "Prenotazioni (n)" | Elenco con nome, email, telefono, data e ora di ogni prenotazione | ✅ Superato |
| TF11 | Moderazione dei feedback | Amministratore | Clic su "Feedback (n)" e poi su "Elimina" | Il feedback viene rimosso dopo la conferma | ✅ Superato |
| TF12 | Pubblicazione di una mostra | Amministratore | "Nuova mostra", compilare il form e aggiungere più immagini, anche in momenti diversi | Le immagini si sommano con anteprima; il pulsante si attiva solo con tutti i campi validi; la mostra compare nel catalogo con tutte le foto | ✅ Superato |
| TF12b | Modifica delle immagini di una mostra | Amministratore | "Modifica", togliere una foto con ✕ e aggiungerne una nuova, "Salva modifiche" | Il form mostra le foto attuali; dopo il salvataggio restano quelle non tolte più quella nuova | ✅ Superato |
| TF12c | Mostra vista dall'amministratore | Amministratore | Dalla dashboard premere "Vedi" su una mostra | Compare la barra "Area admin" con Dashboard, Modifica ed Elimina; accanto a ogni feedback c'è il pulsante Elimina; il form per lasciare un feedback e il pulsante PRENOTA sono nascosti | ✅ Superato |
| TF15 | Prenotazione senza account | Visitatore | Premere "Prenota" senza aver fatto il login | Si apre la pagina Accedi; dopo la registrazione si torna al form di prenotazione | ✅ Superato |
| TF16 | Registrazione | Visitatore | Scheda "Registrati": nome, cognome, email, telefono, password di almeno 8 caratteri | Il pulsante si attiva solo con dati validi; l'account viene creato e il visitatore è subito collegato | ✅ Superato |
| TF17 | Prenotazione da visitatore registrato | Visitatore | Aprire il form di prenotazione da collegato | Nome, cognome ed email dell'account non modificabili, telefono proposto; la prenotazione va a buon fine e l'admin la vede con i dati dell'account | ✅ Superato |
| TF18 | Area personale | Visitatore | "Ciao, <nome>" nell'header | Elenco delle proprie prenotazioni con titolo e periodo della mostra; pulsante "Esci" | ✅ Superato |
| TF19 | Feedback senza account | Visitatore | Aprire una mostra in corso senza login | Le recensioni sono visibili; al posto del form c'è l'invito ad accedere | ✅ Superato |
| TF20 | Login visitatore errato | Visitatore | Password sbagliata nella scheda "Accedi" | Messaggio "Email o password errate."; poi con la password giusta si entra nell'area personale | ✅ Superato |
| TF21 | Registrazione doppia | Visitatore | Registrarsi una seconda volta con la stessa email | Errore "Utente già registrato…"; nessun nuovo account; email di avviso al titolare | ✅ Superato |
| TF22 | Email di registrazione | Visitatore | Registrazione corretta | Area personale con "Registrazione completata! Ti abbiamo inviato un'email di conferma." e email di benvenuto | ✅ Superato |
| TF23 | Logout | Visitatore | Pulsante "Esci" nell'intestazione | Torna alla home, compaiono di nuovo "Accedi" e "Area Riservata" | ✅ Superato |
| TF24 | Area riservata con visitatore collegato | Visitatore | Aprire /admin da collegato | Avviso "devi prima uscire" e nessun form di login admin; dopo "Esci dall'account visitatore" compare il login | ✅ Superato |
| TF25 | Feedback senza prenotazione | Visitatore | Collegato, aprire una mostra in corso non prenotata | Avviso "solo sulle mostre a cui ti sei prenotato" e pulsante Prenota; dopo la prenotazione compare il form | ✅ Superato |
| TF26 | Password dimenticata | Visitatore | "Password dimenticata?" → email → link → nuova password | Password aggiornata; il vecchio accesso non funziona più, il link riusato viene rifiutato | ✅ Superato |
| TF27 | Eliminazione feedback | Visitatore / Amministratore | Aprire la pagina di una mostra con feedback | Il visitatore non vede nessun pulsante Elimina; l'admin elimina dalla pagina della mostra o dalla dashboard | ✅ Superato |
| TF28 | Un solo feedback per mostra | Visitatore | Inviare un feedback e ricaricare la pagina | Il form sparisce e compare "Hai già lasciato il tuo feedback su questa mostra"; il server rifiuta un secondo invio (409) | ✅ Superato |
| TF29 | Admin collegato | Amministratore | Dopo il login aprire home, dettaglio mostra, /accedi e /prenota/1 | Header "Ciao, Admin · Esci", nessun PRENOTA, /accedi mostra l'invito a uscire, /prenota riporta alla dashboard | ✅ Superato |
| TF30 | Prenotazione senza account | Visitatore anonimo | Premere PRENOTA senza login | Si apre la pagina Accedi; dopo la registrazione si torna al form di prenotazione | ✅ Superato |
| TF31 | Una sola prenotazione per mostra | Visitatore | Prenotare una mostra e riaprire /prenota della stessa mostra | Il form non compare ("Ti sei già prenotato…"); nel catalogo c'è "MOSTRA PRENOTATA"; il server risponde 409 | ✅ Superato |
| TF32 | Annullamento della prenotazione | Visitatore | Area personale → "Annulla prenotazione" → conferma | La prenotazione sparisce, compare "Prenotazione annullata. Ti abbiamo inviato un'email di conferma." e parte l'email; poi ci si può riprenotare | ✅ Superato |
| TF33 | Home di presentazione | Visitatore | Aprire l'indirizzo principale e premere "Scopri le esposizioni correnti" | Presentazione del museo; il pulsante porta a /esposizioni | ✅ Superato |
| TF34 | Cambio lingua | Visitatore | Menu ITA/EN → EN, poi ricaricare la pagina | Intestazione, pagine, footer e messaggi del server in inglese; la scelta resta dopo la ricarica | ✅ Superato |
| TF35 | Footer | Visitatore | Scorrere in fondo a una pagina | Orari lunedì–sabato 09:00–18:30, indirizzo, indicazione che si prenota solo dal pulsante PRENOTA della mostra; nessuna email o telefono | ✅ Superato |
| TF36 | Contatti senza account | Visitatore anonimo | Menu → Contatti | Invito ad accedere al posto del modulo; dopo l'accesso si torna su Contatti | ✅ Superato |
| TF37 | Invio di una domanda | Visitatore registrato | Compilare titolo e descrizione (i dati personali sono già inseriti) e premere "Invia richiesta" | Messaggio "Richiesta inviata…"; l'email arriva alla casella del museo con tutti i campi | ✅ Superato |
| TF38 | Voce Home | Visitatore | Da qualsiasi pagina premere "Home" nel menu | Si torna alla home di presentazione | ✅ Superato |
| TF39 | Codice e QR code della prenotazione | Visitatore | Prenotare una mostra | La conferma mostra il codice (es. MCD-68ZY-MT8U) e il QR code; l'email contiene codice, QR code e allegato PNG | ✅ Superato |
| TF40 | QR code nell'area personale | Visitatore | Area personale → "Mostra QR code" | Compaiono codice e QR code da mostrare all'ingresso | ✅ Superato |
| TF41 | Verifica dal QR code | Amministratore | Inquadrare il QR code (indirizzo /admin/verifica?codice=...) senza essere collegato, poi accedere | Dopo il login si torna alla verifica: dati del visitatore, mostra e "Prenotazione valida" | ✅ Superato |
| TF42 | Verifica dal codice | Amministratore | Dashboard → "Verifica ingresso", digitare il codice in minuscolo e senza trattini | Viene trovata la stessa prenotazione; un codice inesistente mostra "Nessuna prenotazione trovata con questo codice." | ✅ Superato |
| TF43 | Registrazione dell'ingresso | Amministratore | Su una prenotazione valida premere "Registra ingresso" | Compare "Ingresso registrato per …"; un secondo ingresso è rifiutato e il visitatore non può più annullare la prenotazione | ✅ Superato |
| TF44 | Modifica del profilo | Visitatore | Area personale → "Modifica dati", cambiare cognome e telefono e salvare | Compare "Dati aggiornati."; i nuovi dati sono visibili subito, l'email resta invariata; con un telefono non valido "Salva" resta disattivato | ✅ Superato |
| TF45 | Eliminazione dell'account | Visitatore | Area personale → "Elimina account", inserire la password e confermare | Si torna alla home scollegati e arriva l'email "Conferma eliminazione account"; le prenotazioni non usate sono annullate e con la stessa email ci si può registrare di nuovo; con la password errata compare "Password errata." e non parte nessuna email | ✅ Superato |
| TF46 | Elenco e ricerca degli utenti | Amministratore | Dashboard → "Gestione utenti", cercare un cognome | Tabella con email, telefono, data di registrazione, numero di prenotazioni e feedback, filtrata dalla ricerca | ✅ Superato |
| TF47 | Modifica ed eliminazione di un utente | Amministratore | In "Gestione utenti" premere "Modifica", correggere e salvare; poi "Elimina" e confermare | Dati aggiornati nella tabella; l'account eliminato sparisce, il visitatore viene scollegato e riceve l'email di conferma | ✅ Superato |
| TF48 | Persistenza dopo il riavvio | Amministratore | Con il back-end su PostgreSQL pubblicare una mostra con un'immagine, fermare e riavviare il back-end, riaprire la mostra | Mostra e immagine sono ancora visibili; lo script `verifica_persistenza.py` conferma anche la prenotazione | ✅ Superato |
| TF13 | Accesso diretto a una pagina riservata | Visitatore | Aprire `/admin/nuova` senza login | Si viene reindirizzati alla pagina di accesso | ✅ Superato |
| TF14 | Troppi tentativi di accesso | Chiunque | Sbagliare la password più di 5 volte in un minuto | Messaggio "Troppi tentativi di accesso. Riprova tra qualche minuto." | ✅ Superato |

#### 12.2. Evidenze (screenshot)

**TF01 – Consultazione del catalogo**
![Catalogo delle mostre](docs/screenshots/01-catalogo.webp)

**TF02 – Dettaglio di una mostra**
![Dettaglio della mostra](docs/screenshots/02-dettaglio-mostra.webp)

**TF03 – Invio di un feedback**: la nuova recensione compare in cima alla lista e la media passa a 4.6.
![Feedback inviato](docs/screenshots/03-feedback-inviato.webp)

**TF04 – Prenotazione con dati errati**: i campi non validi sono evidenziati in rosso e il pulsante è disattivato.
![Validazione del form di prenotazione](docs/screenshots/04-prenotazione-errori.webp)

**TF05 – Prenotazione corretta**
![Prenotazione confermata](docs/screenshots/05-prenotazione-confermata.webp)

**TF06 – Email di conferma ricevuta**
![Email di conferma](backend/static/img.png)

**TF07 – Pagina 404**
![Pagina non trovata](docs/screenshots/06-pagina-404.webp)

**TF08 – Login con password errata**
![Login errato](docs/screenshots/07-login-errato.webp)

**TF09 – Dashboard con indicatori**
![Dashboard con indicatori](docs/screenshots/08-dashboard-indicatori.webp)

**TF10 – Prenotazioni di una mostra**
![Elenco delle prenotazioni](docs/screenshots/09-dashboard-prenotazioni.webp)

**TF11 – Moderazione dei feedback**
![Elenco dei feedback con pulsante Elimina](docs/screenshots/10-dashboard-feedback.webp)

**TF12 – Pubblicazione di una mostra**: le immagini si possono scegliere in più volte; ogni foto ha l'anteprima e il pulsante ✕ per toglierla. Il pulsante "Pubblica mostra" si attiva solo con tutti i campi validi.
![Form nuova mostra](docs/screenshots/11-nuova-mostra.webp)

**TF12b – Modifica delle immagini di una mostra**: il form mostra le foto già salvate; si possono togliere singolarmente e aggiungerne di nuove.
![Modifica delle immagini](docs/screenshots/12-modifica-mostra.webp)

**TF12c – Mostra vista dall'amministratore**: dalla dashboard, con il pulsante "Vedi", l'amministratore apre la pagina pubblica della mostra con in più la barra di gestione.
![Pagina della mostra vista dall'admin](docs/screenshots/13-mostra-admin.webp)

Nella sezione delle opinioni l'amministratore legge ed elimina i feedback, ma non può lasciarne di nuovi.
![Feedback visti dall'admin](docs/screenshots/14-mostra-admin-feedback.webp)

**TF16 – Registrazione di un visitatore**
![Registrazione](docs/screenshots/15-registrazione.webp)

**TF17 – Prenotazione da visitatore registrato**: nome, cognome ed email arrivano dall'account; l'header mostra "Ciao, Giulia".
![Prenotazione con account](docs/screenshots/16-prenotazione-utente.webp)

**TF18 – Area personale con le proprie prenotazioni**
![Area personale](docs/screenshots/17-area-personale.webp)

**TF19 – Feedback senza account**: le recensioni restano visibili, ma per scriverne una bisogna accedere. Il feedback "Giulia V." è stato lasciato da un visitatore registrato.
![Feedback senza login](docs/screenshots/18-feedback-senza-login.webp)

**TF21 – Registrazione doppia**: con un'email già registrata compare l'errore e al titolare arriva un'email di avviso.
![Utente già registrato](docs/screenshots/19-registrazione-doppia.webp)

**TF24 – Area riservata con un visitatore collegato**: prima di accedere come amministratore bisogna uscire dall'account visitatore.
![Area riservata bloccata](docs/screenshots/20-admin-bloccata.webp)

**TF25 – Feedback senza prenotazione**: il visitatore collegato ma non prenotato vede l'invito a prenotare al posto del form.
![Feedback solo dopo la prenotazione](docs/screenshots/21-feedback-senza-prenotazione.webp)

**TF22 – Registrazione completata**: l'area personale conferma l'invio dell'email; nell'intestazione compare il pulsante "Esci" (TF23).
![Registrazione completata](docs/screenshots/22-registrazione-email.webp)

**TF26 – Nuova password**: dal link ricevuto per email si sceglie la nuova password, con la stessa regola della registrazione.
![Reimposta password](docs/screenshots/23-reimposta-password.webp)

**TF28 – Un solo feedback per mostra**: chi ha già recensito la mostra non vede più il form.
![Feedback già lasciato](docs/screenshots/24-feedback-gia-lasciato.webp)

**TF29 – Home con l'amministratore collegato**: in alto "Ciao, Admin" ed "Esci", nessun pulsante PRENOTA sulle mostre.
![Home vista dall'admin](docs/screenshots/25-home-admin.webp)

**TF33 – Home di presentazione del museo**
![Home](docs/screenshots/26-home.webp)

**TF31 – Catalogo con una mostra già prenotata**
![Già prenotato](docs/screenshots/27-esposizioni-gia-prenotato.webp)

**TF32 – Annullamento dall'area personale**: a sinistra il pulsante, a destra la conferma dopo l'annullamento.
![Annulla prenotazione](docs/screenshots/28-area-personale-annulla.webp)
![Prenotazione annullata](docs/screenshots/29-prenotazione-annullata.webp)

**TF34 – Sito in inglese**: home e dettaglio della mostra dopo aver scelto EN dal menu.
![Home in inglese](docs/screenshots/30-home-en.webp)
![Mostra in inglese](docs/screenshots/31-mostra-en.webp)

**TF35 – Footer con orari, indirizzo e modalità di prenotazione**
![Footer](docs/screenshots/32-footer.webp)

**TF37 – Modulo Contatti** (visitatore collegato, dati personali già compilati)
![Contatti](docs/screenshots/33-contatti.webp)

**TF36 – Contatti senza account**
![Contatti senza login](docs/screenshots/34-contatti-senza-login.webp)

**TF39 – Conferma della prenotazione con codice e QR code**
![Prenotazione con QR code](docs/screenshots/35-prenotazione-qr.webp)

**TF39 – Email di conferma con codice e QR code**
![Email con QR code](docs/screenshots/39-email-qr.webp)

**TF40 – QR code nell'area personale**
![Area personale con QR code](docs/screenshots/36-area-personale-qr.webp)

**TF41 – Verifica della prenotazione aperta dal QR code**
![Verifica della prenotazione](docs/screenshots/37-verifica-prenotazione.webp)

**TF43 – Ingresso registrato**
![Ingresso registrato](docs/screenshots/38-ingresso-registrato.webp)

**TF44 – Modifica dei dati dall'area personale**
![Modifica del profilo](docs/screenshots/40-profilo-modifica.webp)

**TF46 – Gestione utenti dell'area riservata**
![Gestione utenti](docs/screenshots/41-gestione-utenti.webp)

**TF48 – Mostra con immagine ancora visibile dopo il riavvio del back-end (PostgreSQL)**
![Persistenza su PostgreSQL](docs/screenshots/42-persistenza-postgres.webp)

### 13. Istruzioni per l'esecuzione
#### 13.1. Prerequisiti
- Python 3.9 o successivo (il progetto è verificato fino alla 3.15)
- Node.js 20 o successivo (con npm)
- Git

#### 13.2. Avvio del back-end
```bash
git clone https://github.com/reverserob/museo-digitale-pw.git
cd museo-digitale-pw/backend
python -m venv venv
source venv/bin/activate          # su Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # poi compilare i valori necessari
uvicorn main:app --reload
```
Il back-end è disponibile su `http://127.0.0.1:8000` e la documentazione delle API su `http://127.0.0.1:8000/docs`. Al primo avvio viene creato il file `museo.db` con le mostre iniziali.

#### 13.3. Avvio del front-end
In un secondo terminale:
```bash
cd museo-digitale-pw/frontend
npm install
npm run dev
```
L'applicazione è disponibile su `http://localhost:5173`. In locale, se `ADMIN_EMAIL` e `ADMIN_PASSWORD` non sono impostate, l'area riservata usa le credenziali dimostrative `admin@museo.it` / `admin2026`. Per provare prenotazioni e feedback basta creare un account visitatore dalla pagina **Accedi → Registrati**.

#### 13.4. Variabili d'ambiente principali

| Variabile | Descrizione |
|---|---|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenziali dell'area riservata |
| `SECRET_KEY` | Chiave per firmare i token di accesso (valore casuale lungo) |
| `SMTP_USER` / `SMTP_PASSWORD` | Account e "password per le app" per l'invio delle email via SMTP |
| `BREVO_API_KEY` | Facoltativa: chiave API di Brevo; se presente le email partono via API HTTPS |
| `CONTATTI_EMAIL` | Casella che riceve le richieste del modulo Contatti |
| `EMAIL_MITTENTE` / `EMAIL_MITTENTE_NOME` | Mittente delle email inviate con Brevo (indirizzo verificato su Brevo) |
| `CORS_ORIGINS` | Domini del front-end autorizzati, separati da virgola |
| `FRONTEND_URL` | Facoltativa: indirizzo del sito usato nel link di reset (se la richiesta non arriva da un dominio di `CORS_ORIGINS`) e nel QR code delle prenotazioni (default il sito su Vercel) |
| `BACKEND_URL` | Facoltativa: indirizzo pubblico del backend per l'immagine del QR code nel testo delle email; se vuota si usa l'indirizzo da cui arriva la richiesta |
| `RESET_PASSWORD_MINUTI` | Facoltativa: durata del link per reimpostare la password (default 30) |
| `DATABASE_URL` | Database: in produzione la connection string PostgreSQL (es. Neon); se manca si usa SQLite `sqlite:///./museo.db` |
| `LOGIN_RATE_LIMIT` | Facoltativa, tentativi di login consentiti per IP (default `5/minute`) |
| `VITE_API_URL` | (front-end) indirizzo del back-end, se diverso da quello predefinito |

#### 13.5. Esecuzione dei test e dei controlli
```bash
# back-end
cd backend
pip install -r requirements-dev.txt
pytest                # test automatici (su SQLite)
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/museo_test pytest   # stessi test su PostgreSQL
DATABASE_URL=postgresql://... python verifica_persistenza.py             # prova di persistenza con riavvio
ruff check .          # linter
ruff format --check . # formattazione

# front-end
cd frontend
npm test              # test automatici
npm run lint          # ESLint
npm run build         # build di produzione
```

#### 13.6. Generazione della documentazione
```bash
cd frontend && npm run docs                                    # JSDoc → docs/frontend-api/
cd ../backend && python esporta_openapi.py ../docs/swagger/openapi.json   # schema per la Swagger UI
cd .. && pip install -r backend/requirements-docs.txt
mkdocs serve -a 127.0.0.1:8001                                 # anteprima su http://127.0.0.1:8001
mkdocs build --strict                                          # sito statico nella cartella site/
```

#### 13.7. Risoluzione dei problemi con le email
Il codice non blocca mai registrazioni e prenotazioni se un'email non parte: il motivo compare nel log del server (terminale di `uvicorn` in locale, scheda **Logs** su Render). I casi incontrati durante lo sviluppo:

| Messaggio nel log o sintomo | Causa | Soluzione |
|---|---|---|
| `Email non configurata` | Né `BREVO_API_KEY` né `SMTP_USER`/`SMTP_PASSWORD` sono impostate | Inserirle nel file `backend/.env` (in locale) o in **Environment** (su Render) e riavviare |
| Il file `.env` esiste ma le variabili risultano vuote | Il venv non è attivo oppure manca la libreria `python-dotenv` | `source venv/bin/activate` e `pip install -r requirements-dev.txt` |
| `Connection unexpectedly closed` | Invio via SMTP rifiutato al login (password per le app scaduta, oppure casella Outlook/Hotmail che non accetta più l'accesso con password) | Usare Brevo anche in locale (`BREVO_API_KEY` nel `.env`) oppure creare una nuova password per le app di Google |
| `CERTIFICATE_VERIFY_FAILED` | Python scaricato da python.org su macOS senza i certificati per HTTPS | Eseguire una volta `/Applications/Python 3.x/Install Certificates.command` |
| `Brevo ha risposto 400 ... valid sender email required` | `EMAIL_MITTENTE` vuoto o scritto male (es. `@gmailcom`) | Correggere l'indirizzo e verificarlo su Brevo in *Mittenti, dominio, IP* |
| `Brevo ha risposto 401 ... unrecognised IP` | Brevo blocca gli IP non autorizzati | Brevo → *Impostazioni → Sicurezza → IP autorizzati* → disattivare il blocco |
| `Brevo ha risposto 401 ... Key not found` | Chiave API cancellata o copiata male | Generare una nuova chiave e aggiornarla nel `.env` e su Render |
| Log `inviata ... tramite Brevo` ma l'email non arriva | Indirizzo del destinatario scritto male in registrazione, oppure email finita nella posta indesiderata | Controllare l'indirizzo nel log e la cartella Spam; il registro di Brevo (*Transazionale → Log*) mostra le email respinte |
| QR code rotto nel testo dell'email | Immagine con un indirizzo non raggiungibile | Risolto: in locale il QR è solo in allegato; online si può forzare l'indirizzo con `BACKEND_URL` |

### 14. Deploy
L'applicazione è pubblicata con due servizi separati, coerentemente con l'architettura disaccoppiata:
- **Front-end** su Vercel: [museo-digitale-pw-azure.vercel.app](https://museo-digitale-pw-azure.vercel.app/)
- **Back-end** su Render: `museo-digitale-pw.onrender.com`
- **Documentazione** su GitHub Pages: [reverserob.github.io/museo-digitale-pw](https://reverserob.github.io/museo-digitale-pw/)

- **Database** PostgreSQL su Neon (§5.3)

Su Render le variabili d'ambiente (DATABASE_URL, SECRET_KEY, credenziali dell'amministratore, BREVO_API_KEY, EMAIL_MITTENTE ed EMAIL_MITTENTE_NOME, CONTATTI_EMAIL, CORS_ORIGINS, FRONTEND_URL, facoltativamente BACKEND_URL, PYTHON_VERSION) sono impostate dal pannello Environment del servizio. Il backend viene avviato con il comando `uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips '*'`, che permette al server di conoscere l'indirizzo IP reale dei visitatori (necessario per il limite ai tentativi di login). In `requirements.txt` le librerie Python sono indicate con intervalli di versioni compatibili (ad esempio `pydantic>=2.11,<3`) invece che con versioni esatte: pip sceglie la versione più recente adatta al Python installato, così il progetto funziona dalla 3.9 fino alle versioni più recenti (verificato nella CI con 3.9, 3.12 e 3.15). Il limite superiore esclude le future versioni principali, che potrebbero introdurre modifiche incompatibili.

### 15. Limiti e sviluppi futuri
#### 15.1. Limiti della soluzione attuale
La piattaforma è un prototipo funzionante; alcune semplificazioni sono accettabili in questa fase ma andrebbero superate in un uso reale:
- **Piani gratuiti**: i dati sono persistenti su PostgreSQL (Neon), ma il piano gratuito ha 1 GB di spazio, 100 ore di calcolo al mese, nessun backup garantito e una piccola attesa dopo la sospensione per inattività (§5.3); le immagini nel database vanno bene per un prototipo, con molte immagini servirebbe un object storage.
- **Un solo amministratore**: le credenziali sono configurate tramite variabili d'ambiente; non esistono più account né ruoli diversi (es. curatore e biglietteria).
- **Nessuna gestione dei posti**: la prenotazione non prevede fasce orarie né un numero massimo di visitatori per giorno.
- **Feedback legati alla prenotazione, non all'ingresso**: per recensire bisogna essersi prenotati alla mostra. L'ingresso viene ora registrato dal personale con il codice o il QR code, ma il feedback non richiede ancora un ingresso registrato (sarebbe un controllo in più su `ingresso_il`); la moderazione è manuale.
- **Verifica all'ingresso solo con l'account amministratore**: il personale che controlla i QR code usa le stesse credenziali dell'amministratore; servirebbe un ruolo dedicato (es. "biglietteria") che possa solo verificare e registrare gli ingressi.
- **Traduzione parziale**: l'interfaccia pubblica e l'area visitatori sono in italiano e in inglese, ma titoli e descrizioni delle mostre, email e area riservata restano in italiano. Per tradurre anche le mostre servirebbero campi in più nel database (es. `titolo_en`, `descrizione_en`).
- **Account semplici**: l'email del visitatore non viene verificata con un link di conferma (riceve solo un'email di benvenuto) e non si può cambiare dal profilo, perché identifica l'account; anche il cambio della password da collegato passa dal link di reimpostazione.
- **Avvio lento del back-end**: sul piano gratuito il servizio va in pausa dopo un periodo di inattività e la prima richiesta può richiedere alcune decine di secondi.

#### 15.2. Sviluppi futuri
**Analytics e cruscotto decisionale**
La dashboard attuale mostra indicatori di sintesi. Il passo successivo è l'analisi nel tempo: grafici dell'andamento delle prenotazioni per settimana, tasso di presenza reale rispetto alle prenotazioni (i dati ci sono già: l'ingresso viene registrato con il QR code dell'email e salvato in `ingresso_il`), fasce orarie più richieste, provenienza dei visitatori. Questi dati aiuterebbero la direzione a pianificare il personale e a scegliere le mostre future.

**Intelligenza artificiale**
- *Raccomandazioni*: suggerire al visitatore mostre affini a quelle già prenotate o recensite.
- *Analisi del sentiment*: classificare automaticamente i commenti dei feedback (positivi, negativi, neutri) e segnalare all'amministratore quelli da moderare.
- *Assistente virtuale*: un chatbot che risponde alle domande frequenti (orari, accessibilità, biglietti), riducendo ulteriormente telefonate ed email al personale.
- *Accessibilità*: descrizioni testuali delle opere generate automaticamente e poi riviste dal curatore, utili alle persone non vedenti.

**Servizi cloud**
- Passare a un piano PostgreSQL con backup automatici e ripristino a un istante (point-in-time recovery).
- Spostare le immagini su uno storage di oggetti (es. Amazon S3 o Cloudinary) servito tramite CDN.
- Spostare le immagini su un object storage (es. Amazon S3 con CDN) e avviare più istanze del back-end, possibile perché il server è senza stato e i dati sono nel database.

**Pagamenti online**
Integrare un servizio di pagamento (es. Stripe o PayPal, oppure pagoPA per un ente pubblico) per acquistare il biglietto al momento della prenotazione, con emissione della ricevuta e biglietto con QR code. Richiederebbe una nuova tabella `pagamenti` collegata alle prenotazioni e la gestione delle notifiche di esito inviate dal fornitore.

**Cybersecurity**
- Verifica dell'email in fase di registrazione tramite link di conferma.
- Account anche per il personale del museo, nella stessa tabella `utenti`, con ruoli distinti (amministratore, curatore, biglietteria) al posto dell'unico amministratore configurato nelle variabili d'ambiente.
- Autenticazione a due fattori (2FA) per l'area riservata.
- Protezione dei form pubblici dallo spam con CAPTCHA e limiti di frequenza anche su prenotazioni e feedback.
- Conformità al GDPR: informativa privacy e consenso al trattamento nel form, cancellazione automatica delle prenotazioni dopo un periodo definito (l'eliminazione dell'account su richiesta del visitatore è già disponibile).
- Registro delle operazioni amministrative (audit log) e monitoraggio degli errori in produzione.

### 16. Dichiarazione sull'uso di strumenti di intelligenza artificiale
Nello sviluppo del progetto è stato utilizzato l'assistente di intelligenza artificiale Claude (Anthropic) come strumento di supporto, in particolare per:
- la revisione del codice e l'individuazione di errori e problemi di sicurezza;
- il supporto alla riorganizzazione del back-end (router e servizi) e del front-end (pagine, componenti e servizi);
- la scrittura di parte dei test automatici e della configurazione dell'integrazione continua;
- l'implementazione delle funzionalità di feedback e della dashboard con indicatori;
- l'implementazione del codice di prenotazione con QR code e della verifica all'ingresso;
- la diagnosi dei problemi di configurazione dell'invio delle email;
- la stesura di parti della documentazione e dei diagrammi.

L'analisi del contesto, le scelte progettuali, la verifica del funzionamento dell'applicazione e la revisione finale del codice e della relazione sono state curate dall'autrice.
