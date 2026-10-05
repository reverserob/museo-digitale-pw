import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, Button } from '@mui/material';

import { theme } from './theme';
import Home from './components/Home';
import GalleriaMostra from './components/GalleriaMostra';
import FormPrenotazione from './components/FormPrenotazione';
import AdminDashboard from './components/AdminDashboard';
import AdminForm from './components/AdminForm';

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <Box sx={{ minHeight: '100vh', backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.9)), url(https://images.unsplash.com/photo-1541123603104-512919d6a96c?q=80&w=2070)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', pb: 8 }}>

                    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <Toolbar>
                            <Typography variant="h6" sx={{ flexGrow: 1, color: '#c5a059', fontWeight: 'bold', letterSpacing: 3 }}>
                                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>MUSEO CIVICO DIGITALE</Link>
                            </Typography>
                            <Button component={Link} to="/admin" color="inherit" sx={{ letterSpacing: 1 }}>Area Riservata</Button>
                        </Toolbar>
                    </AppBar>

                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/esposizione/:id" element={<GalleriaMostra />} />
                        <Route path="/prenota/:id" element={<FormPrenotazione />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/nuova" element={<AdminForm />} />
                        <Route path="/admin/modifica/:id" element={<AdminForm />} />
                    </Routes>

                </Box>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
