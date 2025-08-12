import React, { useEffect, useState } from 'react';

export default function SensorInfo({ plantId }) {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (plantId < 0) {
      setData(null);
      setError(false);
      return;
    }
    setData(null);
    setError(false);

    fetch(`/api/sensors/${plantId}`)
      .then(res => {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      })
      .then(json => setData(json))
      .catch(() => setError(true));
  }, [plantId]);

  if (plantId < 0) return <div style={{ color: '#666' }}>🌱 화분을 선택하세요.</div>;
  if (!data && !error)   return <div>🔄 화분 {plantId + 1} 센서 데이터 로딩 중…</div>;

  // 값 누락/에러 시 0으로 보정
  const safe = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

  //  백엔드 필드명은 환경에 맞게 조정하세요.
  const envTemp      = safe(error ? 0 : (data?.envTemp ?? data?.temperature));
  const envHumidity  = safe(error ? 0 : (data?.envHumidity ?? data?.humidity));
  const light        = safe(error ? 0 : data?.light);

  const soilTemp     = safe(error ? 0 : data?.soilTemp);
  const soilMoisture = safe(error ? 0 : data?.soilMoisture);
  const soilEC       = safe(error ? 0 : data?.soilEC); // mS/cm

  // 배터리(%) - 다양한 키 대비
  const batteryPctRaw = error ? 0 : (data?.battery ?? data?.batteryPct ?? data?.battery_percent);
  const batteryPct    = Math.max(0, Math.min(100, safe(batteryPctRaw)));

  // 스타일
  const card = {
    position: 'relative',            // 우측 상단 배치용
    margin: 0,
    padding: 16,
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  };

  const header = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '0 0 10px',
  };

  const batteryColor =
    batteryPct >= 60 ? '#16a34a' : batteryPct >= 30 ? '#ea580c' : '#dc2626';

  const batteryPill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 9999,
    fontWeight: 600,
    fontSize: 13,
    color: batteryColor,
    background: '#f8fafc',
    border: `1px solid ${batteryColor}22`,
  };

  // 가로 두 칼럼
  const rowWrap = {
    display: 'flex',
    gap: 12,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  };

  const panel = {
    flex: 1,
    minWidth: 260,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 12,
    boxSizing: 'border-box',
  };

  const sectionTitle = { fontWeight: 700, margin: '0 0 8px', fontSize: 16 };
  const item         = { display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' };

  return (
    <div style={card}>
      {/* 상단: 제목(좌) / 배터리(우) */}
      <div style={header}>
        <h4 style={{ margin: 0 }}>🌱 화분 {plantId + 1} 센서 정보</h4>
        <span style={batteryPill}>
          🔋 {batteryPct.toFixed(0)}%
        </span>
      </div>

      <div style={rowWrap}>
        {/* 환경 패널 */}
        <div style={panel}>
          <div style={sectionTitle}>🏞️ 환경</div>
          <div style={item}>🌡️ <span>온도: <b>{envTemp}</b> °C</span></div>
          <div style={item}>💧 <span>습도: <b>{envHumidity}</b> %</span></div>
          <div style={item}>💡 <span>광도: <b>{light}</b> lx</span></div>
        </div>

        {/* 토양 패널 */}
        <div style={panel}>
          <div style={sectionTitle}>🪴 토양</div>
          <div style={item}>🌡️ <span>온도: <b>{soilTemp}</b> °C</span></div>
          <div style={item}>💧 <span>수분: <b>{soilMoisture}</b> %</span></div>
          <div style={item}>⚡ <span>전도도: <b>{soilEC}</b> mS/cm</span></div>
        </div>
      </div>
    </div>
  );
}
