import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

async function fetchSensorSnapshotAPI(authFetch, deviceId) {
  const res = await authFetch(`/api/latest_sensor_data/${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('load failed');
  const j = await res.json();
  return {
    env: { temp: j.temperature ?? 0, humi: j.humidity ?? 0, lux: j.light_lux ?? 0 },
    soil: { temp: j.soil_temp ?? 0, moisture: j.soil_moisture ?? 0, ec: j.soil_ec ?? 0 },
    battery: j.battery ?? 0,
  };
}

export default function SensorInfo({ plantId, deviceName = '' }) {
  const { authFetch } = useContext(AuthContext);
  const [data, setData] = useState({ env:{temp:0,humi:0,lux:0}, soil:{temp:0,moisture:0,ec:0}, battery:0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!plantId) { setData({ env:{temp:0,humi:0,lux:0}, soil:{temp:0,moisture:0,ec:0}, battery:0 }); return; }
      setLoading(true);
      try { const s = await fetchSensorSnapshotAPI(authFetch, plantId); if (alive) setData(s); }
      catch { if (alive) setData({ env:{temp:0,humi:0,lux:0}, soil:{temp:0,moisture:0,ec:0}, battery:0 }); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [plantId, authFetch]);

  const title = (deviceName && deviceName.trim()) || (plantId || '미선택');

  return (
    <div style={{ background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)', padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontWeight:700, fontSize:18 }}>🌱 {title} 센서 정보</div>
        <div title="배터리 잔량" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'4px 10px', borderRadius:999, background:'#f3f4f6', fontWeight:700 }}>
          <span role="img" aria-label="battery">🔋</span>{data.battery ?? 0}%
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div style={{ background:'#f8fafc', borderRadius:8, padding:16, border:'1px solid #e5e7eb' }}>
          <div style={{ fontWeight:700, marginBottom:8 }}>🖼️ 환경</div>
          <div>🌡️ 온도: <b>{Number(data.env?.temp ?? 0)} °C</b></div>
          <div>💧 습도: <b>{Number(data.env?.humi ?? 0)} %</b></div>
          <div>💡 광도: <b>{Number(data.env?.lux ?? 0)} lx</b></div>
        </div>
        <div style={{ background:'#f8fafc', borderRadius:8, padding:16, border:'1px solid #e5e7eb' }}>
          <div style={{ fontWeight:700, marginBottom:8 }}>🪴 토양</div>
          <div>🌡️ 온도: <b>{Number(data.soil?.temp ?? 0)} °C</b></div>
          <div>💧 수분: <b>{Number(data.soil?.moisture ?? 0)} %</b></div>
          <div>⚡ 전도도: <b>{Number(data.soil?.ec ?? 0)} mS/cm</b></div>
        </div>
      </div>
      {loading && <div style={{ marginTop:8, color:'#6b7280' }}>불러오는 중…</div>}
    </div>
  );
}
