// src/components/auth/Login.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import logo from '../../assets/greeneye_logo.png';

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
      });

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

      login(token || 'COOKIE_SESSION');
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
        background: 'var(--ge-bg, #eef2f7)', // var 미정의 시 단일 톤 보장
        padding: 16,
      }}
    >
      <form onSubmit={onSubmit} className="login-form" style={{
        width: 440, maxWidth: '92vw',
        background: '#fff', borderRadius: 16,
        boxShadow: '0 12px 32px rgba(0,0,0,.08)',
        padding: 24, boxSizing: 'border-box', color:'#111'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, textAlign: 'center', fontSize: 28, fontWeight: 800 }}>
          로그인
        </h2>

        {/* ✅ 로고: 제목과 입력창 사이 / 카드 가로폭 꽉 차게 + 확대(투명 여백 보정) */}
        <div style={{ margin: '0 -24px 16px', overflow: 'hidden', height: 'clamp(140px, 30vw, 260px)' }}>
          <img
            src={logo}
            alt="GreenEye"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              transform: 'scale(1.9)',      // 필요시 1.6~2.3 사이로 조절
              transformOrigin: 'center',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {err && <div style={{ color: '#b91c1c', background:'#fee2e2', border:'1px solid #fecaca',
                              padding:'8px 10px', borderRadius:8, marginBottom:12 }}>{err}</div>}

        {/* ✅ 라벨 없이 placeholder 사용 (세로 배치) */}
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
            borderRadius: 8,
            outline: 'none',
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
            borderRadius: 8,
            outline: 'none',
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
            borderRadius: 10,
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            width: '100%',
            padding: '12px 0',
            marginTop: 10,
            background: '#e5e7eb',
            color: '#111827',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
