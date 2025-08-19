// SensorInfo.jsx
import React, { useEffect, useState } from 'react';

/** ===========================
 *  백엔드 적응형 센서 스냅샷 로더
 *  - 여러 엔드포인트/스키마를 순차 시도해 표준 형태로 매핑
 *  - 표준 형태: { env:{temp,humi,lux}, soil:{temp,moisture,ec}, battery }
 *  =========================== */

// 후보 엔드포인트(필요에 맞게 추가/삭제)
const SENSOR_ENDPOINTS = [
  (code) => `/api/sensors/${encodeURIComponent(code)}`,
  (code) => `/api/sensors?deviceCode=${encodeURIComponent(code)}`,
  (code) => `/api/device/${encodeURIComponent(code)}/sensors`,
];

// 숫자 강제 변환: "23.1°C" -> 23.1, null/NaN이면 null
const num = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  return null;
};

// 객체 경로 안전 접근 (e.g. get(data, 'env.temp'))
const get = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);

// 주어진 경로들 중 최초로 숫자를 뽑아옴
const firstNum = (data, paths) => {
  for (const p of paths) {
    const v = num(get(data, p));
    if (v !== null) return v;
  }
  return null;
};

// 서버 응답 → 표준 스냅샷으로 매핑
function mapToSnapshot(data) {
  // 배열(예: 최신값이 마지막)에 대한 방어
  if (Array.isArray(data)) {
    const last = data[data.length - 1] ?? {};
    return mapToSnapshot(last);
  }

  // 이미 표준 형태인 경우 빠른 경로
  if (data?.env && data?.soil) {
    const out = {
      env: {
        temp: num(data.env.temp),
        humi: num(data.env.humi),
        lux: num(data.env.lux),
      },
      soil: {
        temp: num(data.soil.temp),
        moisture: num(data.soil.moisture),
        ec: num(data.soil.ec),
      },
      battery: num(data.battery),
    };
    // 일부 null인 경우 아래 경로로 보강
    data = { ...data }; // 계속 진행
    if (
      out.env.temp !== null &&
      out.env.humi !== null &&
      out.env.lux !== null &&
      out.soil.temp !== null &&
      out.soil.moisture !== null &&
      out.soil.ec !== null &&
      out.battery !== null
    ) {
      return out;
    }
  }

  // 다양한 키 변형을 지원
  const envTemp = firstNum(data, [
    'env.temp',
    'environment.temp',
    'environment.temperatureC',
    'temperatureC',
    'tempC',
    'ambient.temp',
    'ambient.temperatureC',
    'temp',
  ]);
  const envHumi = firstNum(data, [
    'env.humi',
    'environment.humi',
    'environment.humidity',
    'humidity',
    'humi',
    'humiPercent',
  ]);
  const envLux = firstNum(data, [
    'env.lux',
    'environment.lux',
    'environment.light',
    'environment.lightLux',
    'light',
    'lightLux',
    'lux',
  ]);

  const soilTemp = firstNum(data, [
    'soil.temp',
    'soil.temperatureC',
    'soilTempC',
    'substrate.temp',
    'substrate.temperatureC',
  ]);
  const soilMoist = firstNum(data, [
    'soil.moisture',
    'soil.moisturePercent',
    'soilMoisturePct',
    'soilMoisture',
    'substrate.moisture',
  ]);
  const soilEc = firstNum(data, [
    'soil.ec',
    'soil.ec_mScm',
    'soil.ecMsPerCm',
    'soilEc_mScm',
    'ec',
  ]);

  const battery = firstNum(data, ['battery', 'batteryPct', 'batteryPercent', 'battery.percent']);

  return {
    env: { temp: envTemp ?? 0, humi: envHumi ?? 0, lux: envLux ?? 0 },
    soil: { temp: soilTemp ?? 0, moisture: soilMoist ?? 0, ec: soilEc ?? 0 },
    battery: battery ?? 0,
  };
}

// 타임아웃 포함 fetch
async function fetchJsonWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) throw new Error('Not JSON');
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

/** 실제 호출 함수: 여러 엔드포인트/스키마를 시도 */
async function fetchSensorSnapshot(deviceCode) {
  // Authorization 헤더(있으면) 자동 첨부
  const token = localStorage.getItem('auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  let lastErr = null;
  for (const mk of SENSOR_ENDPOINTS) {
    const url = mk(deviceCode);
    try {
      const raw = await fetchJsonWithTimeout(url, { headers });
      return mapToSnapshot(raw);
    } catch (e) {
      lastErr = e;
      // 다음 후보로
    }
  }
  // 최종 실패 시 0으로 채워진 스냅샷 반환 (UI는 항상 안전)
  console.warn('[SensorInfo] 모든 엔드포인트 실패:', lastErr?.message || lastErr);
  return {
    env: { temp: 0, humi: 0, lux: 0 },
    soil: { temp: 0, moisture: 0, ec: 0 },
    battery: 0,
  };
}

/* ====== 컴포넌트 ====== */
export default function SensorInfo({ deviceCode, deviceName = '' }) {
  const [data, setData] = useState({
    env: { temp: 0, humi: 0, lux: 0 },
    soil: { temp: 0, moisture: 0, ec: 0 },
    battery: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!deviceCode) {
        setData({ env: { temp: 0, humi: 0, lux: 0 }, soil: { temp: 0, moisture: 0, ec: 0 }, battery: 0 });
        return;
      }
      setLoading(true);
      try {
        const res = await fetchSensorSnapshot(deviceCode);
        if (alive) setData(res);
      } catch {
        if (alive) {
          setData({ env: { temp: 0, humi: 0, lux: 0 }, soil: { temp: 0, moisture: 0, ec: 0 }, battery: 0 });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, [deviceCode]);

  const title = (deviceName && deviceName.trim()) || (deviceCode || '미선택');

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        padding: 16,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>🌱 {title} 센서 정보</div>
        <div
          title="배터리 잔량"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            borderRadius: 999,
            background: '#f3f4f6',
            fontWeight: 700,
          }}
        >
          <span role="img" aria-label="battery">🔋</span>
          {Number(data.battery ?? 0)}%
        </div>
      </div>

      {/* 환경/토양 2열 */}
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
