import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/authService';
import { getUtente } from '../services/utentiService';

// Protegge le pagine riservate: ruolo 'admin' per l'area riservata, 'utente' per le pagine dei visitatori.
// Chi non ha i permessi viene reindirizzato (Navigate) invece di vedere la pagina.
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
