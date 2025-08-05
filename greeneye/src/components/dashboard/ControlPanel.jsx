import React, { useState } from 'react';

export default function ControlPanel({ plantId }) {
  // plantId: -1 이면 미선택, 0,1,2… 인덱스
  const actuators = [
    { id: 'humidifier', label: '가습기' },
    { id: 'uvLight',     label: 'UV조명' },
    { id: 'fan',         label: 'FAN' },
    { id: 'waterPump',   label: '급수기' }
  ];

  const [stateMap, setStateMap] = useState({});

  const onToggle = (actId) => {
    if (plantId < 0) return; // 선택된 Plant가 없으면 무시
    const key = `${plantId}-${actId}`; 
    setStateMap(prev => {
      const next = !prev[key];
      console.log(`plant ${plantId} / ${actId} →`, next ? 'ON' : 'OFF');
      return { ...prev, [key]: next };
    });
  };

  return (
    <div style={{
      padding: 16,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 12px' }}>
        ⚙️ 제어 모듈&nbsp;
        {plantId >= 0 ? `(화분 ${plantId + 1} 선택됨)` : '(화분을 선택하세요)'}
      </h3>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {actuators.map(act => {
          const key = `${plantId}-${act.id}`;
          const on = !!stateMap[key];
          return (
            <button
              key={act.id}
              onClick={() => onToggle(act.id)}
              disabled={plantId < 0}
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: 4,
                background: on ? '#4caf50' : '#f5f5f5',
                color:      on ? 'white'    : 'black',
                cursor: plantId < 0 ? 'not-allowed' : 'pointer',
                minWidth: 100
              }}
            >
              {act.label} {on ? 'ON' : 'OFF'}
            </button>
          );
        })}
      </div>
    </div>
  );
}