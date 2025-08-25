// src/mocks/fallbackFetch.js
export function installFetchMock() {
  const originalFetch = window.fetch.bind(window);
  console.log('[MockFetch] installed');

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';

    // 최신 센서 스냅샷
    if (url.startsWith('/api/latest_sensor_data/')) {
      await delay(250);
      return json(makeSnapshot());
    }

    // 기기 목록 (필요 없으면 삭제해도 됨)
    if (url === '/api/devices') {
      await delay(200);
      return json([
        { device_code: '1111', friendly_name: '1' },
        { device_code: 'eef1', friendly_name: 'Basil A' },
      ]);
    }

    // 제어 요청 성공만 반환
    if (url.startsWith('/api/control_device/')) {
      await delay(150);
      return new Response(null, { status: 200 });
    }

    return originalFetch(input, init);
  };
}

// 유틸
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function rnd(a, b, f = 1) {
  const x = a + Math.random() * (b - a);
  return +x.toFixed(f);
}
function makeSnapshot() {
  return {
    temperature: rnd(20, 28, 1),
    humidity: rnd(40, 70, 1),
    light_lux: rnd(200, 1500, 0),
    soil_temp: rnd(18, 24, 1),
    soil_moisture: rnd(30, 80, 1),
    soil_ec: rnd(0.5, 2.5, 2),
    battery: rnd(40, 95, 0),
  };
}
