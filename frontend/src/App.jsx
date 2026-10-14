import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { theme } from './theme';
import './styles/layout.css';
import routes from './config/routes.json';
import background from './config/background.json';

import AppHeader from './components/AppHeader';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import GalleriaMostra from './pages/GalleriaMostra';
import FormPrenotazione from './pages/FormPrenotazione';
import AdminDashboard from './pages/AdminDashboard';
import AdminForm from './pages/AdminForm';
import NotFound from './pages/NotFound';

// Nel JSON le pagine sono indicate per nome: qui associo ogni nome al componente vero
const pages = { Home, GalleriaMostra, FormPrenotazione, AdminDashboard, AdminForm, NotFound };

function App() {
    const sfondo = { backgroundImage: `${background.overlay}, url(${background.image})` };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <div className="app-container" style={sfondo}>
                    <AppHeader />

                    <Routes>
                        {routes.map((route) => {
                            const Pagina = pages[route.component];
                            // le rotte con "protected": true sono visibili solo dopo il login
                            const elemento = route.protected ? (
                                <ProtectedRoute>
                                    <Pagina />
                                </ProtectedRoute>
                            ) : (
                                <Pagina />
                            );
                            return <Route key={route.path} path={route.path} element={elemento} />;
                        })}
                    </Routes>
                </div>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
