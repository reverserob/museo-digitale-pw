import { api, getToken, setToken } from './api';

// Login dell'area riservata: se le credenziali sono giuste salva il token
export const login = (email, password) =>
    api.post('/api/login', { email, password }).then((res) => {
        setToken(res.data.access_token);
        return res.data;
    });

export const logout = () => setToken(null);

export const isLoggedIn = () => Boolean(getToken());
