import React, { createContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext({
  token: null,
  login: (_arg) => false,
  logout: () => {},
  // 토큰 없으면 그냥 기본 fetch
  authFetch: (input, init) => fetch(input, init),
});

const STORAGE_KEY = 'auth_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  // 앱 시작 시 토큰 복원
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setToken(saved);
  }, []);

  // 로그인: 문자열 또는 { token }
  const login = (arg) => {
    const t = typeof arg === 'string' ? arg : arg?.token;
    if (!t) return false;
    setToken(t);
    localStorage.setItem(STORAGE_KEY, t);
    return true;
  };

  // 로그아웃
  const logout = () => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // ✅ 인증 fetch: Authorization 헤더 자동 첨부
  const authFetch = async (input, init = {}) => {
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const value = useMemo(() => ({ token, login, logout, authFetch }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
