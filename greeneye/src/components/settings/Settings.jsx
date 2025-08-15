import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LS_SETTINGS = 'greeneye_settings';
const LS_DEVICES  = 'greeneye_devices';

const DEFAULTS = {
  sensorRefreshMinutes: 5,
  nightFlashMode: 'always_on', // always_on | always_off | off_night_only
  cameraPreviewMode: 'snapshot',             // snapshot | mjpeg
  cameraSnapshotPath: '/api/camera/snapshot',
  cameraStreamPath:  '/api/camera/stream',
  snapshotIntervalSec: 3,
  cameraTargetDevice: '', // 선택된 deviceCode
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return { ...DEFAULTS }; }
}
function saveSettings(data) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(data));
}

// URL에 deviceCode 반영: /path/{deviceCode} 또는 /path?deviceCode=...
function withDevice(url, deviceCode) {
  if (!deviceCode) return url;
  if (url.includes('{deviceCode}')) return url.replace('{deviceCode}', encodeURIComponent(deviceCode));
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}deviceCode=${encodeURIComponent(deviceCode)}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  // 등록된 기기 목록 (썸네일 포함)
  const [devices, setDevices] = useState([]); // [{deviceCode, name, imageUrl}]
  const [loadingDevs, setLoadingDevs] = useState(true);

  // 프리뷰 상태
  const [previewOn, setPreviewOn] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [cacheBust, setCacheBust] = useState(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    setForm(loadSettings());
  }, []);

  // 등록된 기기 목록 로드: 서버가 있으면 /api/devices, 실패시 로컬 fallback
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingDevs(true);
      try {
        const r = await fetch('/api/devices', { method: 'GET' });
        if (!r.ok) throw new Error('no api');
        const arr = await r.json(); // 확실하지 않음: [{deviceCode,name,imageUrl}] 가정
        if (!cancelled) setDevices(Array.isArray(arr) ? arr : []);
      } catch {
        // 로컬 fallback
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

  // 숫자 입력
  const onChangeNumber = (e) => {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value.replace(/[^\d]/g, '') }));
  };
  // 일반 입력
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(s => ({ ...s, [name]: value }));
  };

  const handleSave = () => {
    let minutes = parseInt(form.sensorRefreshMinutes, 10);
    if (Number.isNaN(minutes) || minutes <= 0) minutes = DEFAULTS.sensorRefreshMinutes;
    if (minutes > 1440) minutes = 1440;

    let sec = parseInt(form.snapshotIntervalSec, 10);
    if (Number.isNaN(sec) || sec <= 0) sec = DEFAULTS.snapshotIntervalSec;
    if (sec > 60) sec = 60;

    const data = {
      sensorRefreshMinutes: minutes,
      nightFlashMode: form.nightFlashMode || DEFAULTS.nightFlashMode,
      cameraPreviewMode: form.cameraPreviewMode || DEFAULTS.cameraPreviewMode,
      cameraSnapshotPath: (form.cameraSnapshotPath || DEFAULTS.cameraSnapshotPath).trim(),
      cameraStreamPath:  (form.cameraStreamPath  || DEFAULTS.cameraStreamPath).trim(),
      snapshotIntervalSec: sec,
      cameraTargetDevice: form.cameraTargetDevice || '',
    };
    saveSettings(data);
    setForm(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // 프리뷰 제어
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const startPreview = () => {
    setPreviewError('');
    if (!form.cameraTargetDevice) {
      setPreviewError('카메라 대상 기기를 먼저 선택하세요.');
      return;
    }
    setPreviewOn(true);
    if (form.cameraPreviewMode === 'snapshot') {
      stopTimer();
      const sec = Math.max(1, Number(form.snapshotIntervalSec) || DEFAULTS.snapshotIntervalSec);
      timerRef.current = setInterval(() => setCacheBust(Date.now()), sec * 1000);
    } else {
      stopTimer();
    }
  };
  const stopPreview = () => { setPreviewOn(false); setPreviewError(''); stopTimer(); };

  // 스타일
  const card = { background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)', padding:16, marginBottom:16, boxSizing:'border-box' };
  const section = (title) => <h3 style={{ margin:'0 0 12px' }}>{title}</h3>;

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6' }}>
      <div style={{ width: 820, padding:24, background:'#fff', borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop:0 }}>설정</h2>

        {/* 센서 & 플래시 */}
        <div style={card}>
          {section('센서 & 플래시')}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            <div>
              <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>센서 갱신 간격(분)</label>
              <input name="sensorRefreshMinutes" type="text" inputMode="numeric"
                value={form.sensorRefreshMinutes} onChange={onChangeNumber}
                style={{ width:140, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4 }} />
              <div style={{ color:'#6b7280', fontSize:12, marginTop:6 }}>1~1440분 권장</div>
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

        {/* 카메라 대상 선택 (등록된 사진) */}
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
                  <button key={d.deviceCode || i} onClick={() => setForm(s => ({ ...s, cameraTargetDevice: d.deviceCode }))}
                    style={{
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

        {/* 카메라 프리뷰 */}
        <div style={card}>
          {section('카메라 프리뷰')}
          <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:12 }}>
            <div>
              <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>프리뷰 모드</label>
              <select name="cameraPreviewMode" value={form.cameraPreviewMode} onChange={onChange}
                style={{ width:180, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4, background:'#fff' }}>
                <option value="snapshot">스냅샷(주기 갱신)</option>
                <option value="mjpeg">스트림(MJPEG)</option>
              </select>
            </div>
            {form.cameraPreviewMode === 'snapshot' ? (
              <>
                <div>
                  <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>스냅샷 경로</label>
                  <input name="cameraSnapshotPath" type="text" value={form.cameraSnapshotPath} onChange={onChange}
                    placeholder="/api/camera/snapshot 또는 /api/camera/{deviceCode}/snapshot"
                    style={{ width:320, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4 }} />
                  <div style={{ color:'#6b7280', fontSize:12, marginTop:6 }}>
                    경로에 <code>{'{deviceCode}'}</code>를 넣으면 자동 치환. 없으면 <code>?deviceCode=</code>가 붙습니다.
                  </div>
                </div>
                <div>
                  <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>갱신 주기(초)</label>
                  <input name="snapshotIntervalSec" type="text" inputMode="numeric" value={form.snapshotIntervalSec} onChange={onChange}
                    style={{ width:120, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4 }} />
                </div>
              </>
            ) : (
              <div>
                <label style={{ fontWeight:600, display:'block', marginBottom:6 }}>스트림 경로(MJPEG)</label>
                <input name="cameraStreamPath" type="text" value={form.cameraStreamPath} onChange={onChange}
                  placeholder="/api/camera/stream 또는 /api/camera/{deviceCode}/stream"
                  style={{ width:320, padding:'10px 12px', border:'1px solid #ccc', borderRadius:4 }} />
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <button onClick={handleSave} type="button"
              style={{ padding:'8px 12px', background:'#1e40af', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
              설정 저장
            </button>
            {!previewOn ? (
              <button onClick={startPreview} type="button"
                style={{ padding:'8px 12px', background:'#059669', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
                프리뷰 시작
              </button>
            ) : (
              <button onClick={stopPreview} type="button"
                style={{ padding:'8px 12px', background:'#dc2626', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
                프리뷰 정지
              </button>
            )}
            <div style={{ flex:1 }} />
            <button onClick={() => navigate(-1)} type="button"
              style={{ padding:'8px 12px', background:'#374151', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
              뒤로
            </button>
          </div>

          <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#000',
                        aspectRatio:'16 / 9', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {!previewOn ? (
              <div style={{ color:'#9ca3af' }}>프리뷰가 꺼져 있습니다.</div>
            ) : form.cameraPreviewMode === 'snapshot' ? (
              <img
                src={withDevice(form.cameraSnapshotPath, form.cameraTargetDevice) + `&t=${cacheBust}`}
                alt="snapshot"
                onError={() => setPreviewError('스냅샷을 불러오지 못했습니다. 경로/권한/CORS를 확인하세요.')}
                style={{ width:'100%', height:'100%', objectFit:'contain' }}
              />
            ) : (
              <img
                src={withDevice(form.cameraStreamPath, form.cameraTargetDevice)}
                alt="mjpeg-stream"
                onError={() => setPreviewError('스트림을 불러오지 못했습니다. 경로/권한/CORS를 확인하세요.')}
                style={{ width:'100%', height:'100%', objectFit:'contain' }}
              />
            )}
          </div>

          {previewError && <div style={{ color:'#dc2626', marginTop:8 }}>{previewError}</div>}
        </div>

        {saved && <div style={{ color:'#16a34a' }}>설정이 저장되었습니다.</div>}
      </div>
    </div>
  );
}
