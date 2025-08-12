import React, { createContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext({
  token: null,
  login: (_arg) => false,
  logout: () => {},
});

const STORAGE_KEY = 'auth_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  // 앱 시작 시 로컬스토리지에서 토큰 복원
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setToken(saved);
  }, []);

  // 로그인: 문자열 또는 { token } 객체 모두 지원
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

  const value = useMemo(() => ({ token, login, logout }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
