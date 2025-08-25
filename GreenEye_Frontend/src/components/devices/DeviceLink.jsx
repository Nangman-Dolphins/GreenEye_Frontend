import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

/* ── 계정별 키/유틸 ───────────────── */
const hashStr = (str) => { let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0).toString(36); };
const userKeyFromToken = (t) => (t ? hashStr(String(t)) : 'guest');

const thumbsKeyForUser     = (t) => `greeneye_thumbs:${userKeyFromToken(t)}`;
const metaKeyForUser       = (t) => `greeneye_meta:${userKeyFromToken(t)}`;
const clientDevsKeyForUser = (t) => `greeneye_client_devices:${userKeyFromToken(t)}`;

const readThumbs = (t) => { try { return JSON.parse(localStorage.getItem(thumbsKeyForUser(t)) || '{}'); } catch { return {}; } };
const writeThumb = (t, code, dataUrl) => {
  const k = thumbsKeyForUser(t); const m = readThumbs(t);
  m[code] = dataUrl; localStorage.setItem(k, JSON.stringify(m));
};
const readMeta = (t) => { try { return JSON.parse(localStorage.getItem(metaKeyForUser(t)) || '{}'); } catch { return {}; } };
const writeMeta = (t, code, meta) => {
  const k = metaKeyForUser(t); const m = readMeta(t);
  m[code] = { ...(m[code]||{}), ...meta }; localStorage.setItem(k, JSON.stringify(m));
};
const readClientDevs = (t) => { try { return JSON.parse(localStorage.getItem(clientDevsKeyForUser(t)) || '[]'); } catch { return []; } };
const upsertClientDev = (t, dev) => {
  const k = clientDevsKeyForUser(t);
  const list = readClientDevs(t);
  const i = list.findIndex(d => d.deviceCode === dev.deviceCode);
  if (i >= 0) list[i] = { ...list[i], ...dev }; else list.unshift(dev);
  localStorage.setItem(k, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent('greeneye:client-devices-updated')); // 갤러리 즉시 갱신
};

/* ── 입력 유틸(포맷) ─────────────── */
const ACCEPT_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

const toMacNorm = (raw) => {
  const alnum = String(raw ?? '').toLowerCase().replace(/[^0-9a-z]/g, '');
  const tail4 = alnum.slice(-4).replace(/[^0-9a-f]/g, '');
  return `ge-sd-${tail4}`;
};
const isValidGeSd = (v) => /^ge-sd-[0-9a-f]{4}$/.test(String(v || ''));

async function makeThumb(file, maxW = 480, maxH = 360) {
  const dataURL = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=dataURL; });
  const scale = Math.min(maxW/img.width, maxH/img.height, 1);
  const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
  const c = document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
  return c.toDataURL('image/jpeg', 0.8);
}
function makeTextThumb(text, w=480, h=360) {
  const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,w,h); g.addColorStop(0,'#1f2937'); g.addColorStop(1,'#374151'); x.fillStyle=g; x.fillRect(0,0,w,h);
  x.fillStyle='#a7f3d0'; x.textAlign='center'; x.textBaseline='middle'; x.font='bold 42px ui-monospace,Menlo,monospace'; x.fillText(text.toUpperCase(),w/2,h/2);
  return c.toDataURL('image/jpeg', 0.9);
}

/* 식물종(74) */
const SPECIES_74 = [
  "팬지 / 삼색제비꽃 (Pansy)","비올라 (Viola)","메리골드 / 금잔화 (Calendula)","코스모스 (Cosmos)","백일홍 (Zinnia)","봉선화 (Impatiens)","나팔꽃 (Morning glory)","샐비어 / 깨꽃 (Salvia)","루드베키아 (Rudbeckia)","페튜니아 (Petunia)","데이지 (Bellis perennis)","스위트앨리섬 (Sweet alyssum)","스토크 (Stock)","시클라멘 (Cyclamen)","호스타 (Hosta)","제라늄 (Geranium)","애기범부채 (Iris domestica)","가자니아 (Gazania)","라벤더 (Lavender)","에키나시아 (Echinacea)","장미 (Rose)","수국 (Hydrangea)","영산홍/철쭉 (Royal Azalea)","목련 (Magnolia)","무궁화 (Hibiscus syriacus)","라일락 (Lilac)","유채나무 (Forsythia)","진달래 (Rhododendron)","칼리카르파 (Callicarpa)","개나리 (Forsythia koreana)","안스리움 (Anthurium)","베고니아 (Begonia)","아젤리아 (Azalea in pots)","파키라 (Pachira)","드라세나 (Dracaena)","거베라 (Gerbera)","알스트로메리아 (Alstroemeria)","선인장류 (Cactus family)","알로에 (Aloe)","에케베리아 (Echeveria)","하월시아 (Haworthia)","세덤 / 돌나물 (Sedum)","칼랑코에 (Kalanchoe)","튤립 (Tulip)","수선화 (Narcissus)","히야신스 (Hyacinth)","프리지아 (Freesia)","글라디올러스 (Gladiolus)","아마릴리스 (Amaryllis)","크로커스 (Crocus)","다알리아 (Dahlia)","칼라 (Zantedeschia)","국화 (Chrysanthemum)","백합 (Lily)","카네이션 (Carnation)","해바라기 (Sunflower)","스파티필룸 (Spathiphyllum)","아글라오네마 (Aglaonema)","디펜바키아 (Dieffenbachia)","몬스테라 (Monstera)","산세베리아 (Sansevieria)","테이블야자 (Parlor palm)","페페로미아 (Peperomia)","벵갈고무나무 (Ficus elastica)","싱고니움 (Syngonium)","칼라디움 (Caladium)","바질 (Basil)","로즈마리 (Rosemary)","타임 / 벼룩이자리 (Thyme)","오레가노 (Oregano)","민트 / 배초향 (Korean Mint)","라벤더 (Lavender)","카모마일 / 카밀레 (Chamomile)","안개꽃 (Gypsophila)"
];

export default function DeviceLink() {
  const navigate = useNavigate();
  const { authFetch, token } = useContext(AuthContext) || {};

  const [name, setName] = useState('');
  const [macInput, setMacInput] = useState('');
  const [room, setRoom] = useState('');
  const [species, setSpecies] = useState('');
  const [file, setFile] = useState(null);
  const [thumbDataUrl, setThumbDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(true); // ✅ 기본값: 오프라인

  const fieldStyle = { width:'100%', boxSizing:'border-box', padding:'10px 12px', margin:'6px 0 12px', border:'1px solid #ccc', borderRadius:4 };

  const onPickFile = async (e) => {
    setError('');
    const f = e.target.files?.[0]; if (!f) return;
    if (!ACCEPT_TYPES.includes(f.type)) return setError('PNG/JPG/JPEG/WEBP만 허용됩니다.');
    if (f.size > MAX_BYTES) return setError('최대 10MB까지 업로드할 수 있습니다.');
    setFile(f);
    try { setThumbDataUrl(await makeThumb(f)); } catch { setThumbDataUrl(''); }
  };

  const ensureThumb = async (code) => {
    if (thumbDataUrl) return thumbDataUrl;
    if (file) { try { return await makeThumb(file); } catch {} }
    return makeTextThumb(code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const mac = toMacNorm(macInput);
    if (!name.trim()) return setError('기기 이름을 입력하세요.');
    if (!isValidGeSd(mac)) return setError('장치 아이디는 ge-sd-xxxx 형식이어야 합니다.');

    const img = await ensureThumb(mac);

    // ✅ 오프라인: 서버 호출 없이 로컬에 저장 → 갤러리 즉시 반영
    if (offline) {
      const deviceId = mac; // 전체 ge-sd-xxxx를 코드로 사용
      writeThumb(token, deviceId, img);
      writeMeta(token, deviceId, { species, room });
      upsertClientDev(token, { deviceCode: deviceId, name: name.trim(), imageUrl: img, species, room });

      alert('오프라인(임의) 기기 등록 완료!');
      return navigate('/dashboard', { replace: true, state: { addedDevice: { name: name.trim(), deviceCode: deviceId, imgSrc: img, room, species } } });
    }

    // 🔗 온라인 등록(백엔드)
    setLoading(true);
    try {
      const res = await authFetch('/api/register_device', {
        method: 'POST',
        body: JSON.stringify({ mac_address: mac, friendly_name: name.trim() }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || `등록 실패 (status ${res.status})`);

      const deviceId = String(data?.device_id || mac).trim();

      // 서버 응답을 기다리지 않고도 갤러리에 즉시 보이게 로컬에도 반영
      writeThumb(token, deviceId, img);
      writeMeta(token, deviceId, { species, room });
      upsertClientDev(token, { deviceCode: deviceId, name: name.trim(), imageUrl: img, species, room });

      alert('기기 연결 성공!');
      navigate('/dashboard', { replace: true, state: { addedDevice: { name: name.trim(), deviceCode: deviceId, imgSrc: img, room, species } } });
    } catch (err) {
      setError(err.message || '등록 중 오류가 발생했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f3f4f6' }}>
      <form onSubmit={handleSubmit} style={{ width:480, padding:24, background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin:'0 0 16px' }}>기기 연결 + 사진 등록</h2>
        {error && <div style={{ color:'red', marginBottom:12 }}>{error}</div>}

        {/* ✅ 오프라인 토글 */}
        <label style={{ display:'flex', alignItems:'center', gap:8, margin:'0 0 12px' }}>
          <input type="checkbox" checked={offline} onChange={(e)=>setOffline(e.target.checked)} />
          <span>오프라인 임의 연결(서버 호출 없이 로컬에 저장)</span>
        </label>

        <label style={{ fontWeight:600 }}>기기 이름</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="예) GreenEye_01" style={fieldStyle} />

        <label style={{ fontWeight:600 }}>장치 아이디 (ge-sd-xxxx)</label>
        <input value={macInput} onChange={e=>setMacInput(e.target.value)} placeholder="예) ge-sd-6c18 / GE-SD-6C18" style={{ ...fieldStyle, fontFamily:'monospace' }} />

        <label style={{ fontWeight:600 }}>방 (선택)</label>
        <input value={room} onChange={e=>setRoom(e.target.value)} placeholder="예) 거실, 안방" style={fieldStyle} />

        <label style={{ fontWeight:600 }}>식물종 (선택)</label>
        <select value={species} onChange={e=>setSpecies(e.target.value)} style={{ ...fieldStyle, background:'#fff' }}>
          <option value="">— 선택 안 함 —</option>
          {SPECIES_74.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={{ fontWeight:600 }}>기기 대표 사진 (선택)</label>
        <input type="file" accept={ACCEPT_TYPES.join(',')} onChange={onPickFile} style={{ display:'block', margin:'6px 0 12px' }} />
        <div style={{ border:'1px solid #e5e7eb', borderRadius:8, background:'#000', aspectRatio:'16/9', marginBottom:16, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {thumbDataUrl ? <img src={thumbDataUrl} alt="preview" style={{ width:'100%', height:'100%', objectFit:'contain' }} /> : <div style={{ color:'#9ca3af' }}>선택된 이미지가 없습니다.</div>}
        </div>

        <button type="submit" disabled={loading}
          style={{ width:'100%', padding:'12px 0', background:loading?'#93c5fd':'#1e40af', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>
          {loading ? '등록 중…' : (offline ? '오프라인 임의 등록' : '기기 등록')}
        </button>

        <button type="button" onClick={()=>navigate(-1)} style={{ width:'100%', padding:'10px 0', background:'#e5e7eb', color:'#111827', border:'none', borderRadius:4, cursor:'pointer', marginTop:8 }}>
          돌아가기
        </button>
      </form>
    </div>
  );
}
