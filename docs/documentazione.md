# Come si genera la documentazione

La documentazione è composta da due parti, entrambe generate dai commenti del codice:

| Parte | Strumento | Sorgente | Uscita |
| --- | --- | --- | --- |
| Sito, guida e backend | **MkDocs** + tema Material + **mkdocstrings** | `mkdocs.yml`, `docs/*.md`, docstring di `backend/` | `site/` |
| Swagger UI | **FastAPI** (OpenAPI) + swagger-ui | `backend/esporta_openapi.py` | `docs/swagger/openapi.json` → `site/swagger/` |
| Frontend | **JSDoc** + tema clean-jsdoc-theme | commenti `/** */` di `frontend/src` (configurazione in `frontend/jsdoc.json`) | `docs/frontend-api/` → `site/frontend-api/` |

## Generare tutto in locale

```bash
# 1. documentazione del frontend (JSDoc)
cd frontend
npm install
npm run docs                 # scrive in ../docs/frontend-api/

# 2. schema OpenAPI per la Swagger UI
cd ../backend
python esporta_openapi.py ../docs/swagger/openapi.json

# 3. sito MkDocs con la reference del backend
cd ..
pip install -r backend/requirements-docs.txt
mkdocs serve                 # anteprima con aggiornamento automatico su http://127.0.0.1:8000
mkdocs build --strict        # oppure: sito statico completo nella cartella site/
```

!!! warning "Porta occupata"
    `mkdocs serve` usa la porta 8000 come il backend. Se il backend è avviato usa
    `mkdocs serve -a 127.0.0.1:8001`.

## Come scrivere i commenti

=== "Python (Google style)"

    ```python
    def trova_mostra(db: Session, mostra_id: int) -> models.Mostra:
        """Restituisce la mostra con l'id indicato.

        Args:
            db: Sessione del database.
            mostra_id: Identificativo della mostra.

        Returns:
            La mostra trovata.

        Raises:
            HTTPException: 404 se la mostra non esiste.
        """
    ```

=== "JavaScript (JSDoc)"

    ```js
    /**
     * Dettaglio pubblico di una mostra (`GET /api/mostre/{id}`).
     *
     * @param {number|string} id Identificativo della mostra.
     * @returns {Promise<module:tipi~Mostra>} La mostra (errore 404 se non esiste).
     */
    export const getMostra = (id) => api.get(`/api/mostre/${id}`).then((res) => res.data);
    ```

    Ogni file inizia con un blocco `@module` (es. `@module services/mostreService`) che lo raggruppa
    nella documentazione; i componenti esportati con `export default` hanno anche `@alias`.

## Pubblicazione

Il workflow GitHub Actions `docs.yml` genera entrambe le parti a ogni push su `main` e pubblica il sito su
**GitHub Pages**. La CI delle pull request controlla che la documentazione si generi senza errori
(`mkdocs build --strict`).
