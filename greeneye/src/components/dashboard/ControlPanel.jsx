import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const modules = ['가습기', 'UV조명', 'FAN', '급수기'];

export default function ControlPanel() {
  const { authFetch } = useContext(AuthContext);

  const toggle = async mod => {
    await authFetch('/api/control', {
      method: 'POST',
      body: JSON.stringify({ module: mod, action: 'toggle' })
    });
    alert(`${mod} 제어 요청 전송됨`);
  };

  return (
    <div className="control-panel">
      <h3>제어 모듈</h3>
      {modules.map(m => (
        <button key={m} onClick={() => toggle(m)}>
          {m} 토글
        </button>
      ))}
    </div>
  );
}