// src/components/auth/Login.jsx
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import logo from '../../assets/greeneye_logo.png';

const OFFLINE_EMAIL = 'greeneye@naver.com';
const OFFLINE_PASS  = '1111';
const OFFLINE_TOKEN = 'OFFLINE_DEV_TOKEN';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    // ✅ 오프라인(백엔드 미연결)용 고정 계정 허용
    if (email.trim().toLowerCase() === OFFLINE_EMAIL && password === OFFLINE_PASS) {
      if (login(OFFLINE_TOKEN)) navigate('/dashboard', { replace: true, state: { offline: true } });
      else setErr('토큰 저장 실패(오프라인)');
      return;
    }

    // 🌐 온라인 로그인 (백엔드 연결 시 사용)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.error || `로그인 실패 (status ${res.status})`);
      if (!data?.token) throw new Error('토큰이 없습니다.');

      if (login(data.token)) navigate('/dashboard', { replace: true });
      else setErr('토큰 저장 실패');
    } catch (e2) {
      setErr(e2.message || '로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f3f4f6'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 320,
        padding: 24,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <img
          src={logo}
          alt="GreenEye Logo"
          style={{ width: 200, height: 'auto', margin: '0 auto 16px', display: 'block' }}
        />
        <h2 style={{ margin: '0 0 24px' }}>로그인</h2>

        {/* 힌트가 필요하면 아래 한 줄 주석 해제해서 개발 모드 안내 가능 */}
        {/* <div style={{ fontSize:12, color:'#6b7280', marginBottom:8 }}>오프라인 테스트 계정: {OFFLINE_EMAIL} / {OFFLINE_PASS}</div> */}

        {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}

        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            marginBottom: 16, border: '1px solid #ccc', borderRadius: 4, fontSize: 14
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            marginBottom: 16, border: '1px solid #ccc', borderRadius: 4, fontSize: 14
          }}
        />

        <button type="submit" style={{
          width: '100%', boxSizing: 'border-box', padding: '12px 0',
          background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, fontSize: 16, cursor: 'pointer',
          marginBottom: 10
        }}>
          로그인
        </button>

        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 0',
            background: '#e5e7eb', color: '#111827',
            border: 'none', borderRadius: 4, cursor: 'pointer'
          }}
        >
          회원가입
        </button>
      </form>
    </div>
  );
}
