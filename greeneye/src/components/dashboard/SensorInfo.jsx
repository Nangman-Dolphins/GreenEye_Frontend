import React, { useState, useEffect } from 'react';

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
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(json => setData(json))
      .catch(() => setError(true));
  }, [plantId]);

  // 화분 미선택
  if (plantId < 0) {
    return <div style={{ color: '#666' }}>🌱 화분을 선택하세요.</div>;
  }
  // 로딩 중
  if (!data && !error) {
    return <div>🔄 화분 {plantId + 1} 센서 데이터 로딩 중…</div>;
  }

  // 에러 시 0으로 대체
  const {
    temperature   = 0,
    humidity      = 0,
    light         = 0,
    soilMoisture  = 0
  } = error ? {} : data;

  return (
    <div
      style={{
        margin: 0,
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
      }}
    >
      <h4 style={{ margin: '0 0 8px' }}>🌱 화분 {plantId + 1} 센서 정보</h4>
      <p>🌡️ 온도: {temperature}°C</p>
      <p>💧 습도: {humidity}%</p>
      <p>💡 조도: {light} lx</p>
      <p>🪴 토양 습도: {soilMoisture}%</p>
    </div>
  );
}