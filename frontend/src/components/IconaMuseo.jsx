/**
 * Icona del museo (edificio con colonne), usata nell'header accanto al nome del sito.
 * È la stessa immagine della favicon (`public/favicon.svg`).
 *
 * @module components/IconaMuseo
 */

/**
 * Icona SVG del museo; prende il colore del testo in cui è inserita (`currentColor`).
 *
 * @param {object} props Proprietà del componente.
 * @param {number} [props.dimensione=26] Larghezza e altezza in pixel.
 * @returns {JSX.Element} L'icona.
 * @alias module:components/IconaMuseo.IconaMuseo
 */
export default function IconaMuseo({ dimensione = 26 }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width={dimensione}
            height={dimensione}
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
        >
            <path d="M11.5 1 2 6v2h19V6m-5 4v7h3v-7M2 22h19v-3H2m8-9v7h3v-7m-9 0v7h3v-7z" />
        </svg>
    );
}
