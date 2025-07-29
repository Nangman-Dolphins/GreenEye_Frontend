import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [pwd, setPwd]   = useState('');

  const onSubmit = async e => {
    e.preventDefault();
    try {
      await login(email, pwd);
      window.location.href = '/dashboard';
    } catch {
      alert('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <form onSubmit={onSubmit} className="login-form">
      <h2>로그인</h2>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={pwd}
        onChange={e => setPwd(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">로그인</button>
    </form>
  );
}