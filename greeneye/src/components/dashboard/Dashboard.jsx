import React, { useState } from 'react';
import { useNavigate }      from 'react-router-dom';

import PlantGallery from './PlantGallery';
import SensorInfo   from './SensorInfo';
import StatsChart   from './StatsChart';
import ControlPanel from './ControlPanel';

export default function Dashboard() {
  const navigate = useNavigate();
  const [plants, setPlants]               = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleSelect = (index, newFiles) => {
    if (index === -1 && newFiles) {
      setPlants(prev => [...prev, ...newFiles]);
    } else {
      setSelectedIndex(index);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        height: '100vh',
        padding: '10px 20px'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 800,
          gap: 8
        }}
      >
        {/* AI 챗봇 바로가기 */}
        <button
          onClick={() => navigate('/assistant')}
          style={{
            padding:    '6px 12px',
            background: '#1e40af',
            color:      'white',
            border:     'none',
            borderRadius: 4,
            cursor:     'pointer',
            alignSelf:  'flex-start'
          }}
        >
          AI 챗봇 바로가기
        </button>

        {/* 1) 화분 갤러리 */}
        <PlantGallery
          plants={plants}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
        />

        {/* 2) 선택된 화분 센서 정보 */}
        <SensorInfo plantId={selectedIndex} />

        {/* 빈 공간 채우기 */}
        <div style={{ flexGrow: 1 }} />

        {/* 3) 제어 모듈 (StatsChart 위로) */}
        <ControlPanel plantId={selectedIndex} />

        {/* 4) 통계 차트: 화분이 하나 이상 있을 때만 */}
        {plants.length > 0 && <StatsChart />}
      </div>
    </div>
  );
}