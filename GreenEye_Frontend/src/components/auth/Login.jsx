// src/components/auth/Login.jsx
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

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email.trim() || !password) {
      setErr('이메일과 비밀번호를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      // ✅ 백엔드 DB를 경유하는 실제 로그인
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        // 백엔드에서 에러 메시지를 주면 표시
        let msg = `로그인 실패 (status ${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await res.json();
      if (!data?.token) throw new Error('토큰이 없습니다.');

      login(data.token);               // 컨텍스트에 토큰 저장
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setErr(e.message || '로그인 실패');
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
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>로그인</h2>

        {err && (
          <div style={{ color: 'red', marginBottom: 12 }}>
            {err}
          </div>
        )}

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
          autoComplete="current-password"
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
          {loading ? '로그인 중…' : '로그인'}
        </button>

        {/* ✅ 회원가입 버튼 복귀 */}
        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            width: '100%', padding: '10px 0', marginTop: 10,
            background: '#e5e7eb', color: '#111827',
            border: 'none', borderRadius: 6, cursor: 'pointer'
          }}
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
