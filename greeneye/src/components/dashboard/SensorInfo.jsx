import React, { useEffect, useState } from 'react';

// 필요 시 프로젝트의 fetch 함수/소켓 훅으로 바꿔주세요.
async function fetchSensorSnapshot(plantId) {
  // 백엔드 준비되면 이 부분을 실제 API로 교체
  // 예: const res = await fetch(`/api/sensors/${plantId}`); return res.json();
  // 임시 더미 (로드 실패 시 0으로 표시)
  return {
    env: { temp: 0, humi: 0, lux: 0 },
    soil: { temp: 0, moisture: 0, ec: 0 },
    battery: 0,
  };
}

export default function SensorInfo({ plantId, deviceName = '' }) {
  const [data, setData] = useState({
    env: { temp: 0, humi: 0, lux: 0 },
    soil: { temp: 0, moisture: 0, ec: 0 },
    battery: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!plantId) {
        // 선택 안 된 경우 기본 0
        setData({
          env: { temp: 0, humi: 0, lux: 0 },
          soil: { temp: 0, moisture: 0, ec: 0 },
          battery: 0,
        });
        return;
      }
      setLoading(true);
      try {
        const res = await fetchSensorSnapshot(plantId);
        if (alive) setData(res);
      } catch (e) {
        // 실패 시 0으로 유지
        if (alive) {
          setData({
            env: { temp: 0, humi: 0, lux: 0 },
            soil: { temp: 0, moisture: 0, ec: 0 },
            battery: 0,
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [plantId]);

  const title = (deviceName && deviceName.trim()) || (plantId || '미선택');

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        padding: 16,
      }}
    >
      {/* 헤더: 이름을 우선 표시 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          🌱 {title} 센서 정보
        </div>

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
          {data.battery ?? 0}%
        </div>
      </div>

      {/* 환경/토양 2열 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
      >
        {/* 환경 */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🖼️ 환경</div>
          <div>🌡️ 온도: <b>{Number(data.env?.temp ?? 0)} °C</b></div>
          <div>💧 습도: <b>{Number(data.env?.humi ?? 0)} %</b></div>
          <div>💡 광도: <b>{Number(data.env?.lux ?? 0)} lx</b></div>
        </div>

        {/* 토양 */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 8,
            padding: 16,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>🪴 토양</div>
          <div>🌡️ 온도: <b>{Number(data.soil?.temp ?? 0)} °C</b></div>
          <div>💧 수분: <b>{Number(data.soil?.moisture ?? 0)} %</b></div>
          <div>⚡ 전도도: <b>{Number(data.soil?.ec ?? 0)} mS/cm</b></div>
        </div>
      </div>

      {loading && (
        <div style={{ marginTop: 8, color: '#6b7280' }}>불러오는 중…</div>
      )}
    </div>
  );
}
