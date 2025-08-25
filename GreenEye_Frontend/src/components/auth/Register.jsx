// src/components/auth/Register.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { authFetch } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (!email.trim() || !password) {
      setErr('이메일과 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        let msg = `회원가입 실패 (status ${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      setOk('회원가입이 완료되었습니다. 로그인해 주세요.');
      setTimeout(() => navigate('/login', { replace: true }), 900);
    } catch (e) {
      setErr(e.message || '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f3f4f6'
    }}>
      <form onSubmit={submit} className="login-form">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>회원가입</h2>

        {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}
        {ok && <div style={{ color: '#16a34a', marginBottom: 12 }}>{ok}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 10 }}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 14 }}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '12px 0',
            background: loading ? '#93c5fd' : '#1e40af',
            color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
          }}
        >
          {loading ? '가입 중…' : '회원가입'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            width: '100%', padding: '10px 0', marginTop: 10,
            background: '#e5e7eb', color: '#111827',
            border: 'none', borderRadius: 6, cursor: 'pointer'
          }}
        >
          로그인으로 돌아가기
        </button>
      </form>
    </div>
  );
}
