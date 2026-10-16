import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import Home from '../pages/Home';
import { TESTI, MESSAGGI_SERVER_EN } from '../i18n/testi';
import { getLingua, setLingua, traduci, traduciServer } from '../i18n/lingua';
import { messaggioErrore } from '../services/api';
import { FUTURE, erroreHttp } from './utils';

const monta = (elemento) => render(<MemoryRouter future={FUTURE}>{elemento}</MemoryRouter>);

describe('dizionari', () => {
    it('italiano e inglese hanno le stesse chiavi e nessun testo vuoto', () => {
        expect(Object.keys(TESTI.en).sort()).toEqual(Object.keys(TESTI.it).sort());
        for (const lingua of ['it', 'en']) {
            for (const [chiave, testo] of Object.entries(TESTI[lingua])) {
                expect(testo.trim(), `${lingua}.${chiave}`).not.toBe('');
            }
        }
    });

    it('i segnaposto {..} sono gli stessi nelle due lingue', () => {
        const segnaposto = (testo) => (testo.match(/\{\w+\}/g) || []).sort();
        for (const chiave of Object.keys(TESTI.it)) {
            expect(segnaposto(TESTI.en[chiave]), chiave).toEqual(segnaposto(TESTI.it[chiave]));
        }
    });

    it('ogni messaggio del server ha una traduzione inglese', () => {
        for (const [it, en] of Object.entries(MESSAGGI_SERVER_EN)) {
            expect(en, it).toBeTruthy();
            expect(en).not.toBe(it);
        }
    });
});

describe('traduci e traduciServer', () => {
    it("l'italiano è la lingua predefinita e la scelta viene ricordata", () => {
        expect(getLingua()).toBe('it');
        setLingua('en');
        expect(getLingua()).toBe('en');
        expect(document.documentElement.lang).toBe('en');
        setLingua('fr'); // lingua non disponibile: ignorata
        expect(getLingua()).toBe('en');
    });

    it('sostituisce i segnaposto', () => {
        expect(traduci('header.ciao', { nome: 'Mario' }, 'it')).toBe('Ciao, Mario');
        expect(traduci('header.ciao', { nome: 'Mario' }, 'en')).toBe('Hi, Mario');
        expect(traduci('chiave.inesistente')).toBe('chiave.inesistente');
    });

    it('traduce i messaggi del server, anche quelli di validazione con il nome del campo', () => {
        expect(traduciServer('Ti sei già prenotato a questa mostra.', 'it')).toBe(
            'Ti sei già prenotato a questa mostra.'
        );
        expect(traduciServer('Ti sei già prenotato a questa mostra.', 'en')).toBe(
            'You have already booked this exhibition.'
        );
        expect(
            traduciServer(
                'password: La password deve contenere almeno un numero. · telefono: Il numero di telefono deve contenere da 6 a 15 cifre.',
                'en'
            )
        ).toBe(
            'password: The password must contain at least one number. · telefono: The phone number must contain 6 to 15 digits.'
        );
        expect(traduciServer('Messaggio sconosciuto', 'en')).toBe('Messaggio sconosciuto');
    });

    it('messaggioErrore usa la lingua scelta', () => {
        setLingua('en');
        expect(messaggioErrore(erroreHttp(401, 'Email o password errate.'))).toBe('Incorrect email or password.');
        expect(messaggioErrore({})).toBe('Unable to reach the server. Check your connection.');
    });
});

describe('menu della lingua', () => {
    it("passando a EN l'intestazione e la home vengono tradotte", async () => {
        const user = userEvent.setup();
        monta(
            <>
                <AppHeader />
                <Home />
            </>
        );
        expect(screen.getByRole('link', { name: 'Accedi' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Museo Civico Digitale' })).toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'Lingua' }));
        await user.click(screen.getByRole('option', { name: 'EN' }));

        expect(getLingua()).toBe('en');
        expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Staff area' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Digital Civic Museum' })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Discover current exhibitions/ })[0]).toHaveAttribute(
            'href',
            '/esposizioni'
        );

        await user.click(screen.getByRole('combobox', { name: 'Language' }));
        await user.click(screen.getByRole('option', { name: 'ITA' }));
        expect(screen.getByRole('link', { name: 'Accedi' })).toBeInTheDocument();
    });
});

describe('Home', () => {
    it('presenta il museo e porta alle esposizioni correnti', () => {
        monta(<Home />);
        expect(screen.getByRole('heading', { name: 'Museo Civico Digitale' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Il museo' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Prenotazione online' })).toBeInTheDocument();
        const pulsanti = screen.getAllByRole('link', { name: /Scopri le esposizioni correnti/ });
        expect(pulsanti.length).toBeGreaterThan(0);
        pulsanti.forEach((p) => expect(p).toHaveAttribute('href', '/esposizioni'));
    });
});

describe('AppFooter', () => {
    it('mostra orari, indirizzo e contatti per le prenotazioni', () => {
        monta(<AppFooter />);
        const footer = screen.getByRole('contentinfo');
        const orari = within(footer).getByRole('region', { name: 'Orari' });
        expect(orari).toHaveTextContent('Dal lunedì al sabato');
        expect(orari).toHaveTextContent('09:00 – 18:30');
        expect(within(footer).getByRole('region', { name: 'Dove siamo' })).toHaveTextContent('Piazza delle Arti 7');
        const prenotazioni = within(footer).getByRole('region', { name: 'Prenotazioni' });
        expect(prenotazioni).toHaveTextContent('solo online, con il pulsante PRENOTA');
        expect(within(prenotazioni).getByRole('link', { name: 'Vai alle esposizioni' })).toHaveAttribute(
            'href',
            '/esposizioni'
        );
        expect(within(prenotazioni).getByRole('link', { name: /modulo Contatti/ })).toHaveAttribute(
            'href',
            '/contatti'
        );
        // nessun indirizzo email o numero di telefono per le prenotazioni
        expect(footer.querySelector('a[href^="mailto:"]')).toBeNull();
        expect(footer.querySelector('a[href^="tel:"]')).toBeNull();
        expect(footer).not.toHaveTextContent('@');
    });

    it('in inglese', () => {
        setLingua('en');
        monta(<AppFooter />);
        expect(screen.getByRole('region', { name: 'Opening hours' })).toHaveTextContent('Monday to Saturday');
        expect(screen.getByRole('region', { name: 'Where we are' })).toBeInTheDocument();
    });
});
