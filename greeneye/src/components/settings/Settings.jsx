// src/components/settings/Settings.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LS_SETTINGS = 'greeneye_settings';
const LS_DEVICES  = 'greeneye_devices';

// ▶ 내부 기본값(노출 안 함)
const SNAPSHOT_PATH_DEFAULT = '/api/camera/snapshot';
const REFRESH_SEC_DEFAULT   = 3;

/** 운용 모드 프리셋 (분 단위) */
const MODE_PRESETS = {
  ultra_low:  { label: '초저전력', ccu: 10, sense: 120, capture: 240, days: 40 },
  low:        { label: '저전력',   ccu: 10, sense: 60,  capture: 120, days: 38 },
  normal:     { label: '일반',     ccu: 10, sense: 30,  capture: 60,  days: 34 },
  high:       { label: '고빈도',   ccu: 10, sense: 15,  capture: 60,  days: 32 },
  ultra_high: { label: '초고빈도', ccu: 10, sense: 10,  capture: 30,  days: 30 },
};

const guessMode = (legacyMinutes) => {
  const m = Number(legacyMinutes);
  if (!Number.isFinite(m)) return 'normal';
  if (m >= 90) return 'ultra_low';
  if (m >= 45) return 'low';
  if (m >= 22) return 'normal';
  if (m >= 12) return 'high';
  return 'ultra_high';
};

const DEFAULTS = {
  operationMode: 'normal',
  ccuIntervalMinutes: MODE_PRESETS.normal.ccu,
  sensingIntervalMinutes: MODE_PRESETS.normal.sense,
  captureIntervalMinutes: MODE_PRESETS.normal.capture,

  nightFlashMode: 'always_on',
  cameraTargetDevice: '',
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);

    // 레거시 sensorRefreshMinutes → 모드 추정
    if (parsed.sensorRefreshMinutes && !parsed.operationMode) {
      const mode = guessMode(parsed.sensorRefreshMinutes);
      const p = MODE_PRESETS[mode];
      return {
        ...DEFAULTS,
        ...parsed,
        operationMode: mode,
        ccuIntervalMinutes: p.ccu,
        sensingIntervalMinutes: p.sense,
        captureIntervalMinutes: p.capture,
      };
    }
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings(data) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(data));
}

// URL에 deviceCode 반영
function withDevice(url, deviceCode) {
  if (!deviceCode) return url;
  if (url.includes('{deviceCode}')) return url.replace('{deviceCode}', encodeURIComponent(deviceCode));
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}deviceCode=${encodeURIComponent(deviceCode)}`;
}
const humanizeMin = (m) => (Number(m) % 60 === 0 ? `${Number(m) / 60}h` : `${Number(m) || 0}m`);

export default function Settings() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  // 등록된 기기
  const [devices, setDevices] = useState([]);
  const [loadingDevs, setLoadingDevs] = useState(true);

  // 프리뷰(ON/OFF만)
  const [previewOn, setPreviewOn] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [cacheBust, setCacheBust] = useState(Date.now());
  const timerRef = useRef(null);

  useEffect(() => { setForm(loadSettings()); }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDevs(true);
      try {
        const r = await fetch('/api/devices', { method: 'GET' });
        if (!r.ok) throw new Error('no api');
        const arr = await r.json();
        if (!cancelled) setDevices(Array.isArray(arr) ? arr : []);
      } catch {
        try {
          const local = JSON.parse(localStorage.getItem(LS_DEVICES) || '[]');
          if (!cancelled) setDevices(Array.isArray(local) ? local : []);
        } catch {
          if (!cancelled) setDevices([]);
        }
      } finally {
        if (!cancelled) setLoadingDevs(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const onChange = (e) => setForm(s => ({ ...s, [e.target.name]: e.target.value }));

  const applyMode = (modeKey) => {
    const p = MODE_PRESETS[modeKey] || MODE_PRESETS.normal;
    setForm(s => ({
      ...s,
      operationMode: modeKey,
      ccuIntervalMinutes: p.ccu,
      sensingIntervalMinutes: p.sense,
      captureIntervalMinutes: p.capture,
    }));
  };

  const handleSave = () => {
    const p = MODE_PRESETS[form.operationMode] || MODE_PRESETS.normal;
    const data = {
      operationMode: form.operationMode,
      ccuIntervalMinutes: p.ccu,
      sensingIntervalMinutes: p.sense,
      captureIntervalMinutes: p.capture,
      nightFlashMode: form.nightFlashMode || 'always_on',
      cameraTargetDevice: form.cameraTargetDevice || '',
    };
    saveSettings(data);
    setForm(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const startPreview = () => {
    setPreviewError('');
    if (!form.cameraTargetDevice) { setPreviewError('카메라 대상 기기를 먼저 선택하세요.'); return; }
    setPreviewOn(true);
    stopTimer();
    timerRef.current = setInterval(() => setCacheBust(Date.now()), REFRESH_SEC_DEFAULT * 1000);
  };
  const stopPreview = () => { setPreviewOn(false); setPreviewError(''); stopTimer(); };

  const card = { background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)', padding:16, marginBottom:16, boxSizing:'border-box' };
  const section = (title) => <h3 style={{ margin:'0 0 12px' }}>{title}</h3>;

  const ModeCard = ({ k }) => {
    const p = MODE_PRESETS[k];
    const selected = form.operationMode === k;
    return (
      <button
        type="button"
        onClick={() => applyMode(k)}
        title={`${p.label} / CCU ${humanizeMin(p.ccu)}, 센싱 ${humanizeMin(p.sense)}, 촬영 ${humanizeMin(p.capture)} · ${p.days}일`}
        style={{
          width: '100%',
          textAlign: 'center',
          padding: '12px 12px',
          borderRadius: 10,
          border: selected ? '2px solid #1e40af' : '1px solid #e5e7eb',
          background: '#fff',
          cursor: 'pointer',
          fontWeight: 800,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {p.label}
      </button>
    );
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6' }}>
      <div style={{ width: 820, padding:24, background:'#fff', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop:0 }}>설정</h2>

        {/* 운용 모드 & 플래시 */}
        <div style={card}>
          {section('운용 모드 & 플래시')}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',  // 5개 한 줄
              gap: 16,
              marginBottom: 16
            }}
          >
            {Object.keys(MODE_PRESETS).map(k => <ModeCard key={k} k={k} />)}
          </div>

          {/* 선택된 모드 주기값(읽기 전용 표기) */}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            <div>
              <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>CCU 연동</label>
              <input
                value={humanizeMin(MODE_PRESETS[form.operationMode].ccu)}
                readOnly
                style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#f9fafb' }}
              />
            </div>
            <div>
              <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>센싱 주기</label>
              <input
                value={humanizeMin(MODE_PRESETS[form.operationMode].sense)}
                readOnly
                style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#f9fafb' }}
              />
            </div>
            <div>
              <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>촬영 주기</label>
              <input
                value={humanizeMin(MODE_PRESETS[form.operationMode].capture)}
                readOnly
                style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#f9fafb' }}
              />
            </div>
            <div>
              <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>밤 플래시</label>
              <select name="nightFlashMode" value={form.nightFlashMode} onChange={onChange}
                style={{ width:220, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#fff' }}>
                <option value="always_on">항시 ON</option>
                <option value="always_off">항시 OFF</option>
                <option value="off_night_only">밤에만 OFF</option>
              </select>
            </div>
          </div>
        </div>

        {/* 카메라 대상 선택 */}
        <div style={card}>
          {section('카메라 대상(등록된 사진에서 선택)')}
          {loadingDevs ? (
            <div style={{ color:'#6b7280' }}>등록된 기기를 불러오는 중…</div>
          ) : devices.length === 0 ? (
            <div style={{ color:'#6b7280' }}>등록된 기기가 없습니다. 먼저 “기기 연결”에서 등록하세요.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:12 }}>
              {devices.map((d, i) => {
                const selected = form.cameraTargetDevice === d.deviceCode;
                return (
                  <button key={d.deviceCode || i} onClick={() => setForm(s => ({ ...s, cameraTargetDevice: d.deviceCode }))} style={{
                    padding:8, borderRadius:8, border: selected ? '2px solid #1e40af' : '1px solid #e5e7eb',
                    background:'#fff', textAlign:'left', cursor:'pointer'
                  }}>
                    <div style={{
                      width:'100%', aspectRatio:'16 / 9', background:'#000', borderRadius:6, overflow:'hidden',
                      marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      {d.imageUrl
                        ? <img src={d.imageUrl} alt={d.name || d.deviceCode} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : <span style={{ color:'#9ca3af' }}>이미지 없음</span>}
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{d.name || '이름 없음'}</div>
                    <div style={{ fontFamily:'monospace', fontSize:12, color:'#374151' }}>{d.deviceCode}</div>
                    {selected && <div style={{ marginTop:6, color:'#1e40af', fontSize:12 }}>✅ 선택됨</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 카메라 프리뷰 (ON/OFF만) */}
        <div style={card}>
          {section('카메라 프리뷰')}
          <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
            <button
              onClick={previewOn ? stopPreview : startPreview}
              type="button"
              disabled={!form.cameraTargetDevice}
              style={{
                padding:'8px 12px',
                background: previewOn ? '#dc2626' : '#059669',
                color:'#fff',
                border:'none',
                borderRadius:4,
                cursor: form.cameraTargetDevice ? 'pointer' : 'not-allowed'
              }}
            >
              {previewOn ? '프리뷰 끄기' : '프리뷰 켜기'}
            </button>
            {!form.cameraTargetDevice && (
              <span style={{ color:'#6b7280' }}>카메라 대상 기기를 먼저 선택하세요.</span>
            )}
            <div style={{ flex:1 }} />
            <button onClick={() => navigate(-1)} type="button"
              style={{ padding:'8px 12px', background:'#374151', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
              뒤로
            </button>
            <button onClick={handleSave} type="button"
              style={{ padding:'8px 12px', background:'#1e40af', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
              설정 저장
            </button>
          </div>

          <div style={{
            border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#000',
            aspectRatio:'16 / 9', display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            {!previewOn ? (
              <div style={{ color:'#9ca3af' }}>프리뷰가 꺼져 있습니다.</div>
            ) : (
              (() => {
                const base = withDevice(SNAPSHOT_PATH_DEFAULT, form.cameraTargetDevice);
                const sep  = base.includes('?') ? '&' : '?';
                const src  = `${base}${sep}t=${cacheBust}`;
                return (
                  <img
                    src={src}
                    alt="snapshot"
                    onError={() => setPreviewError('스냅샷을 불러오지 못했습니다. 경로/권한/CORS를 확인하세요.')}
                    style={{ width:'100%', height:'100%', objectFit:'contain' }}
                  />
                );
              })()
            )}
          </div>

          {previewError && <div style={{ color:'#dc2626', marginTop:8 }}>{previewError}</div>}
        </div>

        {saved && <div style={{ color:'#16a34a' }}>설정이 저장되었습니다.</div>}
      </div>
    </div>
  );
}
