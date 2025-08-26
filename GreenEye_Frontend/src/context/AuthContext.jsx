// src/context/AuthContext.jsx
import React, { createContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext({
  token: null,
  login: (_arg) => false,
  logout: () => {},
  authFetch: async (_url, _init) => new Response(null, { status: 500 }),
});

const STORAGE_KEY = 'auth_token';
const API_BASE = import.meta.env.VITE_API_BASE || '';            // 예: http://127.0.0.1:8000
const USE_CREDENTIALS = import.meta.env.VITE_USE_CREDENTIALS === '1'; // 1이면 쿠키 동봉, 그 외 omit

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

  // ✅ 전체본: ENV로 credentials 토글 + 토큰 헤더 + JSON Content-Type 자동
  const authFetch = async (path, init = {}) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

    const headers = new Headers(init.headers || {});
    // 토큰이 있으면 Authorization 자동 부착(쿠키 기반이든 아니든 안전)
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    // JSON 바디일 때만 Content-Type 지정(FormData는 자동으로 경계값 붙음)
    if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // ENV로 쿠키 동봉 여부 결정 (CORS 문제가 있으면 omit로 두세요)
    const credentials = USE_CREDENTIALS ? 'include' : 'omit';

    return fetch(url, {
      ...init,
      headers,
      credentials,
      // 캐시가 남아 오작동하면 아래 주석 해제
      // cache: 'no-store',
    });
  };

  const value = useMemo(() => ({ token, login, logout, authFetch }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
