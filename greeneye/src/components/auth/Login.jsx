import React, { useState, useContext } from 'react';
import { useNavigate }          from 'react-router-dom';
import { AuthContext }          from '../../context/AuthContext';
import logo                      from '../../assets/greeneye_logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);

  const handleSubmit = e => {
    e.preventDefault();
    // 임시 크리덴셜 검사
    if (email === 'greeneye' && password === '1111') {
      login({ token: 'TEMP_TOKEN' }); // AuthContext 에 맞게 전달
      navigate('/dashboard');
    } else {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display:    'flex',
      justifyContent: 'center',
      alignItems:    'center',
      background: '#f3f4f6'
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width:         320,
          padding:       24,
          background:    'white',
          borderRadius:  8,
          boxShadow:     '0 1px 4px rgba(0,0,0,0.1)',
          textAlign:     'center',
          boxSizing:     'border-box'
        }}
      >
        <img
          src={logo}
          alt="GreenEye Logo"
          style={{
            width:   200,
            margin:  '0 auto 16px',
            display: 'block'
          }}
        />
        <h2 style={{ margin: '0 0 24px' }}>로그인</h2>

        {error && (
          <div style={{ color: 'red', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width:        '100%',
            boxSizing:    'border-box',
            padding:      '10px 12px',
            marginBottom: 16,
            border:       '1px solid #ccc',
            borderRadius: 4,
            fontSize:     14
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{
            width:        '100%',
            boxSizing:    'border-box',
            padding:      '10px 12px',
            marginBottom: 24,
            border:       '1px solid #ccc',
            borderRadius: 4,
            fontSize:     14
          }}
        />

        <button
          type="submit"
          style={{
            width:         '100%',
            boxSizing:     'border-box',
            padding:       '12px 0',
            background:    '#1e40af',
            color:         'white',
            border:        'none',
            borderRadius:  4,
            fontSize:      16,
            cursor:        'pointer'
          }}
        >
          로그인
        </button>
      </form>
    </div>
  );
}