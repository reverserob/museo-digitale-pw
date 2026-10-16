import html
import json
import logging
import smtplib
import urllib.error
import urllib.request
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import settings

logger = logging.getLogger("uvicorn.error")

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


def crea_html_conferma(nome: str, titolo_mostra: str, data_inizio: date, data_fine: date) -> str:
    # i dati inseriti dall'utente vengono "escapati" prima di finire nell'HTML
    nome_html = html.escape(nome)
    titolo_html = html.escape(titolo_mostra)
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{nome_html}</b>,</p>
            <p style="color: #ddd;">La tua prenotazione è andata a buon fine! Ti aspettiamo per l'esposizione:</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{titolo_html}</h3>
                <p style="margin: 0; color: #ccc;"><b>Periodo:</b> Dal {data_inizio} al {data_fine}</p>
            </div>
    """)


def crea_html_registrazione(nome: str) -> str:
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{html.escape(nome)}</b>,</p>
            <p style="color: #ddd;">la registrazione al Museo Civico Digitale è avvenuta con successo.</p>
            <p style="color: #ddd;">Con il tuo account puoi prenotare le visite alle mostre e, dopo esserti
            prenotato, lasciare un feedback sulla mostra.</p>
    """)


def crea_html_gia_registrato(nome: str) -> str:
    return _layout(f"""
            <p style="color: #fff;">Gentile <b>{html.escape(nome)}</b>,</p>
            <p style="color: #ddd;">qualcuno ha appena provato a creare un nuovo account con il tuo indirizzo email,
            ma risulti già registrato: la registrazione non è stata completata.</p>
            <p style="color: #ddd;">Se eri tu, accedi con la tua password oppure usa "Password dimenticata?"
            nella pagina di accesso. Se non eri tu, puoi ignorare questa email.</p>
    """)


def crea_html_reset_password(nome: str, link: str, minuti: int) -> str:
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


def invia_con_brevo(destinatario: str, nome: str, oggetto: str, html_content: str) -> None:
    # API di Brevo: una richiesta HTTPS (porta 443), quindi funziona anche dove SMTP è bloccato
    dati = {
        "sender": {"name": settings.EMAIL_MITTENTE_NOME, "email": settings.EMAIL_MITTENTE},
        "to": [{"email": destinatario, "name": nome}],
        "subject": oggetto,
        "htmlContent": html_content,
    }
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
    try:
        with urllib.request.urlopen(richiesta, timeout=10) as risposta:
            risposta.read()
    except urllib.error.HTTPError as e:
        # Brevo spiega nel corpo della risposta cosa non va (es. mittente non verificato, chiave errata)
        dettaglio = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Brevo ha risposto {e.code}: {dettaglio}") from e


def invia_con_smtp(destinatario: str, oggetto: str, html_content: str) -> None:
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = destinatario
    msg["Subject"] = oggetto
    msg.attach(MIMEText(html_content, "html"))

    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, destinatario, msg.as_string())


def _invia(destinatario: str, nome: str, oggetto: str, html_content: str) -> bool:
    """Invia con Brevo (se configurato) o con SMTP. Non solleva eccezioni: restituisce True se l'email è partita."""
    usa_brevo = bool(settings.BREVO_API_KEY)
    if not usa_brevo and not (settings.SMTP_USER and settings.SMTP_PASSWORD):
        logger.warning(f"Email non configurata (né BREVO_API_KEY né SMTP): '{oggetto}' per {destinatario} non inviata.")
        return False
    try:
        if usa_brevo:
            invia_con_brevo(destinatario, nome, oggetto, html_content)
        else:
            invia_con_smtp(destinatario, oggetto, html_content)
        logger.info(f"Email '{oggetto}' inviata a {destinatario} tramite {'Brevo' if usa_brevo else 'SMTP'}")
        return True
    except Exception as e:
        logger.error(f"Errore invio email a {destinatario}: {e}")
        return False


# SEND MAIL PRENOTAZIONE
def invia_email_background(destinatario: str, nome: str, titolo_mostra: str, data_inizio: date, data_fine: date):
    oggetto = f"Conferma Prenotazione: {titolo_mostra}"
    _invia(destinatario, nome, oggetto, crea_html_conferma(nome, titolo_mostra, data_inizio, data_fine))


# SEND MAIL REGISTRAZIONE
def invia_email_registrazione(destinatario: str, nome: str):
    _invia(destinatario, nome, "Registrazione completata", crea_html_registrazione(nome))


# SEND MAIL TENTATIVO DI REGISTRAZIONE DOPPIA
def invia_email_gia_registrato(destinatario: str, nome: str):
    _invia(destinatario, nome, "Tentativo di registrazione con la tua email", crea_html_gia_registrato(nome))


# SEND MAIL RESET PASSWORD
def invia_email_reset_password(destinatario: str, nome: str, link: str, minuti: int):
    if not _invia(destinatario, nome, "Reimposta la tua password", crea_html_reset_password(nome, link, minuti)):
        # senza servizio email (es. in locale) il link viene scritto nel log per poter provare la funzione
        logger.warning(f"Link per reimpostare la password di {destinatario}: {link}")
