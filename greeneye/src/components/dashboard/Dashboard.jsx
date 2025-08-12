// src/components/dashboard/Dashboard.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { AuthContext } from '../../context/AuthContext.jsx';
import PlantGallery from './PlantGallery.jsx';
import SensorInfo   from './SensorInfo.jsx';
import ControlPanel from './ControlPanel.jsx';
import StatsChart   from './StatsChart.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const [plants, setPlants] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleSelect = (index, addedFiles) => {
    if (index === -1 && addedFiles) {
      setPlants(prev => [...prev, ...addedFiles]);
    } else {
      setSelectedIndex(index);
    }
  };

  const handleLogout = () => {
    try { if (typeof logout === 'function') logout(); } catch {}
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '10px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 900, gap: 10 }}>
        {/* 상단 바: 좌측 챗봇 / 우측 설정+기기연결+로그아웃 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/assistant')}
            style={{ padding: '6px 12px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            AI 챗봇 바로가기
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/settings')}
              style={{ padding: '6px 12px', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              설정
            </button>
            <button
              onClick={() => navigate('/devices/link')}
              style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              title="장치 아이디(2-2-4)로 기기 등록"
            >
              기기 연결
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 본문 */}
        <PlantGallery
          plants={plants}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
        />

        <SensorInfo plantId={selectedIndex} />

        <div style={{ height: 6 }} />

        <ControlPanel plantId={selectedIndex} />

        {plants.length > 0 && <StatsChart />}
      </div>
    </div>
  );
}
