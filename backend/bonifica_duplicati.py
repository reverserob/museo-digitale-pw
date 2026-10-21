"""Bonifica dei duplicati che impediscono la creazione degli indici unici.

Da usare solo se all'avvio il back-end si ferma con "Impossibile creare gli indici unici per dati duplicati".
Per ogni visitatore e mostra tiene la prenotazione (e il feedback) più vecchia ed elimina le altre.

Uso (dalla cartella backend, con il venv attivo e la stessa DATABASE_URL del server):

    python bonifica_duplicati.py            # mostra solo quante righe verrebbero eliminate
    python bonifica_duplicati.py --esegui   # elimina davvero i duplicati
"""

import sys

from database import engine
from services.migrazioni_service import bonifica_duplicati, trova_duplicati


def main(argomenti: list[str]) -> None:
    duplicati = trova_duplicati(engine)
    for nome, n in duplicati.items():
        print(f"{nome}: {n} righe duplicate")
    if not any(duplicati.values()):
        print("Nessun duplicato: non serve alcuna bonifica.")
        return
    if "--esegui" not in argomenti:
        print("Simulazione: aggiungi --esegui per eliminare i duplicati (fai prima una copia del database).")
        return
    for nome, n in bonifica_duplicati(engine).items():
        print(f"{nome}: eliminate {n} righe")
    print("Bonifica completata: riavvia il back-end per creare gli indici unici.")


if __name__ == "__main__":
    main(sys.argv[1:])
