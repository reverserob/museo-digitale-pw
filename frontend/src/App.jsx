import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { theme } from './theme';
import './styles/layout.css';
import routes from './config/routes.json';
import background from './config/background.json';

import AppHeader from './components/AppHeader';
import Home from './components/Home';
import GalleriaMostra from './components/GalleriaMostra';
import FormPrenotazione from './components/FormPrenotazione';
import AdminDashboard from './components/AdminDashboard';
import AdminForm from './components/AdminForm';

const components = { Home, GalleriaMostra, FormPrenotazione, AdminDashboard, AdminForm };

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
                            const Componente = components[route.component];
                            return <Route key={route.path} path={route.path} element={<Componente />} />;
                        })}
                    </Routes>
                </div>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
