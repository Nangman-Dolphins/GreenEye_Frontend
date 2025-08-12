import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');

    if (!form.email || !form.password) {
      setErr('이메일과 비밀번호를 입력하세요.');
      return;
    }
    if (form.password !== form.confirm) {
      setErr('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const url = `/api/auth/register`; // ← 상대 경로 호출

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `회원가입 실패 (status ${res.status})`);
      }

      alert('회원가입 성공! 로그인 페이지로 이동합니다.');
      navigate('/login', { replace: true });
    } catch (e) {
      setErr(e.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f3f4f6'
    }}>
      <form onSubmit={onSubmit} style={{
        width: 360, padding: 24, background: '#fff', borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)', boxSizing: 'border-box'
      }}>
        <h2 style={{ margin: '0 0 16px' }}>회원가입</h2>

        {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}

        <label style={{ fontWeight: 600 }}>이메일</label>
        <input
          name="email" type="email" placeholder="you@example.com"
          value={form.email} onChange={onChange}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            margin: '6px 0 12px', border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontWeight: 600 }}>이름(선택)</label>
        <input
          name="name" type="text" placeholder="홍길동"
          value={form.name} onChange={onChange}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            margin: '6px 0 12px', border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontWeight: 600 }}>비밀번호</label>
        <input
          name="password" type="password" placeholder="비밀번호"
          value={form.password} onChange={onChange}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            margin: '6px 0 12px', border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontWeight: 600 }}>비밀번호 확인</label>
        <input
          name="confirm" type="password" placeholder="비밀번호 확인"
          value={form.confirm} onChange={onChange}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            margin: '6px 0 20px', border: '1px solid #ccc', borderRadius: 4 }}
        />

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px 0',
            background: loading ? '#93c5fd' : '#1e40af', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 10 }}>
          {loading ? '처리 중…' : '회원가입'}
        </button>

        <button type="button" onClick={() => navigate('/login')}
          style={{ width: '100%', padding: '10px 0',
            background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          로그인으로 돌아가기
        </button>
      </form>
    </div>
  );
}
