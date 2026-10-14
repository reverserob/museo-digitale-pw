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


def crea_html_conferma(nome: str, titolo_mostra: str, data_inizio: date, data_fine: date) -> str:
    # i dati inseriti dall'utente vengono "escapati" prima di finire nell'HTML
    nome_html = html.escape(nome)
    titolo_html = html.escape(titolo_mostra)
    return f"""
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #0f0f0f; border: 1px solid #c5a059;">
            <h2 style="color: #c5a059;">Museo Civico Digitale</h2>
            <p style="color: #fff;">Gentile <b>{nome_html}</b>,</p>
            <p style="color: #ddd;">La tua prenotazione è andata a buon fine! Ti aspettiamo per l'esposizione:</p>
            <div style="background: #1a1a1a; padding: 15px; border-left: 4px solid #c5a059; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #c5a059;">{titolo_html}</h3>
                <p style="margin: 0; color: #ccc;"><b>Periodo:</b> Dal {data_inizio} al {data_fine}</p>
            </div>
            <p style="color: #aaa;">A presto,<br><b>La Direzione del Museo</b></p>
        </div>
    """


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


# SEND MAIL PRENOTAZIONE
def invia_email_background(destinatario: str, nome: str, titolo_mostra: str, data_inizio: date, data_fine: date):
    usa_brevo = bool(settings.BREVO_API_KEY)
    if not usa_brevo and not (settings.SMTP_USER and settings.SMTP_PASSWORD):
        logger.warning(f"Email non configurata (né BREVO_API_KEY né SMTP): conferma per {destinatario} non inviata.")
        return

    oggetto = f"Conferma Prenotazione: {titolo_mostra}"
    html_content = crea_html_conferma(nome, titolo_mostra, data_inizio, data_fine)

    try:
        if usa_brevo:
            invia_con_brevo(destinatario, nome, oggetto, html_content)
        else:
            invia_con_smtp(destinatario, oggetto, html_content)
        logger.info(f"Email di conferma inviata a {destinatario} tramite {'Brevo' if usa_brevo else 'SMTP'}")
    except Exception as e:
        logger.error(f"Errore invio email a {destinatario}: {e}")
