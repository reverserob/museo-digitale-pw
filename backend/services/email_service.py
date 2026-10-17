"""Invio delle email del museo (conferme, annullamenti, registrazione, reset password, contatti).

Le email partono con l'API HTTPS di Brevo se è impostata BREVO_API_KEY, altrimenti con SMTP.
Se nessuno dei due è configurato (es. in locale) l'invio viene saltato e annotato nel log.
"""

import base64
import html
import json
import logging
import smtplib
import urllib.error
import urllib.request
from datetime import date
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import settings

logger = logging.getLogger("uvicorn.error")

# indirizzo dell'API di Brevo per l'invio di email transazionali
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _layout(contenuto: str) -> str:
    # cornice grafica comune a tutte le email del museo
    return f"""
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #0f0f0f; border: 1px solid #c5a059;">
            <h2 style="color: #c5a059;">Museo Civico Digitale</h2>
            {contenuto}
            <p style="color: #aaa;">A presto,<br><b>La Direzione del Museo</b></p>
        </div>
    """


# --- Modelli HTML delle email ---


def crea_html_conferma(
    nome: str,
    titolo_mostra: str,
    data_inizio: date,
    data_fine: date,
    codice: Optional[str] = None,
    url_qr: Optional[str] = None,
) -> str:
    """Email di conferma della prenotazione, con codice di riferimento e QR code da mostrare all'ingresso.

    Args:
        nome: Nome del visitatore.
        titolo_mostra: Titolo della mostra prenotata.
        data_inizio: Data di apertura della mostra.
        data_fine: Data di chiusura della mostra.
        codice: Codice della prenotazione (es. `MCD-7K3F-9QXA`).
        url_qr: Indirizzo pubblico dell'immagine del QR code; se manca il QR è solo in allegato.

    Returns:
        Il corpo HTML dell'email.
    """
    # i dati inseriti dall'utente vengono "escapati" prima di finire nell'HTML
    nome_html = html.escape(nome)
    titolo_html = html.escape(titolo_mostra)
    blocco_codice = ""
    if codice:
        immagine = (
            f'<img src="{html.escape(url_qr, quote=True)}" width="200" height="200" alt="QR code della prenotazione" '
            f'style="display: block; margin: 15px auto; background: #fff; padding: 8px;">'
            if url_qr
            else ""
        )
        blocco_codice = f"""
            <div style="background: #1a1a1a; padding: 20px; border: 1px solid #c5a059; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #aaa; font-size: 13px; letter-spacing: 2px;">CODICE PRENOTAZIONE</p>
                <p style="margin: 8px 0 0 0; color: #c5a059; font-size: 26px; font-weight: bold; letter-spacing: 3px;">{html.escape(codice)}</p>
                {immagine}
                <p style="margin: 10px 0 0 0; color: #ccc; font-size: 13px;">Mostra all'ingresso il QR code (lo trovi anche in allegato)
                oppure comunica il codice: il personale verificherà la tua prenotazione.</p>
            </div>"""
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{nome_html}</b>,</p>
            <p style="color: #ddd;">La tua prenotazione è andata a buon fine! Ti aspettiamo per l'esposizione:</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{titolo_html}</h3>
                <p style="margin: 0; color: #ccc;"><b>Periodo:</b> Dal {data_inizio} al {data_fine}</p>
            </div>{blocco_codice}
    """)


def crea_html_annullamento(nome: str, titolo_mostra: str, data_inizio: date, data_fine: date) -> str:
    # html.escape impedisce che un nome o un titolo contenente tag HTML alteri l'email
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{html.escape(nome)}</b>,</p>
            <p style="color: #ddd;">ti confermiamo che la tua prenotazione è stata <b>annullata</b>:</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{html.escape(titolo_mostra)}</h3>
                <p style="margin: 0; color: #ccc;"><b>Periodo:</b> Dal {data_inizio} al {data_fine}</p>
            </div>
            <p style="color: #ddd;">Se cambi idea puoi prenotare di nuovo dal sito finché la mostra è aperta.</p>
    """)


def crea_html_registrazione(nome: str) -> str:
    # email di benvenuto dopo una registrazione riuscita
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{html.escape(nome)}</b>,</p>
            <p style="color: #ddd;">la registrazione al Museo Civico Digitale è avvenuta con successo.</p>
            <p style="color: #ddd;">Con il tuo account puoi prenotare le visite alle mostre e, dopo esserti
            prenotato, lasciare un feedback sulla mostra.</p>
    """)


def crea_html_gia_registrato(nome: str) -> str:
    # avviso al titolare dell'account quando qualcuno prova a registrarsi di nuovo con la sua email
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{html.escape(nome)}</b>,</p>
            <p style="color: #ddd;">qualcuno ha appena provato a creare un nuovo account con il tuo indirizzo email,
            ma risulti già registrato: la registrazione non è stata completata.</p>
            <p style="color: #ddd;">Se eri tu, accedi con la tua password oppure usa "Password dimenticata?"
            nella pagina di accesso. Se non eri tu, puoi ignorare questa email.</p>
    """)


def crea_html_reset_password(nome: str, link: str, minuti: int) -> str:
    # quote=True escapa anche le virgolette, perché il link finisce dentro l'attributo href
    link_html = html.escape(link, quote=True)
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{html.escape(nome)}</b>,</p>
            <p style="color: #ddd;">abbiamo ricevuto una richiesta di reimpostazione della password del tuo account.</p>
            <p style="margin: 25px 0;">
                <a href="{link_html}" style="background: #c5a059; color: #000; padding: 12px 20px; text-decoration: none; font-weight: bold;">Reimposta la password</a>
            </p>
            <p style="color: #aaa;">Il link è valido per {minuti} minuti e può essere usato una sola volta.
            Se non hai fatto tu la richiesta, ignora questa email: la password resta invariata.</p>
    """)


# --- Canali di invio ---


# allegato di un'email: (nome del file, contenuto)
Allegato = tuple[str, bytes]


def invia_con_brevo(
    destinatario: str,
    nome: str,
    oggetto: str,
    html_content: str,
    rispondi_a: Optional[str] = None,
    allegati: Optional[list[Allegato]] = None,
) -> None:
    # API di Brevo: una richiesta HTTPS (porta 443), quindi funziona anche dove SMTP è bloccato
    dati = {
        "sender": {"name": settings.EMAIL_MITTENTE_NOME, "email": settings.EMAIL_MITTENTE},
        "to": [{"email": destinatario, "name": nome}],
        "subject": oggetto,
        "htmlContent": html_content,
    }
    if rispondi_a:
        # "Rispondi" nel programma di posta scrive direttamente a chi ha inviato la richiesta
        dati["replyTo"] = {"email": rispondi_a}
    if allegati:
        # Brevo vuole il contenuto dei file codificato in Base64
        dati["attachment"] = [
            {"name": nome_file, "content": base64.b64encode(contenuto).decode("ascii")}
            for nome_file, contenuto in allegati
        ]
    richiesta = urllib.request.Request(
        BREVO_URL,
        data=json.dumps(dati).encode("utf-8"),
        method="POST",
        headers={
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
            "accept": "application/json",
        },
    )
    # timeout di 10 secondi: se Brevo non risponde l'invio fallisce invece di restare bloccato
    try:
        with urllib.request.urlopen(richiesta, timeout=10) as risposta:
            risposta.read()
    except urllib.error.HTTPError as e:
        # Brevo spiega nel corpo della risposta cosa non va (es. mittente non verificato, chiave errata)
        dettaglio = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Brevo ha risposto {e.code}: {dettaglio}") from e


def invia_con_smtp(
    destinatario: str,
    oggetto: str,
    html_content: str,
    rispondi_a: Optional[str] = None,
    allegati: Optional[list[Allegato]] = None,
) -> None:
    # alternativa a Brevo: invio tramite un server SMTP (es. Gmail con password per le app)
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = destinatario
    msg["Subject"] = oggetto
    if rispondi_a:
        msg["Reply-To"] = rispondi_a
    msg.attach(MIMEText(html_content, "html"))
    for nome_file, contenuto in allegati or []:
        # gli allegati delle email del museo sono immagini PNG (QR code)
        parte = MIMEImage(contenuto, _subtype="png")
        parte.add_header("Content-Disposition", "attachment", filename=nome_file)
        msg.attach(parte)

    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
        server.starttls()  # cifra la connessione prima di inviare le credenziali
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, destinatario, msg.as_string())


def email_configurata() -> bool:
    """Indica se è configurato almeno un canale di invio.

    Returns:
        True se è impostata `BREVO_API_KEY` oppure `SMTP_USER` e `SMTP_PASSWORD`.
    """
    return bool(settings.BREVO_API_KEY) or bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def _invia(
    destinatario: str,
    nome: str,
    oggetto: str,
    html_content: str,
    rispondi_a: Optional[str] = None,
    allegati: Optional[list[Allegato]] = None,
) -> bool:
    """Invia un'email con Brevo (se configurato) o con SMTP.

    Non solleva eccezioni: un errore di invio viene solo registrato nel log.

    Args:
        destinatario: Indirizzo del destinatario.
        nome: Nome del destinatario.
        oggetto: Oggetto dell'email.
        html_content: Corpo HTML.
        rispondi_a: Indirizzo per "Rispondi" (facoltativo).
        allegati: File da allegare, come coppie (nome, contenuto).

    Returns:
        True se l'email è partita.
    """
    usa_brevo = bool(settings.BREVO_API_KEY)
    if not email_configurata():
        logger.warning(f"Email non configurata (né BREVO_API_KEY né SMTP): '{oggetto}' per {destinatario} non inviata.")
        return False
    try:
        if usa_brevo:
            invia_con_brevo(destinatario, nome, oggetto, html_content, rispondi_a, allegati)
        else:
            invia_con_smtp(destinatario, oggetto, html_content, rispondi_a, allegati)
        logger.info(f"Email '{oggetto}' inviata a {destinatario} tramite {'Brevo' if usa_brevo else 'SMTP'}")
        return True
    # un errore di invio non deve mai far fallire l'operazione principale (prenotazione, registrazione...)
    except Exception as e:
        logger.error(f"Errore invio email a {destinatario}: {e}")
        return False


def crea_html_contatto(dati: dict) -> str:
    # tutti i campi arrivano dall'utente: vengono "escapati" prima di finire nell'HTML
    e = {k: html.escape(str(v)) for k, v in dati.items()}
    descrizione = e["descrizione"].replace("\n", "<br>")
    return _layout(f"""
            <p style="color: #fff;">Nuova richiesta dal modulo <b>Contatti</b> del sito.</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{e["titolo"]}</h3>
                <p style="margin: 0; color: #ddd;">{descrizione}</p>
            </div>
            <p style="color: #ccc; margin: 0;"><b>Nome:</b> {e["nome"]} {e["cognome"]}</p>
            <p style="color: #ccc; margin: 0;"><b>Email:</b> {e["email"]}</p>
            <p style="color: #ccc; margin: 0 0 15px 0;"><b>Telefono:</b> {e["telefono"]}</p>
            <p style="color: #aaa;">Per rispondere usa "Rispondi": il messaggio arriverà direttamente al visitatore.</p>
    """)


# --- Funzioni chiamate dai router ---


# Email del modulo Contatti, inviata alla casella del museo con "Rispondi a" = email del visitatore
def invia_email_contatto(dati: dict) -> bool:
    oggetto = f"[Contatti] {dati['titolo']}"
    return _invia(settings.CONTATTI_EMAIL, "Museo Civico Digitale", oggetto, crea_html_contatto(dati), dati["email"])


# Email di conferma della prenotazione (eseguita in background dopo la risposta)
def invia_email_background(
    destinatario: str,
    nome: str,
    titolo_mostra: str,
    data_inizio: date,
    data_fine: date,
    codice: Optional[str] = None,
    url_backend: Optional[str] = None,
):
    """Invia la conferma della prenotazione con codice di riferimento e QR code.

    Il QR code è sia nel corpo dell'email (immagine servita dal backend) sia in allegato PNG,
    così resta disponibile anche se il programma di posta blocca le immagini esterne.

    Args:
        destinatario: Email del visitatore.
        nome: Nome del visitatore.
        titolo_mostra: Titolo della mostra.
        data_inizio: Data di apertura della mostra.
        data_fine: Data di chiusura della mostra.
        codice: Codice della prenotazione.
        url_backend: Indirizzo pubblico del backend, per l'immagine del QR code nel corpo dell'email.
    """
    # import qui: prenotazioni_service usa i modelli, che non servono alle altre email
    from services.prenotazioni_service import genera_qr_png

    oggetto = f"Conferma Prenotazione: {titolo_mostra}"
    allegati = None
    url_qr = None
    if codice:
        allegati = [(f"prenotazione-{codice}.png", genera_qr_png(codice))]
        if url_backend:
            url_qr = f"{url_backend.rstrip('/')}/api/prenotazioni/qr/{codice}"
    html_content = crea_html_conferma(nome, titolo_mostra, data_inizio, data_fine, codice, url_qr)
    _invia(destinatario, nome, oggetto, html_content, allegati=allegati)


# Email di conferma dell'annullamento di una prenotazione
def invia_email_annullamento(destinatario: str, nome: str, titolo_mostra: str, data_inizio: date, data_fine: date):
    oggetto = f"Prenotazione annullata: {titolo_mostra}"
    _invia(destinatario, nome, oggetto, crea_html_annullamento(nome, titolo_mostra, data_inizio, data_fine))


# Email di benvenuto dopo la registrazione
def invia_email_registrazione(destinatario: str, nome: str):
    _invia(destinatario, nome, "Registrazione completata", crea_html_registrazione(nome))


# Email di avviso per un tentativo di registrazione con un'email già usata
def invia_email_gia_registrato(destinatario: str, nome: str):
    _invia(destinatario, nome, "Tentativo di registrazione con la tua email", crea_html_gia_registrato(nome))


# Email con il link per reimpostare la password
def invia_email_reset_password(destinatario: str, nome: str, link: str, minuti: int):
    if not _invia(destinatario, nome, "Reimposta la tua password", crea_html_reset_password(nome, link, minuti)):
        # senza servizio email (es. in locale) il link viene scritto nel log per poter provare la funzione
        logger.warning(f"Link per reimpostare la password di {destinatario}: {link}")
