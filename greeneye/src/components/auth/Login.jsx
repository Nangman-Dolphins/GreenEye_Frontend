import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext.jsx';
import logo from '../../assets/greeneye_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // 임시 로그인 (greeneye / 1111)
    if (email === 'greeneye' && password === '1111') {
      if (login('TEMP_TOKEN')) navigate('/dashboard', { replace: true });
      else setErr('로그인 토큰 저장 실패');
    } else {
      setErr('이메일 또는 비밀번호가 올바르지 않습니다.');
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

        {/* 회원가입 버튼 (오른쪽 끝이 아닌 로그인 폼 하단—로그인 화면이므로 자연스러워요) */}
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
