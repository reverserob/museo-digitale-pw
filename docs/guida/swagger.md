# Swagger UI

Documentazione interattiva delle API generata da FastAPI secondo lo standard **OpenAPI**: per ogni endpoint
mostra parametri, corpo della richiesta, schemi delle risposte e codici di stato.

[:material-open-in-new: Apri a schermo intero](../swagger/index.html){ .md-button .md-button--primary }
[:material-test-tube: Prova le API sul backend (Render)](https://museo-digitale-pw.onrender.com/docs){ .md-button }

<iframe src="../../swagger/index.html" title="Swagger UI delle API" style="width:100%;height:80vh;border:1px solid rgba(197,160,89,.35);border-radius:6px;background:#fff"></iframe>

!!! info "Perché qui non si possono inviare richieste"
    Il backend accetta chiamate dal browser solo dal sito del museo (CORS), quindi in questa copia
    il pulsante *Try it out* è disattivato. Per provare gli endpoint usa la Swagger UI del backend pubblicato:
    la prima richiesta può richiedere qualche decina di secondi, perché sul piano gratuito di Render
    il servizio va in pausa quando non viene usato.

Lo schema `openapi.json` viene esportato a ogni build da `backend/esporta_openapi.py`, quindi è sempre
allineato al codice.
