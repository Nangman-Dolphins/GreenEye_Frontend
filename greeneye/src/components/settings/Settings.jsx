import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LS_KEY = 'greeneye_settings';

const DEFAULTS = {
  sensorRefreshMinutes: 5,      // 1~1440 권장
  nightFlashMode: 'always_on',  // always_on | always_off | off_night_only
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

export default function Settings() {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(loadSettings());
  }, []);

  const onChangeNumber = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value.replace(/[^\d]/g, '') }));
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSave = () => {
    let minutes = parseInt(form.sensorRefreshMinutes, 10);
    if (Number.isNaN(minutes) || minutes <= 0) minutes = DEFAULTS.sensorRefreshMinutes;
    if (minutes > 1440) minutes = 1440;

    const data = {
      sensorRefreshMinutes: minutes,
      nightFlashMode: form.nightFlashMode || DEFAULTS.nightFlashMode,
    };

    saveSettings(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => {
    setForm({ ...DEFAULTS });
    saveSettings({ ...DEFAULTS });
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f3f4f6'
    }}>
      <div style={{
        width: 520, padding: 24, background: '#fff', borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)', boxSizing: 'border-box'
      }}>
        <h2 style={{ margin: '0 0 16px' }}>설정</h2>

        {/* 센서 갱신 간격 (분) */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            센서 갱신 간격(분)
          </label>
          <input
            name="sensorRefreshMinutes"
            type="text"
            inputMode="numeric"
            placeholder="예) 5"
            value={form.sensorRefreshMinutes}
            onChange={onChangeNumber}
            style={{
              width: 140, boxSizing: 'border-box', padding: '10px 12px',
              border: '1px solid #ccc', borderRadius: 4
            }}
          />
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
            센서 데이터를 자동으로 다시 불러오는 간격입니다. (1~1440분 권장)
          </div>
        </div>

        {/* 밤 플래시 설정 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            밤 플래시
          </label>
          <select
            name="nightFlashMode"
            value={form.nightFlashMode}
            onChange={onChange}
            style={{
              width: 220, boxSizing: 'border-box', padding: '10px 12px',
              border: '1px solid #ccc', borderRadius: 4, background: '#fff'
            }}
          >
            <option value="always_on">항시 ON</option>
            <option value="always_off">항시 OFF</option>
            <option value="off_night_only">밤에만 OFF</option>
          </select>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
            카메라 플래시/라이트 제어 정책입니다.
          </div>
        </div>

        {/* 버튼들 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            style={{ padding: '10px 14px', background: '#1e40af',
              color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            저장
          </button>
          <button
            onClick={handleReset}
            style={{ padding: '10px 14px', background: '#e5e7eb',
              color: '#111827', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            기본값으로
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate(-1)}
            style={{ padding: '10px 14px', background: '#374151',
              color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            뒤로
          </button>
        </div>

        {saved && <div style={{ color: '#16a34a', marginTop: 10 }}>저장되었습니다.</div>}
      </div>
    </div>
  );
}
