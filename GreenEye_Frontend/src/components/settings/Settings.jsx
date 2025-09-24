// src/components/settings/Settings.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const LS_SETTINGS = 'greeneye_settings';
const MODE_PRESETS = {
  ultra_low:  { label: '초저전력', ccu: 10, sense: 120, capture: 240, days: 40 },
  low:        { label: '저전력',   ccu: 10, sense: 60,  capture: 120, days: 38 },
  normal:     { label: '일반',     ccu: 10, sense: 30,  capture: 60,  days: 34 },
  high:       { label: '고빈도',   ccu: 10, sense: 15,  capture: 60,  days: 32 },
  ultra_high: { label: '초고빈도', ccu: 10, sense: 10,  capture: 30,  days: 30 },
};

const hashStr = (str) => { let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0).toString(36); };
const userKeyFromToken = (t) => (t ? hashStr(String(t)) : 'guest');
const thumbsKeyForUser  = (t) => `greeneye_thumbs:${userKeyFromToken(t)}`;
const metaKeyForUser    = (t) => `greeneye_meta:${userKeyFromToken(t)}`;
const clientDevsKeyForUser = (t) => `greeneye_client_devices:${userKeyFromToken(t)}`;
const readThumbs = (t) => { try { return JSON.parse(localStorage.getItem(thumbsKeyForUser(t)) || '{}'); } catch { return {}; } };
const readMeta   = (t) => { try { return JSON.parse(localStorage.getItem(metaKeyForUser(t))   || '{}'); } catch { return {}; } };
const readClientDevs = (t) => { try { return JSON.parse(localStorage.getItem(clientDevsKeyForUser(t)) || '[]'); } catch { return []; } };
const alnum = (s) => String(s ?? '').toLowerCase().replace(/[^0-9a-z]/g, '');
const last4 = (s) => alnum(s).slice(-4);
const canonical = (s) => (/^[0-9a-f]{4}$/.test(last4(s)) ? `ge-sd-${last4(s)}` : alnum(s));

const DEFAULTS = {
  operationMode: 'normal',
  ccuIntervalMinutes: MODE_PRESETS.normal.ccu,
  sensingIntervalMinutes: MODE_PRESETS.normal.sense,
  captureIntervalMinutes: MODE_PRESETS.normal.capture,
  nightMode: 'night_on',
  cameraTargetDevice: '',
};

const normDevice = (x = {}) => {
  const raw = String(x.deviceCode ?? x.device_id ?? x.device_code ?? x.mac ?? '').trim();
  const code = canonical(raw);
  return {
    deviceCode: code,
    rawCode: raw || code,
    name: x.name ?? x.friendly_name ?? code,
    imageUrl: x.device_image ?? '',
    room: x.room ?? '',
    species: x.plant_type ?? '',
  };
};

function loadSettings() { try { const raw=localStorage.getItem(LS_SETTINGS); return raw?JSON.parse(raw):{...DEFAULTS}; } catch { return { ...DEFAULTS }; } }
function saveSettings(data) { localStorage.setItem(LS_SETTINGS, JSON.stringify(data)); window.dispatchEvent(new CustomEvent('greeneye:settings-updated')); }
const humanizeMin = (m) => (Number(m) % 60 === 0 ? `${Number(m) / 60}h` : `${Number(m) || 0}m`);

const deviceIdForApi = (code) => {
  const m = String(code || '').match(/([0-9a-fA-F]{4})$/);
  return m ? m[1].toLowerCase() : '';
};

export default function Settings() {
  const navigate = useNavigate();
  const { authFetch, token } = useContext(AuthContext) || {};
  const [form, setForm] = useState(loadSettings());
  const [saved, setSaved] = useState(false);

  const [devices, setDevices] = useState([]);
  const [loadingDevs, setLoadingDevs] = useState(true);

  // ===== 이메일 수신 동의 =====
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving]   = useState(false);
  const [consentServer, setConsentServer]   = useState(false);
  const [consentUI, setConsentUI]           = useState(false);
  const [consentErr, setConsentErr]         = useState('');
  const consentDirty = consentUI !== consentServer;

  useEffect(() => {
    let alive = true;
    (async () => {
      setConsentLoading(true);
      setConsentErr('');
      try {
        const res = await authFetch('/api/user/email-consent', { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        const v = !!j?.email_consent;
        if (alive) { setConsentServer(v); setConsentUI(v); }
      } catch (e) { if (alive) setConsentErr('현재 동의 상태를 불러오지 못했습니다.'); }
      finally { if (alive) setConsentLoading(false); }
    })();
    return () => { alive = false; };
  }, [authFetch]);

  const onConfirmConsent = async () => {
    setConsentSaving(true);
    setConsentErr('');
    try {
      const res = await authFetch('/api/user/email-consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_consent: consentUI }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`; try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const j = await res.json(); const saved = !!j?.email_consent;
      setConsentServer(saved); setConsentUI(saved);
    } catch (e) { setConsentErr(e.message || '저장 실패'); }
    finally { setConsentSaving(false); }
  };
  // ===== /이메일 수신 동의 =====

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDevs(true);
      try {
        const r = await authFetch('/api/devices', { cache: 'no-store' });
        const arr = r.ok ? (await r.json()) : [];
        const api = Array.isArray(arr) ? arr.map(normDevice) : [];
        const tmap = readThumbs(token);
        const mmap = readMeta(token);
        const map = new Map();
        [...api].forEach(d => {
          const prev = map.get(d.deviceCode) || {};
          map.set(d.deviceCode, {
            ...prev, ...d,
            imageUrl: tmap[d.deviceCode] ?? d.imageUrl ?? prev.imageUrl,
            species: (mmap[d.deviceCode]?.species ?? d.species ?? prev.species),
            room:    (mmap[d.deviceCode]?.room    ?? d.room    ?? prev.room),
          });
        });
        setDevices([...map.values()]);
      } catch {
        if (!cancelled) setDevices(readClientDevs(token).map(normDevice));
      } finally {
        if (!cancelled) setLoadingDevs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authFetch, token]);

  useEffect(() => {
    const onStorage = (e) => {
      const keys = [thumbsKeyForUser(token), metaKeyForUser(token), clientDevsKeyForUser(token)];
      if (keys.includes(e.key)) {
        (async () => {
          const r = await authFetch('/api/devices', { cache: 'no-store' }).catch(()=>null);
          const arr = r && r.ok ? (await r.json()) : [];
          const api = Array.isArray(arr) ? arr.map(normDevice) : [];
          const locals = readClientDevs(token).map(normDevice);
          const tmap = readThumbs(token);
          const mmap = readMeta(token);
          const map = new Map();
          [...locals, ...api].forEach(d => {
            const prev = map.get(d.deviceCode) || {};
            map.set(d.deviceCode, {
              ...prev, ...d,
              imageUrl: tmap[d.deviceCode] ?? d.imageUrl ?? prev.imageUrl,
              species: (mmap[d.deviceCode]?.species ?? d.species ?? prev.species),
              room:    (mmap[d.deviceCode]?.room    ?? d.room    ?? prev.room),
            });
          });
          setDevices([...map.values()]);
        })();
      }
    };
    const onCustom = () => onStorage({ key: clientDevsKeyForUser(token) });
    window.addEventListener('storage', onStorage);
    window.addEventListener('greeneye:client-devices-updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('greeneye:client-devices-updated', onCustom);
    };
  }, [authFetch, token]);

  const onChange = (e) => setForm(s => ({ ...s, [e.target.name]: e.target.value }));
  const applyMode = (k) => { const p = MODE_PRESETS[k] || MODE_PRESETS.normal; setForm(s => ({ ...s, operationMode:k, ccuIntervalMinutes:p.ccu, sensingIntervalMinutes:p.sense, captureIntervalMinutes:p.capture })); };

  const handleSave = async () => {
    const p = MODE_PRESETS[form.operationMode] || MODE_PRESETS.normal;
    const data = {
      operationMode: form.operationMode,
      ccuIntervalMinutes: p.ccu,
      sensingIntervalMinutes: p.sense,
      captureIntervalMinutes: p.capture,
      nightMode: form.nightMode || 'night_on',
      cameraTargetDevice: form.cameraTargetDevice || '',
    };
    saveSettings(data);
    setForm(data);
    setSaved(true);
    try {
      const devId = deviceIdForApi(data.cameraTargetDevice);
      if (!devId) return;
      const payload = { mode: data.operationMode, night_option: data.nightMode };
      const res = await authFetch(`/api/control_mode/${devId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`; try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
    } catch (e) {
      alert(`서버 적용 실패: ${e.message || e}`);
    } finally {
      setTimeout(()=>setSaved(false), 1200);
    }
  };

  const card = { background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)', padding:16, marginBottom:16 };
  const section = (title) => <h3 style={{ margin:'0 0 12px' }}>{title}</h3>;
  const humanize = (m) => humanizeMin(m);
  const ModeCard = ({ k }) => { const p = MODE_PRESETS[k]; const selected = form.operationMode === k;
    return (
      <button type="button" onClick={()=>applyMode(k)}
        title={`${p.label} / CCU ${humanize(p.ccu)}, 센싱 ${humanize(p.sense)}, 촬영 ${humanize(p.capture)} · ${p.days}일`}
        style={{ width:'100%', textAlign:'center', padding:'12px', borderRadius:10,
                 border:selected?'2px solid #1e40af':'1px solid #e5e7eb', background:'#fff',
                 cursor:'pointer', fontWeight:800 }}>
        {p.label}
      </button>
    );
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--ge-bg)' }}>
      <div style={{ width: 820, padding:24, background:'#fff', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
        
        {/* 상단 헤더: 제목 + 뒤로 (설정 저장 버튼은 아래 카드로 이동) */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <h2 style={{ margin:0 }}>설정</h2>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding:'8px 12px', borderRadius:8,
              border:'1px solid #374151', background:'#374151',
              color:'#fff', fontWeight:700
            }}
          >
            뒤로
          </button>
        </div>

        {/* 섹션 A — PDF 이메일 수신 동의 */}
        <div style={card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontSize:16, fontWeight:700 }}>PDF 이메일 수신 동의</div>
            <button
              type="button"
              onClick={onConfirmConsent}
              disabled={consentLoading || consentSaving || !consentDirty}
              style={{
                padding:'8px 12px', borderRadius:8,
                border:'1px solid #1e40af',
                background:(consentLoading || consentSaving || !consentDirty) ? '#93c5fd' : '#1e40af',
                color:'#fff', fontWeight:700, cursor:(consentLoading || consentSaving || !consentDirty)?'not-allowed':'pointer'
              }}
            >
              확인
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <label style={{ display:'inline-flex', alignItems:'center', gap:8, cursor:(consentLoading||consentSaving)?'not-allowed':'pointer' }}>
              <input type="checkbox" checked={consentUI} disabled={consentLoading || consentSaving}
                     onChange={(e)=>setConsentUI(e.target.checked)} />
              <span>{consentUI ? '동의' : '미동의'}</span>
            </label>
            <span title="서버에 저장된 현재 상태" style={{
              padding:'2px 10px', borderRadius:999,
              background: consentServer ? '#dcfce7' : '#f3f4f6',
              border: '1px solid ' + (consentServer ? '#86efac' : '#e5e7eb'),
              fontSize:12, fontWeight:800
            }}>
              서버: {consentServer ? '동의' : '미동의'}
            </span>
            {consentLoading && <span style={{ fontSize:12, color:'#6b7280' }}>불러오는 중…</span>}
            {consentSaving && <span style={{ fontSize:12, color:'#6b7280' }}>저장 중…</span>}
            {consentErr && <span style={{ fontSize:12, color:'#b91c1c' }}>{consentErr}</span>}
            {consentDirty && !consentSaving && !consentLoading && !consentErr && (
              <span style={{ fontSize:12, color:'#1f2937' }}>변경 사항 있음 → [확인]을 눌러 저장</span>
            )}
          </div>
        </div>

        {/* 섹션 B — 운용 모드 & 플래시 (여기에 '설정 저장' 버튼을 우측 상단으로 이동) */}
        <div style={card}>
          {/* 제목 + 설정 저장 버튼 라인 */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
            {section('운용 모드 & 플래시')}
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding:'8px 12px', borderRadius:8,
                border:'1px solid #1d4ed8', background:'#1d4ed8',
                color:'#fff', fontWeight:700
              }}
            >
              설정 저장
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:16, marginBottom:16 }}>
            {Object.keys(MODE_PRESETS).map(k => <ModeCard key={k} k={k} />)}
          </div>

          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            <div><label style={{ fontWeight:600, display:'block', marginBottom:6 }}>CCU 연동</label>
              <input value={humanize(MODE_PRESETS[form.operationMode].ccu)} readOnly style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#f9fafb' }}/></div>
            <div><label style={{ fontWeight:600, display:'block', marginBottom:6 }}>센싱 주기</label>
              <input value={humanize(MODE_PRESETS[form.operationMode].sense)} readOnly style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#f9fafb' }}/></div>
            <div><label style={{ fontWeight:600, display:'block', marginBottom:6 }}>촬영 주기</label>
              <input value={humanize(MODE_PRESETS[form.operationMode].capture)} readOnly style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#f9fafb' }}/></div>
            <div><label style={{ fontWeight:600, display:'block', marginBottom:6 }}>야간 모드</label>
              <select name="nightMode" value={form.nightMode} onChange={onChange}
                      style={{ width:220, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#fff' }}>
                <option value="night_on">ON</option>
                <option value="night_off">OFF</option>
              </select></div>
          </div>
        </div>

        {/* 섹션 C — 카메라 대상 */}
        <div style={card}>
          {section('카메라 대상(등록된 사진에서 선택)')}
          {loadingDevs ? (<div style={{ color:'#6b7280' }}>등록된 기기를 불러오는 중…</div>) :
           devices.length === 0 ? (<div style={{ color:'#6b7280' }}>등록된 기기가 없습니다. 먼저 “기기 연결”에서 등록하세요.</div>) :
           (<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 }}>
              {devices.map((d, i) => {
                const selected = form.cameraTargetDevice === d.deviceCode;
                return (
                  <button key={d.deviceCode || i} onClick={() => setForm(s => ({ ...s, cameraTargetDevice: d.deviceCode }))}
                          style={{ padding:8, borderRadius:8, border: selected ? '2px solid #1e40af' : '1px solid #e5e7eb', background:'#fff', textAlign:'left', cursor:'pointer' }}>
                    <div style={{ width:'100%', aspectRatio:'16/9', background:'#000', borderRadius:6, overflow:'hidden', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {d.imageUrl ? <img src={d.imageUrl} alt={d.name || d.deviceCode} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                                 : <span style={{ color:'#9ca3af' }}>이미지 없음</span>}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{d.name || '이름 없음'}</div>
                    <div style={{ fontFamily:'monospace', fontSize:12, color:'#374151' }}>{d.deviceCode}</div>
                    {d.species && <div style={{ marginTop:4, fontSize:12, color:'#6b7280' }}>{d.species}</div>}
                    {selected && <div style={{ marginTop:6, color:'#1e40af', fontSize:12 }}>✅ 선택됨</div>}
                  </button>
                );
              })}
            </div>)}
        </div>

        {saved && <div style={{ color:'#16a34a' }}>설정이 저장되었습니다.</div>}
      </div>
    </div>
  );
}
