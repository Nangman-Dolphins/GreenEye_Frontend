import React, { useState, useEffect } from 'react';

export default function SensorInfo() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'open' | 'error'

  useEffect(() => {
    const url = window.location.origin.replace(/^http/, 'ws') + '/ws/sensors';
    const ws  = new WebSocket(url);

    ws.onopen = () => setStatus('open');
    ws.onmessage = e => {
      try {
        setData(JSON.parse(e.data));
      } catch {
        console.warn('Invalid JSON from sensor', e.data);
      }
    };
    ws.onerror = () => setStatus('error');

    return () => ws.close();
  }, []);

  if (status === 'connecting') {
    return <div>센서 연결 중…</div>;
  }
  if (status === 'error') {
    return <div>센서 연결 실패</div>;
  }
  if (!data) {
    return <div>데이터 대기 중…</div>;
  }

  return (
    <div className="sensor-card">
      <div>🌡 온도: {data.temp}℃</div>
      <div>💧 습도: {data.hum}%</div>
      <div>💡 조도: {data.lux} lx</div>
    </div>
  );
}