// src/components/settings/EmailConsentRow.jsx
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function EmailConsentRow() {
  const { authFetch } = useContext(AuthContext) || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverValue, setServerValue] = useState(false);   // 서버 저장 값
  const [uiValue, setUiValue] = useState(false);           // 체크박스 UI 값
  const [err, setErr] = useState('');
  const dirty = uiValue !== serverValue;

  // 초기 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await authFetch('/api/user/email-consent', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (alive) {
          const v = !!j?.email_consent;
          setServerValue(v);
          setUiValue(v);
        }
      } catch (e) {
        if (alive) setErr('현재 동의 상태를 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [authFetch]);

  // 저장
  const onConfirm = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await authFetch('/api/user/email-consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_consent: uiValue }),
      });
      if (!res.ok) {
        let msg = `저장 실패 (HTTP ${res.status})`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const j = await res.json();
      const saved = !!j?.email_consent;
      setServerValue(saved);
      // uiValue는 그대로(optimistic) — 서버가 다른 값 주면 동기화
      setUiValue(saved);
    } catch (e) {
      setErr(e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:16, marginBottom:16 }}>
      {/* 타이틀 라인 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:16, fontWeight:700 }}>PDF 이메일 수신 동의</div>
        <button
          onClick={onConfirm}
          disabled={loading || saving || !dirty}
          style={{
            padding:'8px 12px', borderRadius:8, border:'1px solid #1e40af',
            background:(loading||saving||!dirty)?'#93c5fd':'#1e40af', color:'#fff', cursor:(loading||saving||!dirty)?'not-allowed':'pointer'
          }}
        >
          확인
        </button>
      </div>

      {/* 본문: 체크박스 + 상태 */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <label style={{ display:'inline-flex', alignItems:'center', gap:8, cursor:(loading||saving)?'not-allowed':'pointer' }}>
          <input
            type="checkbox"
            checked={uiValue}
            disabled={loading || saving}
            onChange={(e) => setUiValue(e.target.checked)}
          />
          <span>{uiValue ? '동의' : '미동의'}</span>
        </label>

        {/* 상태 배지 */}
        <span
          title="서버에 저장된 현재 상태"
          style={{
            marginLeft:8, padding:'2px 8px', borderRadius:999,
            background: serverValue ? '#dcfce7' : '#f3f4f6',
            border: '1px solid ' + (serverValue ? '#86efac' : '#e5e7eb'),
            fontSize:12, fontWeight:700
          }}
        >
          서버: {serverValue ? '동의' : '미동의'}
        </span>

        {/* 진행/오류 */}
        {loading && <span style={{ marginLeft:6, fontSize:12, color:'#6b7280' }}>불러오는 중…</span>}
        {saving && <span style={{ marginLeft:6, fontSize:12, color:'#6b7280' }}>저장 중…</span>}
        {err && <span style={{ marginLeft:6, fontSize:12, color:'#b91c1c' }}>{err}</span>}
        {dirty && !saving && !loading && !err && (
          <span style={{ marginLeft:6, fontSize:12, color:'#1f2937' }}>변경 사항 있음 → 확인을 눌러 저장</span>
        )}
      </div>
    </div>
  );
}
