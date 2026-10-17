# Schemi Pydantic

Gli schemi descrivono i dati scambiati con le API. FastAPI li usa per validare le richieste
(risposta **422** con un messaggio leggibile se i dati non sono validi) e per generare lo schema OpenAPI di `/docs`.

::: schemas
    options:
      show_if_no_docstring: true
      filters: ["!^_", "!^model_config$"]
