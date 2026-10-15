import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';

import { theme } from './theme';
import './styles/layout.css';
import routes from './config/routes.json';
import background from './config/background.json';

import AppHeader from './components/AppHeader';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';

const GalleriaMostra = lazy(() => import('./pages/GalleriaMostra'));
const FormPrenotazione = lazy(() => import('./pages/FormPrenotazione'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminForm = lazy(() => import('./pages/AdminForm'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Accedi = lazy(() => import('./pages/Accedi'));
const AreaPersonale = lazy(() => import('./pages/AreaPersonale'));

// Nel JSON le pagine sono indicate per nome: qui associo ogni nome al componente vero
const pages = { Home, GalleriaMostra, FormPrenotazione, AdminDashboard, AdminForm, NotFound, Accedi, AreaPersonale };

function App() {
    const sfondo = { backgroundImage: `${background.overlay}, url(${background.image})` };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <div className="app-container" style={sfondo}>
                    <AppHeader />

                    <Suspense
                        fallback={
                            <Box sx={{ textAlign: 'center', mt: 20 }}>
                                <CircularProgress color="primary" />
                            </Box>
                        }
                    >
                        <Routes>
                            {routes.map((route) => {
                                const Pagina = pages[route.component];
                                // "protected": true = solo admin, "protected": "utente" = solo visitatori collegati
                                const pagina = route.protected ? (
                                    <ProtectedRoute ruolo={route.protected === 'utente' ? 'utente' : 'admin'}>
                                        <Pagina />
                                    </ProtectedRoute>
                                ) : (
                                    <Pagina />
                                );
                                // un errore in una pagina mostra un messaggio invece dello schermo vuoto
                                const elemento = <ErrorBoundary key={route.path}>{pagina}</ErrorBoundary>;
                                return <Route key={route.path} path={route.path} element={elemento} />;
                            })}
                        </Routes>
                    </Suspense>
                </div>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
