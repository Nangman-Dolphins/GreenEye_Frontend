// src/components/dashboard/ControlPanel.jsx
import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ACTUATORS = [
  {
    id: 'humidifier',
    label: 'HUMIDIFIER',
    makePayload: (on) => ({ humidifier_action: on ? 1 : 0 }),
  },
  {
    id: 'uv', // LED
    label: 'UV',
    makePayload: (on) => ({ flash_en: on ? 1 : 0 }),
  },
  {
    id: 'fan',
    label: 'FAN',
    // 백엔드가 그대로 포워딩하므로 전송 가능(디바이스가 미지원이면 무시될 수 있음)
    makePayload: (on) => ({ fan_action: on ? 1 : 0 }),
  },
  {
    id: 'waterpump',
    label: 'WATERPUMP',
    // 켤 때 기본 3초 동작, 끌 때 duration은 생략/0
    makePayload: (on) =>
      on ? { water_pump_action: 1, water_pump_duration: 3 } : { water_pump_action: 0 },
  },
];

export default function ControlPanel({ deviceCode }) {
  const { authFetch } = useContext(AuthContext);
  const [stateMap, setStateMap] = useState({}); // { [key]: boolean }
  const [busy, setBusy] = useState(false);

  const toggle = async (aid) => {
    if (!deviceCode || busy) return;

    const key = `${deviceCode}-${aid}`;
    const next = !stateMap[key];

    // 낙관적 UI
    setStateMap((s) => ({ ...s, [key]: next }));
    setBusy(true);

    try {
      const actuator = ACTUATORS.find((a) => a.id === aid);
      const payload = actuator?.makePayload(next) || {};
      const res = await authFetch(`/api/control_device/${encodeURIComponent(deviceCode)}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text().catch(() => ''));
      }
      // 성공: 그대로 유지
    } catch (e) {
      // 실패: 원복
      setStateMap((s) => ({ ...s, [key]: !next }));
      alert(`제어 실패: ${e?.message || '알 수 없음'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <h4 style={{ marginTop: 0 }}>🔧 제어 모듈 — {deviceCode || '미선택'}</h4>

      {/* 버튼을 왼쪽 정렬 + 넉넉한 간격 */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {ACTUATORS.map(({ id, label }) => {
          const key = `${deviceCode}-${id}`;
          const isOn = !!stateMap[key];
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              disabled={!deviceCode || busy}
              style={{
                padding: '10px 16px',
                minWidth: 120,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: isOn ? '#16a34a' : '#e5e7eb',
                color: isOn ? '#fff' : '#111827',
                cursor: !deviceCode || busy ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
              title={label}
            >
              {label} {isOn ? 'ON' : 'OFF'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
