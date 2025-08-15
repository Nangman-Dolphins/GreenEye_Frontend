import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ENDPOINT = '/api/devices/link';   // 온라인 등록 시 서버 엔드포인트(확실하지 않음: 환경에 맞게 변경)
const LS_DEVICES = 'greeneye_devices';

// 대/소문자 보존: 앞뒤 공백 + 대괄호만 제거
const normalizeDeviceId = (v) => (v ? String(v).trim().replace(/[\[\]]/g, '') : '');
// 2-2-4 패턴(대/소문자 구별)
const isValidDeviceId = (v) => /^[A-Za-z0-9]{2}-[A-Za-z0-9]{2}-[A-Za-z0-9]{4}$/.test(v);

const ACCEPT_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// 업로드 이미지를 썸네일(DataURL)로 경량화
async function makeThumb(file, maxW = 480, maxH = 360) {
  const dataURL = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataURL;
  });
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.7);
}

// 파일이 없을 때, 장치코드 텍스트로 썸네일 생성
function makeTextThumb(text, w = 480, h = 360) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 배경(그라디언트)
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#1f2937'); // slate-800
  g.addColorStop(1, '#374151'); // slate-700
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 텍스트
  ctx.fillStyle = '#a7f3d0'; // emerald-200
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 48px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(text, w / 2, h / 2);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// 임의(랜덤) 장치코드 생성: 2-2-4 (대/소문자+숫자)
function randomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const pick = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${pick(2)}-${pick(2)}-${pick(4)}`;
}

export default function DeviceLink() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [file, setFile] = useState(null);
  const [thumbDataUrl, setThumbDataUrl] = useState('');
  const [offline, setOffline] = useState(false); // ✅ 오프라인 임의 연결 스위치
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onPickFile = async (e) => {
    setError('');
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPT_TYPES.includes(f.type)) return setError('PNG/JPG/JPEG/WEBP만 허용됩니다.');
    if (f.size > MAX_BYTES) return setError('최대 10MB까지 업로드할 수 있습니다.');
    setFile(f);
    try {
      const thumb = await makeThumb(f);
      setThumbDataUrl(thumb);
    } catch {
      setThumbDataUrl('');
    }
  };

  // 로컬 목록에 upsert
  const upsertLocalDevice = ({ deviceCode, name, imageUrl }) => {
    const list = JSON.parse(localStorage.getItem(LS_DEVICES) || '[]');
    const idx = list.findIndex((d) => d.deviceCode === deviceCode);
    if (idx >= 0) list[idx] = { deviceCode, name, imageUrl };
    else list.push({ deviceCode, name, imageUrl });
    localStorage.setItem(LS_DEVICES, JSON.stringify(list));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('기기 이름을 입력하세요.');
    const deviceCode = normalizeDeviceId(deviceIdInput);
    if (!isValidDeviceId(deviceCode)) {
      return setError('장치 아이디 형식이 올바르지 않습니다. 예) Ge-Sd-6c18  (두글자-두글자-네글자, 대/소문자 구별)');
    }

    // 썸네일 확보(파일 없으면 텍스트로 생성)
    const ensureThumb = async () => {
      if (thumbDataUrl) return thumbDataUrl;
      if (file) {
        try { return await makeThumb(file); } catch { /* fallthrough */ }
      }
      return makeTextThumb(deviceCode);
    };

    // ✅ 오프라인(임의 등록) 모드
    if (offline) {
      const img = await ensureThumb();
      upsertLocalDevice({ deviceCode, name: name.trim(), imageUrl: img });

      alert('오프라인(임의) 기기 등록 완료!');
      return navigate('/dashboard', {
        replace: true,
        state: { addedDevice: { name: name.trim(), deviceCode, imgSrc: img } },
      });
    }

    // 🔗 온라인(서버 전송) 모드 — multipart/form-data
    if (!file) return setError('기기와 묶을 사진을 선택하세요.');

    const formData = new FormData();
    formData.append('name', name.trim());      // ← 서버 필드명에 맞게 필요시 변경
    formData.append('deviceCode', deviceCode); // ← 서버 필드명에 맞게 필요시 변경
    formData.append('photo', file);            // ← 서버 필드명에 맞게 필요시 변경

    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', body: formData });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `등록 실패 (status ${res.status})`);
      }
      let created = null;
      try { created = await res.json(); } catch { /* 응답 스키마 확실하지 않음 */ }

      const img = created?.imageUrl || created?.photoUrl || (await ensureThumb());
      upsertLocalDevice({ deviceCode, name: name.trim(), imageUrl: img });

      alert('기기 연결 및 사진 등록 성공!');
      navigate('/dashboard', {
        replace: true,
        state: { addedDevice: { name: name.trim(), deviceCode, imgSrc: img } },
      });
    } catch (err) {
      setError(err.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6' }}>
      <form onSubmit={handleSubmit}
            style={{ width: 460, padding: 24, background:'#fff', borderRadius: 8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin:'0 0 16px' }}>기기 연결 + 사진 등록</h2>
        <p style={{ marginTop:0, color:'#555' }}>
          장치 아이디(2-2-4, 대/소문자 구별) 예) <code>Ge-Sd-6c18</code>
        </p>

        {error && <div style={{ color:'red', whiteSpace:'pre-line', marginBottom:12 }}>{error}</div>}

        {/* 오프라인 임의 연결 스위치 */}
        <label style={{ display:'flex', alignItems:'center', gap:8, margin:'0 0 12px' }}>
          <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
          <span>오프라인 임의 연결(서버 호출 없이 로컬에 저장)</span>
        </label>

        <label style={{ fontWeight:600 }}>기기 이름</label>
        <input
          type="text" placeholder="예) GreenEye_01" value={name} onChange={(e) => setName(e.target.value)}
          style={{ width:'100%', padding:'10px 12px', margin:'6px 0 12px', border:'1px solid #ccc', borderRadius:4 }}
        />

        <label style={{ fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>장치 아이디 (2-2-4)</span>
          <button type="button" onClick={() => setDeviceIdInput(randomId())}
                  style={{ padding:'4px 8px', border:'1px solid #e5e7eb', background:'#f9fafb', borderRadius:6, cursor:'pointer' }}>
            랜덤 생성
          </button>
        </label>
        <input
          type="text" placeholder="예) Ge-Sd-6c18   또는  [Ge-Sd-6c18]"
          value={deviceIdInput} onChange={(e) => setDeviceIdInput(e.target.value)}
          style={{ width:'100%', padding:'10px 12px', margin:'6px 0 12px', border:'1px solid #ccc', borderRadius:4, fontFamily:'monospace' }}
        />

        {/* 파일 업로드 (오프라인 모드에선 선택 안 해도 됨) */}
        <label style={{ fontWeight:600 }}>
          기기 대표 사진 {offline && <span style={{ color:'#6b7280', fontWeight:400 }}>(선택)</span>}
        </label>
        <input type="file" accept={ACCEPT_TYPES.join(',')} onChange={onPickFile}
               style={{ display:'block', margin:'6px 0 12px' }} />
        <div style={{ border:'1px solid #e5e7eb', borderRadius:8, background:'#000', aspectRatio:'16 / 9', marginBottom:16,
                      overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {thumbDataUrl
            ? <img src={thumbDataUrl} alt="preview" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            : <div style={{ color:'#9ca3af' }}>{offline ? '파일 선택이 없어도 임의 등록 가능' : '선택된 이미지가 없습니다.'}</div>}
        </div>

        <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'12px 0', background:loading?'#93c5fd':'#1e40af', color:'#fff',
                         border:'none', borderRadius:4, cursor:'pointer', marginBottom:10 }}>
          {loading ? '등록 중…' : (offline ? '오프라인 임의 등록' : '기기 등록')}
        </button>

        <button type="button" onClick={() => history.back()}
                style={{ width:'100%', padding:'10px 0', background:'#e5e7eb', color:'#111827',
                         border:'none', borderRadius:4, cursor:'pointer' }}>
          돌아가기
        </button>
      </form>
    </div>
  );
}
