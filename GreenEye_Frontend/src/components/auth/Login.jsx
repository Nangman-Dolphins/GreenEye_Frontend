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
      // ✅ 백엔드 DB 기준 로그인
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        let msg = `로그인 실패 (status ${res.status})`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }

      // 토큰 방식 또는 쿠키 세션 방식 모두 수용
      let token = null;
      try {
        const data = await res.json();
        token = data?.token || data?.access_token || data?.jwt || null;
      } catch { /* 쿠키세션일 수 있음 */ }

      login(token || 'COOKIE_SESSION');  // 토큰 없으면 센티널 저장(쿠키 세션)
      navigate('/dashboard', { replace: true });
    } catch (e2) {
      setErr(e2.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <form onSubmit={onSubmit} className="login-form">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>로그인</h2>

        {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 10, border: '1px solid #ccc', borderRadius: 4 }}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 12, border: '1px solid #ccc', borderRadius: 4 }}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px 0', background: loading ? '#93c5fd' : '#1e40af', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{ width: '100%', padding: '10px 0', marginTop: 10, background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
