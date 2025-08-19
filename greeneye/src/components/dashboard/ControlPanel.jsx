//ControlPanel.jsx
import React, { useState } from 'react';

export default function ControlPanel({ plantId, deviceCode }) {
  const actuatorList = ['humidifier','uv','fan','waterpump'];
  const [stateMap, setStateMap] = useState({});

  const handleToggle = (aid) => {
    if (plantId < 0 && !deviceCode) return;

    const key = `${deviceCode ?? plantId}-${aid}`;
    const next = !stateMap[key];
    setStateMap(s => ({ ...s, [key]: next }));

    const url = deviceCode
      ? `/api/control/device/${encodeURIComponent(deviceCode)}/${aid}`
      : `/api/control/${plantId}/${aid}`;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ on: next }),
    }).catch(() => {
      setStateMap(s => ({ ...s, [key]: !next }));
      alert('제어 명령 전송에 실패했습니다.');
    });
  };

  return (
    <div style={{ padding:16, background:'#fff', borderRadius:8, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
      <h4 style={{ marginTop:0 }}>
        🔧 제어 모듈 — {deviceCode ? `장치 ${deviceCode}` : plantId >= 0 ? `화분 ${plantId + 1}` : '미선택'}
      </h4>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {actuatorList.map(aid => {
          const key = `${deviceCode ?? plantId}-${aid}`;
          const isOn = !!stateMap[key];
          return (
            <button key={aid} onClick={() => handleToggle(aid)}
              style={{
                padding:'10px 14px',
                border:'1px solid #e5e7eb',
                borderRadius:8,
                background: isOn ? '#16a34a' : '#e5e7eb',
                color: isOn ? '#fff' : '#111827',
                cursor:'pointer',
                minWidth:110
              }}>
              {aid.toUpperCase()} {isOn ? 'ON' : 'OFF'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
