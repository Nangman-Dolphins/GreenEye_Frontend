import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEVICE_LINK_ENDPOINT = '/api/devices/link'; // 상대 경로 호출

// 대/소문자 보존: 앞뒤 공백, 대괄호만 제거
const normalizeDeviceId = (v) => {
  if (!v) return '';
  let s = String(v).trim();
  s = s.replace(/[\[\]]/g, '');
  return s;
};
// 2-2-4 패턴 (대/소문자 구별)
const isValidDeviceId = (v) => /^[A-Za-z0-9]{2}-[A-Za-z0-9]{2}-[A-Za-z0-9]{4}$/.test(v);

export default function DeviceLink() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('기기 이름을 입력하세요.');

    const deviceId = normalizeDeviceId(deviceIdInput);
    if (!isValidDeviceId(deviceId)) {
      return setError('식별자 형식이 올바르지 않습니다. 예) Ge-Sd-6c18  (두글자-두글자-네글자, 대/소문자 구별)');
    }

    setLoading(true);
    try {
      const res = await fetch(DEVICE_LINK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 입력한 원본 그대로 서버로 전송
        body: JSON.stringify({ name: name.trim(), deviceCode: deviceId }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `등록 실패 (status ${res.status})`);
      }
      alert('기기 등록 성공!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || '기기 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f3f4f6'
    }}>
      <form onSubmit={handleSubmit} style={{
        width: 380, padding: 24, background: '#fff', borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)', boxSizing: 'border-box'
      }}>
        <h2 style={{ margin: '0 0 16px' }}>기기 연결</h2>
        <p style={{ marginTop: 0, color: '#555' }}>
          장치 아이디 형식: <b>두글자-두글자-네글자</b> (대/소문자 보존) 예) <code>Ge-Sd-6c18</code>
        </p>

        {error && <div style={{ color: 'red', whiteSpace: 'pre-line', marginBottom: 12 }}>{error}</div>}

        <label style={{ fontWeight: 600 }}>기기 이름</label>
        <input
          type="text" placeholder="예) GreenEye_01"
          value={name} onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            margin: '6px 0 12px', border: '1px solid #ccc', borderRadius: 4 }}
        />

        <label style={{ fontWeight: 600 }}>장치 아이디 (2-2-4)</label>
        <input
          type="text" placeholder="예) Ge-Sd-6c18   또는  [Ge-Sd-6c18]"
          value={deviceIdInput} onChange={(e) => setDeviceIdInput(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px',
            margin: '6px 0 20px', border: '1px solid #ccc', borderRadius: 4, fontFamily: 'monospace' }}
        />

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px 0', background: loading ? '#93c5fd' : '#1e40af',
            color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginBottom: 10 }}>
          {loading ? '등록 중…' : '기기 등록'}
        </button>

        <button type="button" onClick={() => history.back()}
          style={{ width: '100%', padding: '10px 0', background: '#e5e7eb', color: '#111827',
            border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          돌아가기
        </button>
      </form>
    </div>
  );
}
