import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/outfit';
import App from './App.jsx';
import { getLingua } from './i18n/lingua';

// lingua scelta nelle visite precedenti (attributo lang della pagina)
document.documentElement.lang = getLingua();

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>
);
