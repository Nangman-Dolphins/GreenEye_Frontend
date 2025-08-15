// src/components/dashboard/SensorInfo.jsx
import React, { useEffect, useState } from 'react';

export default function SensorInfo({ plantId, deviceCode }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (plantId < 0 && !deviceCode) { setData(null); setError(false); return; }
    setData(null); setError(false);

    const url = deviceCode
      ? `/api/sensors/device/${encodeURIComponent(deviceCode)}`
      : `/api/sensors/${plantId}`;

    fetch(url)
      .then(res => { if (!res.ok) throw new Error('bad status'); return res.json(); })
      .then(json => setData(json))
      .catch(() => setError(true));
  }, [plantId, deviceCode]);

  if (plantId < 0 && !deviceCode) return <div style={{ color:'#666' }}>🌱 화분을 선택하세요.</div>;
  if (!data && !error) return <div>🔄 센서 데이터 로딩 중…</div>;

  const safe = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

  // 백엔드 키 매핑(필요 시 조정)
  const envTemp      = safe(error ? 0 : (data?.envTemp ?? data?.temperature));
  const envHumidity  = safe(error ? 0 : (data?.envHumidity ?? data?.humidity));
  const light        = safe(error ? 0 : data?.light);

  const soilTemp     = safe(error ? 0 : data?.soilTemp);
  const soilMoisture = safe(error ? 0 : data?.soilMoisture);
  const soilEC       = safe(error ? 0 : data?.soilEC);

  const batteryPct   = Math.max(0, Math.min(100, safe(error ? 0 : (data?.battery ?? data?.batteryPct ?? data?.battery_percent))));

  const card = { margin:0, padding:16, background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' };
  const rowWrap = { display:'flex', gap:12, alignItems:'stretch', flexWrap:'wrap' };
  const panel = { flex:1, minWidth:260, background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:12, boxSizing:'border-box' };
  const sectionTitle = { fontWeight:700, margin:'0 0 8px', fontSize:16 };

  return (
    <div style={card}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
        <h4 style={{ margin:0 }}>🌱 {deviceCode ? `장치 ${deviceCode}` : `화분 ${plantId + 1}`} 센서 정보</h4>
        <span style={{ padding:'4px 10px', borderRadius:9999, border:'1px solid #ddd', fontWeight:600 }}>🔋 {batteryPct.toFixed(0)}%</span>
      </div>

      <div style={rowWrap}>
        <div style={panel}>
          <div style={sectionTitle}>🏞️ 환경</div>
          <div>🌡️ 온도: <b>{envTemp}</b> °C</div>
          <div>💧 습도: <b>{envHumidity}</b> %</div>
          <div>💡 광도: <b>{light}</b> lx</div>
        </div>
        <div style={panel}>
          <div style={sectionTitle}>🪴 토양</div>
          <div>🌡️ 온도: <b>{soilTemp}</b> °C</div>
          <div>💧 수분: <b>{soilMoisture}</b> %</div>
          <div>⚡ 전도도: <b>{soilEC}</b> mS/cm</div>
        </div>
      </div>
    </div>
  );
}
