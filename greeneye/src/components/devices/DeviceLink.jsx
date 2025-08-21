// src/components/devices/DeviceLink.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ENDPOINT   = '/api/register_device';   // 백엔드에서 mac_address=00_00_0000 포맷으로 받을 예정
const LS_DEVICES = 'greeneye_devices';

// ✅ 엑셀 원본 74개 하드코딩
const SPECIES_74 = [
  "팬지 / 삼색제비꽃 (Pansy)","비올라 (Viola)","메리골드 / 금잔화 (Calendula)","코스모스 (Cosmos)","백일홍 (Zinnia)","봉선화 (Impatiens)","나팔꽃 (Morning glory)","샐비어 / 깨꽃 (Salvia)","루드베키아 (Rudbeckia)","페튜니아 (Petunia)","데이지 (Bellis perennis)","스위트앨리섬 (Sweet alyssum)","스토크 (Stock)","시클라멘 (Cyclamen)","호스타 (Hosta)","제라늄 (Geranium)","애기범부채 (Iris domestica)","가자니아 (Gazania)","라벤더 (Lavender)","에키나시아 (Echinacea)","장미 (Rose)","수국 (Hydrangea)","영산홍/철쭉 (Royal Azalea)","목련 (Magnolia)","무궁화 (Hibiscus syriacus)","라일락 (Lilac)","유채나무 (Forsythia)","진달래 (Rhododendron)","칼리카르파 (Callicarpa)","개나리 (Forsythia koreana)","안스리움 (Anthurium)","베고니아 (Begonia)","아젤리아 (Azalea in pots)","파키라 (Pachira)","드라세나 (Dracaena)","거베라 (Gerbera)","알스트로메리아 (Alstroemeria)","선인장류 (Cactus family)","알로에 (Aloe)","에케베리아 (Echeveria)","하월시아 (Haworthia)","세덤 / 돌나물 (Sedum)","칼랑코에 (Kalanchoe)","튤립 (Tulip)","수선화 (Narcissus)","히야신스 (Hyacinth)","프리지아 (Freesia)","글라디올러스 (Gladiolus)","아마릴리스 (Amaryllis)","크로커스 (Crocus)","다알리아 (Dahlia)","칼라 (Zantedeschia)","국화 (Chrysanthemum)","백합 (Lily)","카네이션 (Carnation)","해바라기 (Sunflower)","스파티필룸 (Spathiphyllum)","아글라오네마 (Aglaonema)","디펜바키아 (Dieffenbachia)","몬스테라 (Monstera)","산세베리아 (Sansevieria)","테이블야자 (Parlor palm)","페페로미아 (Peperomia)","벵갈고무나무 (Ficus elastica)","싱고니움 (Syngonium)","칼라디움 (Caladium)","바질 (Basil)","로즈마리 (Rosemary)","타임 / 벼룩이자리 (Thyme)","오레가노 (Oregano)","민트 / 배초향 (Korean Mint)","라벤더 (Lavender)","카모마일 / 카밀레 (Chamomile)","안개꽃 (Gypsophila)"
];

const ACCEPT_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

// 공통 필드 스타일
const fieldStyle = { width:'100%', boxSizing:'border-box', padding:'10px 12px', margin:'6px 0 12px', border:'1px solid #ccc', borderRadius:4 };

/**
 * 입력을 어떤 형태든 받아 2-2-4 언더바 포맷으로 정규화.
 * - 대/소문자/숫자 구분 유지 (변경하지 않음)
 * - 허용 예: Ge_Sd_6c18 / Ge-Sd-6c18 / [Ge_Sd_6c18] / GeSd6c18
 */
function normalizeMac224(raw) {
  let v = String(raw ?? '').trim();
  v = v.replace(/[\[\]\s]/g, '');   // 대괄호/공백 제거
  v = v.replace(/[-:]/g, '_');      // 하이픈/콜론 → 언더바
  // 이미 2-2-4면 통과
  if (/^[A-Za-z0-9]{2}_[A-Za-z0-9]{2}_[A-Za-z0-9]{4}$/.test(v)) return v;
  // 그 외는 영숫자만 모아서 8자이면 2-2-4로 끼워넣기
  const alnum = v.replace(/[^A-Za-z0-9]/g, '');
  if (alnum.length === 8) return `${alnum.slice(0,2)}_${alnum.slice(2,4)}_${alnum.slice(4,8)}`;
  // 실패 시 원본 반환(유효성 검사에서 걸러짐)
  return v;
}
const isValidMac224 = (v) => /^[A-Za-z0-9]{2}_[A-Za-z0-9]{2}_[A-Za-z0-9]{4}$/.test(v || '');

async function makeThumb(file, maxW = 480, maxH = 360) {
  const dataURL = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=dataURL; });
  const scale = Math.min(maxW/img.width, maxH/img.height, 1);
  const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
  const c = document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
  return c.toDataURL('image/jpeg', 0.7);
}
function makeTextThumb(text, w=480, h=360) {
  const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,w,h); g.addColorStop(0,'#1f2937'); g.addColorStop(1,'#374151'); x.fillStyle=g; x.fillRect(0,0,w,h);
  x.fillStyle='#a7f3d0'; x.textAlign='center'; x.textBaseline='middle'; x.font='bold 48px ui-monospace, SFMono-Regular, Menlo, monospace'; x.fillText(text,w/2,h/2);
  return c.toDataURL('image/jpeg', 0.9);
}

export default function DeviceLink() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [macInput, setMacInput] = useState('');  // 사용자가 입력하는 원문
  const [room, setRoom] = useState('');
  const [species, setSpecies] = useState('');
  const [file, setFile] = useState(null);
  const [thumbDataUrl, setThumbDataUrl] = useState('');
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onPickFile = async (e) => {
    setError('');
    const f = e.target.files?.[0]; if (!f) return;
    if (!ACCEPT_TYPES.includes(f.type)) return setError('PNG/JPG/JPEG/WEBP만 허용됩니다.');
    if (f.size > MAX_BYTES) return setError('최대 10MB까지 업로드할 수 있습니다.');
    setFile(f);
    try { setThumbDataUrl(await makeThumb(f)); } catch { setThumbDataUrl(''); }
  };

  // 로컬 upsert(방/식물종 포함)
  const upsertLocalDevice = ({ deviceCode, name, imageUrl, room, species }) => {
    const list = JSON.parse(localStorage.getItem(LS_DEVICES) || '[]');
    const idx = list.findIndex(d => d.deviceCode === deviceCode);
    const payload = { deviceCode, name, imageUrl, room:(room||'').trim(), species:(species||'').trim() };
    if (idx >= 0) list[idx] = payload; else list.push(payload);
    localStorage.setItem(LS_DEVICES, JSON.stringify(list));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');

    if (!name.trim()) return setError('기기 이름을 입력하세요.');

    // ✨ 2-2-4 언더바 포맷으로 정규화 + 유효성 검사(대/소문자 구분 유지)
    const macCode = normalizeMac224(macInput);
    if (!isValidMac224(macCode)) {
      return setError('장치 아이디 형식이 올바르지 않습니다. 예) Ge_Sd_6c18  (두글자_두글자_네글자, 대/소문자/숫자 구분)');
    }

    const ensureThumb = async () => {
      if (thumbDataUrl) return thumbDataUrl;
      if (file) { try { return await makeThumb(file); } catch {} }
      return makeTextThumb(macCode); // 코드 자체를 썸네일 텍스트로
    };

    // ✅ 오프라인(로컬만 저장)
    if (offline) {
      const deviceId = macCode.slice(-4); // 마지막 4글자 (대/소문자 구분 유지)
      const img = await ensureThumb();
      upsertLocalDevice({ deviceCode: deviceId, name: name.trim(), imageUrl: img, room, species });
      alert('오프라인(임의) 기기 등록 완료!');
      return navigate('/dashboard', { replace: true, state: { addedDevice: { name: name.trim(), deviceCode: deviceId, imgSrc: img, room, species } } });
    }

    // 🔗 온라인(백엔드 등록) — 백엔드는 mac_address를 00_00_0000 포맷으로 받도록 수정 예정
    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ mac_address: macCode, friendly_name: name.trim() }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || `등록 실패 (status ${res.status})`);
      const deviceId = data?.device_id || macCode.slice(-4); // 백엔드가 device_id 주지 않으면 마지막 4글자 사용
      const img = await ensureThumb();

      upsertLocalDevice({ deviceCode: deviceId, name: name.trim(), imageUrl: img, room, species });

      alert('기기 연결 성공!');
      navigate('/dashboard', { replace: true, state: { addedDevice: { name: name.trim(), deviceCode: deviceId, imgSrc: img, room, species } } });
    } catch (err) {
      setError(err.message || '등록 중 오류가 발생했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6' }}>
      <form onSubmit={handleSubmit}
            style={{ width: 480, padding: 24, background:'#fff', borderRadius: 8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)', boxSizing:'border-box' }}>
        <h2 style={{ margin:'0 0 16px' }}>기기 연결 + 사진 등록</h2>
        <p style={{ marginTop:0, color:'#555' }}>
          장치 아이디 포맷: <code>00_00_0000</code> (영숫자 2글자/2글자/4글자, <b>대/소문자 구분</b>)<br/>
          예) <code>Ge_Sd_6c18</code>  또는  <code>[Ge-Sd-6c18]</code> (자동 변환)
        </p>

        {error && <div style={{ color:'red', whiteSpace:'pre-line', marginBottom:12 }}>{error}</div>}

        <label style={{ display:'flex', alignItems:'center', gap:8, margin:'0 0 12px' }}>
          <input type="checkbox" checked={offline} onChange={(e)=>setOffline(e.target.checked)} />
          <span>오프라인 임의 연결(서버 호출 없이 로컬에 저장)</span>
        </label>

        <label style={{ fontWeight:600 }}>기기 이름</label>
        <input type="text" placeholder="예) GreenEye_01" value={name} onChange={(e)=>setName(e.target.value)} style={fieldStyle} />

        <label style={{ fontWeight:600 }}>장치 아이디 (2-2-4 언더바)</label>
        <input
          type="text"
          placeholder="예) Ge_Sd_6c18  또는  Ge-Sd-6c18 / [Ge_Sd_6c18] / GeSd6c18"
          value={macInput}
          onChange={(e)=>setMacInput(e.target.value)}
          style={{ ...fieldStyle, fontFamily:'monospace' }}
        />

        <label style={{ fontWeight:600 }}>방 (선택)</label>
        <input type="text" placeholder="예) 거실, 안방, 1층-남쪽" value={room} onChange={(e)=>setRoom(e.target.value)} style={fieldStyle} />

        <label style={{ fontWeight:600 }}>식물종 (선택)</label>
        <select value={species} onChange={(e)=>setSpecies(e.target.value)} style={{ ...fieldStyle, background:'#fff' }}>
          <option value="">— 선택 안 함 —</option>
          {SPECIES_74.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={{ fontWeight:600 }}>
          기기 대표 사진 <span style={{ color:'#6b7280', fontWeight:400 }}>(선택 • 썸네일만 로컬에 저장)</span>
        </label>
        <input type="file" accept={ACCEPT_TYPES.join(',')} onChange={onPickFile} style={{ display:'block', margin:'6px 0 12px' }} />
        <div style={{ border:'1px solid #e5e7eb', borderRadius:8, background:'#000', aspectRatio:'16 / 9', marginBottom:16, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {thumbDataUrl
            ? <img src={thumbDataUrl} alt="preview" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            : <div style={{ color:'#9ca3af' }}>선택된 이미지가 없습니다.</div>}
        </div>

        <button type="submit" disabled={loading}
          style={{ width:'100%', boxSizing:'border-box', padding:'12px 0', background:loading?'#93c5fd':'#1e40af',
                   color:'#fff', border:'none', borderRadius:4, cursor:'pointer', marginBottom:10 }}>
          {loading ? '등록 중…' : (offline ? '오프라인 임의 등록' : '기기 등록')}
        </button>

        <button type="button" onClick={() => navigate(-1)}
          style={{ width:'100%', boxSizing:'border-box', padding:'10px 0', background:'#e5e7eb', color:'#111827',
                   border:'none', borderRadius:4, cursor:'pointer' }}>
          돌아가기
        </button>
      </form>
    </div>
  );
}
