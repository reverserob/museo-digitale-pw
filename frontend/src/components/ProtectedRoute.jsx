/**
 * Protezione delle pagine riservate ad amministratore e visitatori.
 *
 * @module components/ProtectedRoute
 */
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/authService';
import { getUtente } from '../services/utentiService';

/**
 * Protegge le pagine riservate: ruolo `'admin'` per l'area riservata, `'utente'` per le pagine dei visitatori.
 * Chi non ha i permessi viene reindirizzato (`Navigate`) invece di vedere la pagina:
 * - ruolo `'utente'`: l'admin va a `/admin`, chi non è collegato va a `/accedi?next=...`;
 * - ruolo `'admin'`: chi non è collegato va alla pagina di login `/admin`.
 *
 * @example
 * <ProtectedRoute ruolo="utente">
 *     <AreaPersonale />
 * </ProtectedRoute>
 *
 * @param {object} props Proprietà del componente.
 * @param {React.ReactNode} props.children Pagina da mostrare se l'accesso è consentito.
 * @param {('admin'|'utente')} [props.ruolo='admin'] Chi può vedere la pagina.
 * @returns {JSX.Element} La pagina oppure un reindirizzamento.
 * @alias module:components/ProtectedRoute.ProtectedRoute
 */
export default function ProtectedRoute({ children, ruolo = 'admin' }) {
    const location = useLocation();

    if (ruolo === 'utente') {
        // l'amministratore non prenota e non ha un'area personale
        if (isLoggedIn()) return <Navigate to="/admin" replace />;
        if (!getUtente()) {
            // dopo il login il visitatore torna alla pagina che voleva aprire (parametro next)
            const destinazione = encodeURIComponent(location.pathname);
            return <Navigate to={`/accedi?next=${destinazione}`} replace />;
        }
        return children;
    }

    // pagine dell'admin: senza login si torna alla pagina di accesso dell'area riservata
    if (!isLoggedIn()) {
        return <Navigate to="/admin" replace />;
    }
    return children;
}
