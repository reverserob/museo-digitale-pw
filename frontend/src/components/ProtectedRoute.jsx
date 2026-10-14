import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../services/authService';

// Mostra la pagina solo se l'amministratore ha fatto il login,
// altrimenti rimanda alla pagina di accesso dell'area riservata.
export default function ProtectedRoute({ children }) {
    if (!isLoggedIn()) {
        return <Navigate to="/admin" replace />;
    }
    return children;
}
