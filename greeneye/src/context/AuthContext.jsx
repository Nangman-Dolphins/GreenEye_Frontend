import React, { createContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext({
  token: null,
  login: (_arg) => false,
  logout: () => {},
  authFetch: async (_url, _init) => new Response(null, { status: 500 }),
});

const STORAGE_KEY = 'auth_token';
const API_BASE = import.meta.env.VITE_API_BASE || ''; // 프록시면 '' 유지

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setToken(saved);
  }, []);

  const login = (arg) => {
    const t = typeof arg === 'string' ? arg : arg?.token;
    if (!t) return false;
    setToken(t);
    localStorage.setItem(STORAGE_KEY, t);
    return true;
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const authFetch = async (path, init = {}) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...init, headers, credentials: 'include' });
  };

  const value = useMemo(() => ({ token, login, logout, authFetch }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
