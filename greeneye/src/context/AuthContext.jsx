import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext({
  token: null,
  login: async () => {},
  logout: () => {},
  authFetch: async () => {}
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);

  // 1) 앱 시작 시 localStorage에서 토큰 복원
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) setToken(saved);
  }, []);

  // 2) 로그인 함수 (greeneye/1111은 임시 로그인)
  const login = async (email, password) => {
    if (email === 'greeneye' && password === '1111') {
      const dummy = 'mock-token-123';
      localStorage.setItem('token', dummy);
      setToken(dummy);
      return;
    }

    // 실제 백엔드 연동 시 이 부분을 사용
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    const { token: newToken } = await res.json();
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  // 3) 로그아웃 함수
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // 4) 인증 헤더 자동 추가 fetch 래퍼
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}