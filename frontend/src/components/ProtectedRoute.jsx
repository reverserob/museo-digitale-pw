import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/authService';
import { getUtente } from '../services/utentiService';

// Mostra la pagina solo a chi ha fatto il login:
// - ruolo "admin": altrimenti rimanda all'accesso dell'area riservata;
// - ruolo "utente": altrimenti rimanda ad Accedi e, dopo il login, torna alla pagina richiesta.
export default function ProtectedRoute({ children, ruolo = 'admin' }) {
    const location = useLocation();

    if (ruolo === 'utente') {
        if (!getUtente()) {
            const destinazione = encodeURIComponent(location.pathname);
            return <Navigate to={`/accedi?next=${destinazione}`} replace />;
        }
        return children;
    }

    if (!isLoggedIn()) {
        return <Navigate to="/admin" replace />;
    }
    return children;
}
