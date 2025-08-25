// src/components/dashboard/SensorInfo.jsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

/* 설정 저장 키 & 기본 주기(분) */
const LS_SETTINGS = 'greeneye_settings';
const DEFAULT_SENSING_MIN = 30;

/* 설정에서 '센싱 주기(분)' → ms (최소 5초 가드) */
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

/* 표준/더미 키 모두 수용 */
function parseSensorPayload(j = {}) {
  const envTemp = j.temperature ?? j.amb_temp ?? 0;
  const envHumi = j.humidity ?? j.amb_humi ?? 0;
  const envLux  = j.light_lux ?? j.amb_light ?? 0;

  const soilTemp  = j.soil_temp ?? 0;
  const soilMoist = j.soil_moisture ?? j.soil_humi ?? 0;
  const soilEc    = j.soil_ec ?? 0;

  const battery   = j.battery ?? j.bat_level ?? 0;

  return {
    env:  { temp: Number(envTemp) || 0, humi: Number(envHumi) || 0, lux: Number(envLux) || 0 },
    soil: { temp: Number(soilTemp) || 0, moisture: Number(soilMoist) || 0, ec: Number(soilEc) || 0 },
    battery: Number(battery) || 0,
  };
}

/* 캐시 우회 + 안전 fetch */
async function fetchSensorSnapshotAPI(authFetch, deviceId, signal) {
  const url = `/api/latest_sensor_data/${encodeURIComponent(deviceId)}?t=${Date.now()}`;
  const headers = { Accept: 'application/json', 'Cache-Control': 'no-store' };
  const opt = { headers, cache: 'no-store', signal };

  const res = await (authFetch ? authFetch(url, opt) : fetch(url, opt));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return parseSensorPayload(j);
}

/* 더미 스냅샷: 주기와 무관하게 즉시 대체용 */
function makeDummySnapshot(deviceId, sensingMs) {
  const toCode = (raw) => {
    const s = String(raw ?? '').trim();
    const alnum = s.replace(/[^A-Za-z0-9]/g, '');
    return alnum.length >= 4 ? alnum.slice(-4) : alnum;
  };
  const id = toCode(deviceId);

  const tick = Math.floor(Date.now() / (sensingMs || 60000)); // 단순 tick
  let seed = 2166136261 ^ (id + '|' + tick)
    .split('')
    .reduce((h, c) => (h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  let bs = id
    .split('')
    .reduce((h, c) => (h = Math.imul((h ^ c.charCodeAt(0)) >>> 0, 16777619) >>> 0), 2166136261);
  const baseR = () => { bs = (bs * 1664525 + 1013904223) >>> 0; return bs / 0x100000000; };

  const base = {
    temperature: 20 + baseR() * 10,
    humidity: 35 + baseR() * 40,
    light_lux: 200 + baseR() * 800,
    soil_temp: 18 + baseR() * 8,
    soil_moist: 20 + baseR() * 50,
    soil_ec: 0.5 + baseR() * 2.0,
    battery: 40 + baseR() * 55,
  };

  return parseSensorPayload({
    temperature: +(clamp(base.temperature + (rand() - 0.5) * 2.0, 15, 35)).toFixed(1),
    humidity: Math.round(clamp(base.humidity + (rand() - 0.5) * 4.0, 0, 100)),
    light_lux: Math.round(clamp(base.light_lux + (rand() - 0.5) * 60, 0, 2000)),
    soil_temp: +(clamp(base.soil_temp + (rand() - 0.5) * 1.0, 10, 40)).toFixed(1),
    soil_moisture: Math.round(clamp(base.soil_moist + (rand() - 0.5) * 5.0, 0, 100)),
    soil_ec: +(clamp(base.soil_ec + (rand() - 0.5) * 0.1, 0.1, 5.0)).toFixed(2),
    battery: Math.round(clamp(base.battery - rand() * 0.3, 0, 100)),
  });
}

/**
 * 자동 갱신 안정판:
 * - 설정 저장 시 즉시 1회 재조회(kick)
 * - 주기 타이머를 '경계 정렬(align)' 방식으로 스케줄 → 1분이면 매 분 00초에 갱신
 * - 탭 다시 보이면(visibilitychange)·온라인 복구 시(online) 즉시 재조회
 * - 에러여도 이전 값 유지 + 더미로 대체
 */
export default function SensorInfo({ deviceCode, plantId, deviceName = '' }) {
  const { authFetch } = useContext(AuthContext) || {};
  const targetId = deviceCode || plantId || '';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    env: { temp: 0, humi: 0, lux: 0 },
    soil: { temp: 0, moisture: 0, ec: 0 },
    battery: 0,
  });
  const [sensingMs, setSensingMs] = useState(readSensingMs());
  const [kick, setKick] = useState(0); // 설정 저장 직후 즉시 1회 재조회 트리거
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // 설정 변경 감지: 같은 탭/다른 탭 모두
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_SETTINGS) {
        setSensingMs(readSensingMs());
        setKick((k) => k + 1); // 저장 즉시 재조회
      }
    };
    const onCustom = () => {
      setSensingMs(readSensingMs());
      setKick((k) => k + 1); // 같은 탭에서도 즉시 재조회
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('greeneye:settings-updated', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('greeneye:settings-updated', onCustom);
    };
  }, []);

  // 공통 로더: 실패 시 더미로 대체(이전 값 유지)
  const loadOnce = async () => {
    if (!targetId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setLoading(true);
      const s = await fetchSensorSnapshotAPI(authFetch, targetId, ctrl.signal);
      setData(s);
    } catch {
      setData((prev) =>
        prev && (prev.env.temp || prev.soil.moisture || prev.battery)
          ? prev
          : makeDummySnapshot(targetId, sensingMs)
      );
    } finally {
      setLoading(false);
    }
  };

  // 최초 1회
  useEffect(() => {
    if (!targetId) {
      setData({ env: { temp: 0, humi: 0, lux: 0 }, soil: { temp: 0, moisture: 0, ec: 0 }, battery: 0 });
      return;
    }
    loadOnce();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, authFetch]);

  // ✅ 주기 갱신: '경계 정렬' setTimeout 체인 (1분이면 매 분 00초에 맞춰 실행)
  useEffect(() => {
    if (!targetId) return;
    const schedule = () => {
      clearTimeout(timerRef.current);
      const ms = sensingMs;
      const next = ms - (Date.now() % ms); // 경계까지 남은 시간
      timerRef.current = setTimeout(async function run() {
        await loadOnce();
        schedule(); // 다시 예약
      }, next);
    };
    schedule();
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, sensingMs]);

  // 설정 저장 직후 즉시 1회 재조회
  useEffect(() => {
    if (!targetId) return;
    (async () => { await loadOnce(); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kick, targetId]);

  // 탭이 다시 보이거나 온라인 복구되면 즉시 갱신
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') loadOnce(); };
    const onOnline = () => loadOnce();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, sensingMs]);

  const title = (deviceName && deviceName.trim()) || targetId || '미선택';

  // 기존 디자인 유지
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>🌱 {title} 센서 정보</div>
        <div
          title="배터리 잔량"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 999, background: '#f3f4f6', fontWeight: 700 }}
        >
          <span role="img" aria-label="battery">🔋</span>{data.battery ?? 0}%
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🖼️ 환경</div>
          <div>🌡️ 온도: <b>{Number(data.env?.temp ?? 0)} °C</b></div>
          <div>💧 습도: <b>{Number(data.env?.humi ?? 0)} %</b></div>
          <div>💡 광도: <b>{Number(data.env?.lux ?? 0)} lx</b></div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🪴 토양</div>
          <div>🌡️ 온도: <b>{Number(data.soil?.temp ?? 0)} °C</b></div>
          <div>💧 수분: <b>{Number(data.soil?.moisture ?? 0)} %</b></div>
          <div>⚡ 전도도: <b>{Number(data.soil?.ec ?? 0)} mS/cm</b></div>
        </div>
      </div>
      {loading && <div style={{ marginTop: 8, color: '#6b7280' }}>불러오는 중…</div>}
    </div>
  );
}
