import { http, HttpResponse } from 'msw';

const LS_DEVICES = 'greeneye_devices';

/* ── 유틸 ───────────────────────────────────────────── */
const readDevices = () => {
  try { return JSON.parse(localStorage.getItem(LS_DEVICES) || '[]'); }
  catch { return []; }
};
const toCode = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const alnum = s.replace(/[^A-Za-z0-9]/g, '');
  return alnum.length >= 4 ? alnum.slice(-4) : alnum;
};
const normalizeDevice = (d = {}) => ({
  deviceCode: toCode(d.deviceCode ?? d.device_code ?? d.device_id ?? d.mac ?? d.mac_address),
  name: d.name ?? d.friendly_name ?? '',
  imageUrl: d.imageUrl ?? d.photoUrl ?? d.thumbnail ?? '',
  room: d.room ?? '',
  species: d.species ?? '',
});

/* ── 더미 변화 주기(센서 내부 값이 시간 흐름에 따라 바뀌는 간격) ──
   - UI의 '센싱 주기'와 무관하게 독립적으로 흐르게 만든다.
   - 기본 10초. 필요시 localStorage 'greeneye_dummy_tick_ms'로 덮어쓰기 가능(1s~10m).
*/
const DEFAULT_DUMMY_TICK_MS = 10_000;
function getDummyTickMs() {
  const v = Number(localStorage.getItem('greeneye_dummy_tick_ms'));
  if (Number.isFinite(v) && v >= 1_000 && v <= 600_000) return v;
  return DEFAULT_DUMMY_TICK_MS;
}

/* 결정적 난수 유틸 */
function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makePRNG(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 0x100000000; };
}
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ── 핸들러 ─────────────────────────────────────────── */
export const handlers = [
  // 기기 목록
  http.get('/api/devices', () => {
    const list = readDevices().map(normalizeDevice).filter(d => d.deviceCode);
    return HttpResponse.json(list, { status: 200 });
  }),

  // 센서 스냅샷 (경로형)
  http.get('/api/latest_sensor_data/:id', ({ params }) => {
    const id = String(params.id || '');
    return HttpResponse.json(makeSnapshot(id), { status: 200 });
  }),

  // 센서 스냅샷 (?deviceCode=)도 지원
  http.get('/api/latest_sensor_data', ({ request }) => {
    const url = new URL(request.url);
    const id = String(url.searchParams.get('deviceCode') || '');
    return HttpResponse.json(makeSnapshot(id), { status: 200 });
  }),

  // 기기 등록(더미)
  http.post('/api/register_device', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const mac  = String(body.mac_address || '').trim();
    const deviceId = toCode(mac) || '0000';
    return HttpResponse.json({ device_id: deviceId }, { status: 201 });
  }),
];

/* ── 값 생성: 더미 '내부 상태'는 getDummyTickMs()에 의해 시간으로 변함 ───── */
function makeSnapshot(rawId) {
  const id = toCode(rawId);
  const tickMs = getDummyTickMs();
  const tick   = Math.floor(Date.now() / tickMs);        // ✅ UI 설정과 무관한 시간 베이스
  const seed   = hashStr(`${id}|${tick}`);
  const rand   = makePRNG(seed);

  // 기기별 평균값(고정)
  const baseSeed = hashStr(id);
  const baseR = makePRNG(baseSeed);
  const base = {
    temperature: 20 + baseR() * 10,  // 20~30
    humidity:    35 + baseR() * 40,  // 35~75
    light_lux:   200 + baseR() * 800,// 200~1000
    soil_temp:   18 + baseR() * 8,   // 18~26
    soil_moist:  20 + baseR() * 50,  // 20~70
    soil_ec:     0.5 + baseR() * 2,  // 0.5~2.5
    battery:     40 + baseR() * 55,  // 40~95
  };

  // tick마다 ±변동
  const temperature   = +(clamp(base.temperature   + (rand() - 0.5) * 2.0, 15, 35)).toFixed(1);
  const humidity      = Math.round(clamp(base.humidity      + (rand() - 0.5) * 4.0,  0, 100));
  const light_lux     = Math.round(clamp(base.light_lux     + (rand() - 0.5) * 60,   0, 2000));
  const soil_temp     = +(clamp(base.soil_temp     + (rand() - 0.5) * 1.0, 10, 40)).toFixed(1);
  const soil_moisture = Math.round(clamp(base.soil_moist    + (rand() - 0.5) * 5.0,  0, 100));
  const soil_ec       = +(clamp(base.soil_ec       + (rand() - 0.5) * 0.1,  0.1, 5.0)).toFixed(2);
  const battery       = Math.round(clamp(base.battery       - (rand()) * 0.3, 0, 100)); // 서서히 감소

  return {
    temperature,
    humidity,
    light_lux,
    soil_temp,
    soil_moisture,
    soil_ec,
    battery,
    // _tick: tick, _tickMs: tickMs, _id: id, // 디버깅 시 풀어보기
  };
}
