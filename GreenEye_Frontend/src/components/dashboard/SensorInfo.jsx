// src/components/dashboard/SensorInfo.jsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

/* ===== 기본 설정 ===== */
const LS_SETTINGS = 'greeneye_settings';
const DEFAULT_SENSING_MIN = 30;
const ICON_SIZE = 16;

/* ✅ 피드백 표시 방식: 'auto' | 'lines' | 'grid'  */
const ACTION_LAYOUT = 'grid';

/* 센싱 주기 읽기(ms) */
function readSensingMs() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}');
    const m = Number(s?.sensingIntervalMinutes);
    const minutes = Number.isFinite(m) && m > 0 ? m : DEFAULT_SENSING_MIN;
    return Math.max(5000, minutes * 60 * 1000);
  } catch {
    return Math.max(5000, DEFAULT_SENSING_MIN * 60 * 1000);
  }
}

/* 숫자 안전 변환 */
const toNum = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* 서버 새 응답(values.{field:{value,status,range}}) ↔ 레거시 응답 호환 */
function parseSensorPayload(j = {}) {
  if (j && j.values && typeof j.values === 'object') {
    const v = j.values;
    return {
      env:  { temp: toNum(v.temperature?.value), humi: toNum(v.humidity?.value), lux: toNum(v.light_lux?.value) },
      soil: { temp: toNum(v.soil_temp?.value),   moisture: toNum(v.soil_moisture?.value), ec: toNum(v.soil_ec?.value) },
      battery: toNum(v.battery?.value),
      status: {
        temperature:   v.temperature?.status    || 'unknown',
        humidity:      v.humidity?.status       || 'unknown',
        light_lux:     v.light_lux?.status      || 'unknown',
        soil_temp:     v.soil_temp?.status      || 'unknown',
        soil_moisture: v.soil_moisture?.status  || 'unknown',
        soil_ec:       v.soil_ec?.status        || 'unknown',
        battery:       v.battery?.status        || 'unknown',
      },
      ranges: {
        temperature:   v.temperature?.range     || null,
        humidity:      v.humidity?.range        || null,
        light_lux:     v.light_lux?.range       || null,
        soil_temp:     v.soil_temp?.range       || null,
        soil_moisture: v.soil_moisture?.range   || null,
        soil_ec:       v.soil_ec?.range         || null,
        battery:       v.battery?.range         || null,
      },
      plantType: j.plant_type || '',
      timestamp: j.timestamp || null,
      aiNote: typeof j.ai_diagnosis === 'string'
        ? j.ai_diagnosis
        : (j.ai_diagnosis?.comment ?? j.ai_diagnosis?.note ?? ''),
    };
  }

  // 레거시(flat)
  const envTemp   = j.temperature ?? j.amb_temp ?? 0;
  const envHumi   = j.humidity ?? j.amb_humi ?? 0;
  const envLux    = j.light_lux ?? j.amb_light ?? 0;
  const soilTemp  = j.soil_temp ?? 0;
  const soilMoist = j.soil_moisture ?? j.soil_humi ?? 0;
  const soilEc    = j.soil_ec ?? 0;
  const battery   = j.battery ?? j.bat_level ?? 0;

  return {
    env:  { temp: toNum(envTemp), humi: toNum(envHumi), lux: toNum(envLux) },
    soil: { temp: toNum(soilTemp), moisture: toNum(soilMoist), ec: toNum(soilEc) },
    battery: toNum(battery),
    status: { temperature:'unknown', humidity:'unknown', light_lux:'unknown', soil_temp:'unknown', soil_moisture:'unknown', soil_ec:'unknown', battery:'unknown' },
    ranges: { temperature:null, humidity:null, light_lux:null, soil_temp:null, soil_moisture:null, soil_ec:null, battery:null },
    plantType: j.plant_type || '', timestamp: j.timestamp || null,
    aiNote: typeof j.ai_diagnosis === 'string'
      ? j.ai_diagnosis
      : (j.ai_diagnosis?.comment ?? j.ai_diagnosis?.note ?? ''),
  };
}

/* 안전 fetch */
async function fetchSensorSnapshotAPI(authFetch, deviceId, signal) {
  const url = `/api/latest_sensor_data/${encodeURIComponent(deviceId)}?t=${Date.now()}`;
  const headers = { Accept: 'application/json', 'Cache-Control': 'no-store' };
  const opt = { headers, cache: 'no-store', signal };
  const res = await (authFetch ? authFetch(url, opt) : fetch(url, opt));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return parseSensorPayload(j);
}

/* 더미 스냅샷 */
function makeDummySnapshot(deviceId, sensingMs) {
  const toCode = (raw) => String(raw ?? '').trim().replace(/[^A-Za-z0-9]/g, '').slice(-4);
  const id = toCode(deviceId);
  const tick = Math.floor(Date.now() / (sensingMs || 60000));
  let seed = 2166136261 ^ (id + '|' + tick).split('').reduce((h,c)=>(h=Math.imul(h ^ c.charCodeAt(0),16777619)>>>0),2166136261);
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000;
  const clamp = (v,a,b)=>Math.min(Math.max(v,a),b);
  let bs = id.split('').reduce((h,c)=>(h=Math.imul((h ^ c.charCodeAt(0))>>>0,16777619)>>>0),2166136261);
  const baseR = ()=>{ bs=(bs*1664525+1013904223)>>>0; return bs/0x100000000; };
  const base = { temperature:20+baseR()*10, humidity:35+baseR()*40, light_lux:200+baseR()*800, soil_temp:18+baseR()*8, soil_moist:20+baseR()*50, soil_ec:0.5+baseR()*2.0, battery:40+baseR()*55 };
  const legacy = {
    temperature:+(clamp(base.temperature+(rand()-0.5)*2.0,15,35)).toFixed(1),
    humidity:Math.round(clamp(base.humidity+(rand()-0.5)*4.0,0,100)),
    light_lux:Math.round(clamp(base.light_lux+(rand()-0.5)*60,0,2000)),
    soil_temp:+(clamp(base.soil_temp+(rand()-0.5)*1.0,10,40)).toFixed(1),
    soil_moisture:Math.round(clamp(base.soil_moist+(rand()-0.5)*5.0,0,100)),
    soil_ec:+(clamp(base.soil_ec+(rand()-0.5)*0.1,0.1,5.0)).toFixed(2),
    battery:Math.round(clamp(base.battery - rand()*0.3,0,100)),
  };
  return parseSensorPayload(legacy);
}

/* 상태 라벨/배지 색상 */
const statusLabel = (s) => (s==='low'?'낮음':s==='middle'?'정상':s==='high'?'높음':'불명');
function statusTheme(s) {
  switch (s) {
    case 'low':    return { bg:'#fee2e2', br:'#fecaca', text:'#000', shadow:'0 0 0 1px #991b1b, 0 3px 8px rgba(220,38,38,.25)' };
    case 'middle': return { bg:'#dcfce7', br:'#bbf7d0', text:'#000', shadow:'0 0 0 1px #166534, 0 3px 8px rgba(22,163,74,.22)' };
    case 'high':   return { bg:'#dbeafe', br:'#bfdbfe', text:'#000', shadow:'0 0 0 1px #1e40af, 0 3px 8px rgba(37,99,235,.22)' };
    default:       return { bg:'#f3f4f6', br:'#e5e7eb', text:'#000', shadow:'0 0 0 1px #4b5563, 0 3px 8px rgba(107,114,128,.18)' };
  }
}

/* 배지 */
const StatusBadge = ({ status }) => {
  const { bg, br, text, shadow } = statusTheme(status);
  return (
    <span style={{
      padding:'2px 10px', borderRadius:999, fontSize:12, fontWeight:800,
      background:bg, border:`1px solid ${br}`, color:text, whiteSpace:'nowrap',
      boxShadow: shadow, letterSpacing:.2
    }}>
      {statusLabel(status)}
    </span>
  );
};

/* 행 */
const StatusRow = ({ icon, label, value, unit, status, range }) => (
  <div
    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}
    title={Array.isArray(range) ? `기준 ${range[0]} ~ ${range[1]} ${unit || ''}` : undefined}
  >
    <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
      <span style={{ fontSize: ICON_SIZE, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </div>
    <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
      <b>{toNum(value)}{unit ? ` ${unit}` : ''}</b>
      <StatusBadge status={status} />
    </div>
  </div>
);

/* === 피드백(행동지시) 생성: 배열로 반환 === */
function buildActionsList(status = {}) {
  const s = (k) => String(status?.[k] || '').toLowerCase();
  const acts = [];
  const push = (slug, text, pr) => { if (text) acts.push({ slug, text, pr }); };

  // 우선순위
  if (s('soil_moisture') === 'low')  push('water',   '물을 주세요 (소량 관수)', 0);
  if (s('soil_moisture') === 'high') push('drain',   '배수하고 물주기 간격 늘리기', 0);
  if (s('soil_ec') === 'high')       push('flush',   '맑은 물로 세척 관수', 0);
  if (s('soil_ec') === 'low')        push('fert',    '희석 비료 소량 보충', 1);
  if (s('temperature') === 'high' || s('soil_temp') === 'high') push('cool', '환기·그늘로 온도 낮추기', 1);
  if (s('temperature') === 'low'  || s('soil_temp') === 'low')  push('warm', '보온해 온도 올리기', 1);
  if (s('battery') === 'low')        push('battery', '배터리 충전', 1);
  if (s('light_lux') === 'low')      push('light+',  '창가로 옮겨 광량 늘리기', 2);
  if (s('light_lux') === 'high')     push('light-',  '차광으로 광량 줄이기', 2);
  if (s('humidity') === 'low')       push('humid+',  '분무/가습으로 습도 올리기', 3);
  if (s('humidity') === 'high')      push('humid-',  '환기로 습도 낮추기', 3);

  const uniq = [];
  const seen = new Set();
  acts.sort((a,b)=>a.pr-b.pr).forEach(a => { if (!seen.has(a.slug)) { seen.add(a.slug); uniq.push(a); } });
  return uniq.map(a => a.text);
}

export default function SensorInfo({ deviceCode, plantId, deviceName = '' }) {
  const { authFetch } = useContext(AuthContext) || {};
  const targetId = deviceCode || plantId || '';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    env: { temp: 0, humi: 0, lux: 0 },
    soil: { temp: 0, moisture: 0, ec: 0 },
    battery: 0,
    status: { temperature:'unknown', humidity:'unknown', light_lux:'unknown', soil_temp:'unknown', soil_moisture:'unknown', soil_ec:'unknown', battery:'unknown' },
    ranges: { temperature:null, humidity:null, light_lux:null, soil_temp:null, soil_moisture:null, soil_ec:null, battery:null },
    plantType: '', timestamp: null, aiNote: '',
  });
  const [sensingMs, setSensingMs] = useState(readSensingMs());
  const [kick, setKick] = useState(0);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  /* ▼ 추가: 최신 이미지 모달 상태 */
  const [imgOpen, setImgOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgErr, setImgErr] = useState('');
  const [imgInfo, setImgInfo] = useState(null); // { image_url, timestamp, friendly_name }

  /* 설정 변경 감지 */
  useEffect(() => {
    const onStorage = (e) => { if (e.key === LS_SETTINGS) { setSensingMs(readSensingMs()); setKick(k=>k+1); } };
    const onCustom  = () => { setSensingMs(readSensingMs()); setKick(k=>k+1); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('greeneye:settings-updated', onCustom);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('greeneye:settings-updated', onCustom); };
  }, []);

  /* 로더 */
  const loadOnce = async () => {
    if (!targetId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      setLoading(true);
      const s = await fetchSensorSnapshotAPI(authFetch, targetId, ctrl.signal);
      setData(s);
    } catch {
      setData(prev => (prev && (prev.env.temp || prev.soil.moisture || prev.battery)) ? prev : makeDummySnapshot(targetId, sensingMs));
    } finally {
      setLoading(false);
    }
  };

  /* 최초 1회 */
  useEffect(() => {
    if (!targetId) {
      setData({ env:{temp:0,humi:0,lux:0}, soil:{temp:0,moisture:0,ec:0}, battery:0,
        status:{temperature:'unknown',humidity:'unknown',light_lux:'unknown',soil_temp:'unknown',soil_moisture:'unknown',soil_ec:'unknown',battery:'unknown'},
        ranges:{temperature:null,humidity:null,light_lux:null,soil_temp:null,soil_moisture:null,soil_ec:null,battery:null},
        plantType:'', timestamp:null, aiNote:'' });
      return;
    }
    loadOnce();
    return () => abortRef.current?.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, authFetch]);

  /* 주기 갱신(경계 정렬) */
  useEffect(() => {
    if (!targetId) return;
    const schedule = () => {
      clearTimeout(timerRef.current);
      const ms = sensingMs, next = ms - (Date.now() % ms);
      timerRef.current = setTimeout(async function run(){ await loadOnce(); schedule(); }, next);
    };
    schedule();
    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, sensingMs]);

  /* 저장 직후 즉시 1회 */
  useEffect(() => { if (!targetId) return; (async()=>{ await loadOnce(); })();  // eslint-disable-next-line
  }, [kick, targetId]);

  /* 가시성/온라인 복귀 */
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadOnce(); };
    const onOnline = () => loadOnce();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('online', onOnline); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, sensingMs]);

  /* ▼ 추가: 최신 이미지 호출 */
  const openLatestImage = async () => {
    if (!targetId) return;
    setImgOpen(true);
    setImgLoading(true);
    setImgErr('');
    setImgInfo(null);
    try {
      const res = await authFetch(`/api/devices/${encodeURIComponent(targetId)}/latest-image`, { cache: 'no-store' });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const j = await res.json();
      if (!j?.image_url) throw new Error('이미지가 없습니다.');
      setImgInfo(j);
    } catch (e) {
      setImgErr(e.message || '이미지를 불러오지 못했습니다.');
    } finally {
      setImgLoading(false);
    }
  };

  const title = (deviceName && deviceName.trim()) || targetId || '미선택';
  const actions = buildActionsList(data.status);
  const actionsTooltip = actions.join(', ');

  const cardWrap = { background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)', padding:16, color:'#111' };
  const grayCard = { background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:16 };

  // 표시 방식 결정
  const layout = ACTION_LAYOUT === 'auto'
    ? (actions.length <= 3 ? 'lines' : 'grid')
    : ACTION_LAYOUT;

  return (
    <div style={cardWrap}>
      {/* 헤더 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:18 }}>🌱 {title} 센서 정보</div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
          {/* ▼ 추가: 최신 이미지 보기 버튼 (배터리 왼쪽) */}
          <button
            type="button"
            onClick={openLatestImage}
            title="최신 사진 보기"
            style={{
              padding:'6px 10px', borderRadius:999, border:'1px solid #d1d5db',
              background:'#fff', cursor:'pointer', fontWeight:700
            }}
          >
            📷
          </button>

          <div title="배터리 잔량"
               style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'4px 10px', borderRadius:999, background:'#f3f4f6', fontWeight:700 }}>
            <span role="img" aria-label="battery">🔋</span>{data.battery ?? 0}%
          </div>
        </div>
      </div>

      {/* 본문: 상태 뷰 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={grayCard}>
          <div style={{ fontWeight:700, marginBottom:8 }}>🖼️ 환경 상태</div>
          <StatusRow icon="🌡️" label="온도"  value={data.env?.temp}  unit="°C"  status={data.status.temperature} range={data.ranges.temperature} />
          <StatusRow icon="💧" label="습도"  value={data.env?.humi}  unit="%"   status={data.status.humidity}    range={data.ranges.humidity} />
          <StatusRow icon="💡" label="광도"  value={data.env?.lux}   unit="lux"  status={data.status.light_lux}   range={data.ranges.light_lux} />
        </div>
        <div style={grayCard}>
          <div style={{ fontWeight:700, marginBottom:8 }}>🪴 토양 상태</div>
          <StatusRow icon="🌡️" label="온도"   value={data.soil?.temp}      unit="°C"    status={data.status.soil_temp}     range={data.ranges.soil_temp} />
          <StatusRow icon="💧" label="수분"   value={data.soil?.moisture}  unit="%"     status={data.status.soil_moisture}  range={data.ranges.soil_moisture} />
          <StatusRow icon="⚡" label="전도도"  value={data.soil?.ec}        unit="μS/cm" status={data.status.soil_ec}       range={data.ranges.soil_ec} />
        </div>
      </div>

      {loading && <div style={{ marginTop:8, color:'#111' }}>불러오는 중…</div>}

      {/* 피드백(행동지시) 블록 */}
      <div style={{ marginTop:16, background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:16, color:'#111' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>📌 조치 안내</div>

        {actions.length === 0 ? (
          <div style={{ opacity:.8 }}>전반적으로 정상입니다. 현재 관리를 유지하세요.</div>
        ) : layout === 'lines' ? (
          <div title={actionsTooltip} style={{ lineHeight:1.5 }}>
            {actions.map((t, i) => (
              <div key={i} style={{ marginBottom:4 }}>{t}</div>
            ))}
          </div>
        ) : (
          <div title={actionsTooltip}
               style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, alignItems:'start' }}>
            {actions.map((t, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'flex-start', gap:8,
                padding:'6px 8px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:8
              }}>
                <span style={{ fontWeight:800 }}>•</span>
                <span style={{ lineHeight:1.35 }}>{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI 진단 */}
      <div style={{ marginTop:16, background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:16, color:'#111' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>🤖 AI 진단</div>
        <div style={{ minHeight:22, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.4, fontSize:14, opacity:data.aiNote ? 1 : .7 }}
             title={data.aiNote || 'AI 진단 한 줄이 여기에 표시됩니다.'}>
          {data.aiNote || 'AI 진단 한 줄이 여기에 표시됩니다.'}
        </div>
      </div>

      {/* ▼ 추가: 최신 이미지 모달 */}
      {imgOpen && (
        <div
          onClick={() => setImgOpen(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', padding:16
          }}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            style={{
              width:'min(92vw, 940px)', maxHeight:'90vh',
              background:'#fff', borderRadius:12, overflow:'hidden',
              boxShadow:'0 10px 30px rgba(0,0,0,.25)'
            }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #e5e7eb' }}>
              <div style={{ fontWeight:800 }}>
                {imgInfo?.friendly_name || title} — 최신 사진
                {imgInfo?.timestamp && (
                  <span style={{ marginLeft:8, fontSize:12, color:'#6b7280' }}>
                    {new Date(imgInfo.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <button
                onClick={()=>setImgOpen(false)}
                style={{ border:'1px solid #d1d5db', background:'#fff', borderRadius:8, padding:'6px 10px', cursor:'pointer' }}
              >
                닫기
              </button>
            </div>

            <div style={{ padding:12, background:'#0b0b0b' }}>
              {imgLoading && (
                <div style={{ color:'#fff', padding:24, textAlign:'center' }}>불러오는 중…</div>
              )}
              {imgErr && !imgLoading && (
                <div style={{ color:'#fca5a5', padding:24, textAlign:'center' }}>{imgErr}</div>
              )}
              {imgInfo?.image_url && !imgLoading && !imgErr && (
                <img
                  src={imgInfo.image_url}
                  alt="latest"
                  style={{ width:'100%', height:'auto', display:'block', borderRadius:8 }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
