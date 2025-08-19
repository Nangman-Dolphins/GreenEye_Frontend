// src/components/dashboard/Dashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import SensorInfo from './SensorInfo';
import ControlPanel from './ControlPanel';
import PlantGallery from './PlantGallery';
import { AuthContext } from '../../context/AuthContext';

const LS_DEVICES = 'greeneye_devices';

// 공백만 무시(대/소문자 구분)
const codeTrim = (v) => String(v ?? '').trim();
const eqCode = (a, b) => codeTrim(a) === codeTrim(b);

// 동일 문자열만 병합(대/소문자 다르면 별개)
const dedupeByCode = (list = []) => {
  const map = new Map();
  for (const d of list) {
    const key = codeTrim(d?.deviceCode);
    if (!key) continue;
    map.set(key, { ...map.get(key), ...d, deviceCode: d?.deviceCode });
  }
  return Array.from(map.values());
};

const loadDevices = () => {
  try {
    const raw = localStorage.getItem(LS_DEVICES);
    if (!raw) return [];
    return dedupeByCode(JSON.parse(raw));
  } catch { return []; }
};

const saveDevices = (list) => {
  localStorage.setItem(LS_DEVICES, JSON.stringify(list));
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext) || { logout: () => {} };

  const [devices, setDevices] = useState(() => loadDevices());
  const [selectedIndex, setSelectedIndex] = useState(0);

  // DeviceLink에서 복귀 시 최신 로컬 반영 + 선택 유지
  useEffect(() => {
    if (location.state?.addedDevice) {
      const fresh = loadDevices();
      setDevices(fresh);
      const idx = fresh.findIndex(d => eqCode(d.deviceCode, location.state.addedDevice.deviceCode));
      if (idx >= 0) setSelectedIndex(idx);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  // 다른 탭 동기화
  useEffect(() => {
    const onStorage = (e) => { if (e.key === LS_DEVICES) setDevices(loadDevices()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const current = devices[selectedIndex] || null;
  const currentDeviceCode = current?.deviceCode || '';

  // 선택 삭제
  const handleDeleteSelected = () => {
    if (!currentDeviceCode) return alert('삭제할 기기를 먼저 선택하세요.');
    const label = current?.name || currentDeviceCode;
    if (!window.confirm(`선택한 기기(${label})를 삭제할까요?\n삭제 후 되돌릴 수 없습니다.`)) return;

    const next = devices.filter(d => !eqCode(d.deviceCode, currentDeviceCode));
    saveDevices(next);
    setDevices(next);
    setSelectedIndex(prev => (next.length === 0 ? 0 : Math.min(prev, next.length - 1)));
    alert('삭제 완료!');
  };

  const btn = (bg, color = '#fff') => ({
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
    background: bg,
    color,
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 16 }}>
      {/* 상단 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button style={btn('#1e40af')} onClick={() => navigate('/assistant')}>AI 챗봇 바로가기</button>
        <div style={{ flex: 1 }} />
        <button style={btn('#334155')} onClick={() => navigate('/settings')}>설정</button>
        <button style={btn('#16a34a')} onClick={() => navigate('/devices/link')}>기기 연결</button>
        <button
          style={btn('#dc2626')}
          onClick={() => { try { logout?.(); } catch {} navigate('/login', { replace: true }); }}
        >
          로그아웃
        </button>
      </div>

      {/* 갤러리 (우측 상단에 삭제 버튼 표시) */}
      <PlantGallery
        devices={devices}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* 센서 카드 */}
      <div style={{ marginTop: 16 }}>
        <SensorInfo deviceCode={currentDeviceCode} deviceName={current?.name || ''} />
      </div>

      {/* 제어 패널 */}
      <div style={{ marginTop: 16 }}>
        <ControlPanel deviceCode={currentDeviceCode} />
      </div>
    </div>
  );
}
