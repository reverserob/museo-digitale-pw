import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/authService';
import { getUtente } from '../services/utentiService';

export default function ProtectedRoute({ children, ruolo = 'admin' }) {
    const location = useLocation();

    if (ruolo === 'utente') {
        // l'amministratore non prenota e non ha un'area personale
        if (isLoggedIn()) return <Navigate to="/admin" replace />;
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
