import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, authFetch } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email.trim() || !password) {
      setErr('이메일과 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      // ✅ 백엔드 DB 로그인 (AuthContext.authFetch 사용)
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      }); // :contentReference[oaicite:1]{index=1}

      if (!res.ok) {
        let msg = `로그인 실패 (status ${res.status})`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }

      // 토큰 방식/쿠키 세션 모두 수용
      let token = null;
      try {
        const data = await res.json();
        token = data?.token || data?.access_token || data?.jwt || null;
      } catch { /* 쿠키 세션일 수 있음 */ }

      login(token || 'COOKIE_SESSION');     // :contentReference[oaicite:2]{index=2}
      localStorage.setItem('account_email', String(email).trim()); // ← 기기등록용 이메일 저장
      navigate('/dashboard', { replace: true });
    } catch (e2) {
      setErr(e2.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}
    >
      <form onSubmit={onSubmit} className="login-form">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>로그인</h2>

        {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}

        {/* ✅ 예전처럼 라벨 없이 placeholder만 사용 (세로 배치) */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            marginBottom: 10,
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
          autoComplete="email"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            marginBottom: 12,
            border: '1px solid #ccc',
            borderRadius: 4,
          }}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 0',
            background: loading ? '#93c5fd' : '#1e40af',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            width: '100%',
            padding: '10px 0',
            marginTop: 10,
            background: '#e5e7eb',
            color: '#111827',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
