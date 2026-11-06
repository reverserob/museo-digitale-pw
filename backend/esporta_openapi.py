"""Esporta lo schema OpenAPI delle API in un file JSON, per pubblicare la Swagger UI nella documentazione
dalla cartella backend python esporta_openapi.py ../docs/swagger/openapi.json
L'applicazione viene importata con un database SQLite temporaneo
"""

import json
import os
import sys
import tempfile
from pathlib import Path

# database temporaneo importa main crea le tabelle e inserisce le mostre iniziali
os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp()) / 'openapi.db'}"

from main import app  # noqa: E402

# indirizzo del backend pubblico mostrato nella Swagger UI
SERVER_PUBBLICO = "https://museo-digitale-pw.onrender.com"


def esporta(destinazione: Path) -> None:
    """Scrive lo schema OpenAPI dell'applicazione nel file indicato.

    Args:
        destinazione: Percorso del file JSON
    """
    schema = app.openapi()
    schema["servers"] = [{"url": SERVER_PUBBLICO, "description": "Backend pubblicato su Render"}]
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    destinazione.write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Schema OpenAPI scritto in {destinazione} ({len(schema['paths'])} percorsi)")


if __name__ == "__main__":
    esporta(Path(sys.argv[1] if len(sys.argv) > 1 else "openapi.json"))
