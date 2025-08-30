// src/components/dashboard/Dashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import SensorInfo from './SensorInfo';
import ControlPanel from './ControlPanel';
import PlantGallery from './PlantGallery';
import { AuthContext } from '../../context/AuthContext';

/* ── 공통: 코드 정규화(핵심) ───────────────────────── */
/** 영숫자 소문자만 */
const alnum = (s) => String(s ?? '').toLowerCase().replace(/[^0-9a-z]/g, '');
/** 마지막 4자리(영숫자) */
const last4 = (s) => alnum(s).slice(-4);
/** 정규형: ge-sd-xxxx (xxxx는 16진 4자리면 적용, 아니면 알파넘 그대로 반환) */
const canonical = (s) => {
  const tail = last4(s);
  return /^[0-9a-f]{4}$/.test(tail) ? `ge-sd-${tail}` : alnum(s);
};

const sameCode = (a, b) => canonical(a) === canonical(b);

/* ── 계정별 로컬 키 & 유틸 ───────────────────────── */
const hashStr = (str) => { let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return (h>>>0).toString(36); };
const userKeyFromToken = (t) => (t ? hashStr(String(t)) : 'guest');

const thumbsKeyForUser     = (t) => `greeneye_thumbs:${userKeyFromToken(t)}`;
const metaKeyForUser       = (t) => `greeneye_meta:${userKeyFromToken(t)}`;
const clientDevsKeyForUser = (t) => `greeneye_client_devices:${userKeyFromToken(t)}`;
const deletedKeyForUser    = (t) => `greeneye_deleted:${userKeyFromToken(t)}`;     // 삭제 캐시(정규형으로 저장)
const LS_SETTINGS          = 'greeneye_settings';
const LS_DEVICES_LEGACY    = 'greeneye_devices';                                    // 과거 키

const read = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const readThumbs = (t) => read(thumbsKeyForUser(t), {});
const readMeta   = (t) => read(metaKeyForUser(t), {});
const readClientDevs = (t) => read(clientDevsKeyForUser(t), []);
const writeClientDevs = (t, arr) => write(clientDevsKeyForUser(t), arr);

const readDeleted = (t) => new Set(read(deletedKeyForUser(t), []));
const addDeleted  = (t, code) => { const s = readDeleted(t); s.add(canonical(code)); write(deletedKeyForUser(t), [...s]); };
const removeDeleted = (t, code) => { const s = readDeleted(t); s.delete(canonical(code)); write(deletedKeyForUser(t), [...s]); };

const purgeLegacyLS = (targetCode) => { // 레거시 리스트에서도 제거(정규형 비교)
  try {
    const curr = read(LS_DEVICES_LEGACY, []);
    const next = curr.filter(d => !sameCode(d.deviceCode ?? d.device_code ?? d.device_id ?? d.mac, targetCode));
    write(LS_DEVICES_LEGACY, next);
  } catch {}
};

/* 서버 응답 정규화: deviceCode=정규형, rawCode=서버 원본 */
const normDevice = (x = {}) => {
  const raw = String(x.deviceCode ?? x.device_id ?? x.device_code ?? x.mac ?? '').trim();
  const code = canonical(raw);
  return {
    deviceCode: code,
    rawCode: raw || code,
    name: x.name ?? x.friendly_name ?? code,
    imageUrl: x.imageUrl ?? x.thumbnail_url ?? x.photoUrl ?? x.image_filename ?? '',
    room: x.room ?? '',
    species: x.species ?? '',
  };
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, authFetch, token } = useContext(AuthContext) || { logout: () => {} };

  const [devices, setDevices] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  /* 서버 목록 + 로컬 임시목록 + (레거시) 유니온 (+ 삭제 캐시로 필터) */
  const reloadDevices = async () => {
    try {
      const r = await authFetch('/api/devices', { cache: 'no-store' });
      const arr = r.ok ? (await r.json()) : [];
      const api = Array.isArray(arr) ? arr.map(normDevice) : [];

      const locals = readClientDevs(token).map(normDevice);
      const legacy = read(LS_DEVICES_LEGACY, []).map(normDevice);

      // 오프라인/로컬에서 재등록된 코드는 삭제 캐시에서 자동 복구
      const del = readDeleted(token);
      locals.forEach(d => del.delete(d.deviceCode));
      write(deletedKeyForUser(token), [...del]);

      const thumbs = readThumbs(token);
      const meta   = readMeta(token);

      const map = new Map();
      [...locals, ...legacy, ...api].forEach(d => {
        if (!d.deviceCode) return;
        if (del.has(d.deviceCode)) return; // 삭제된 것은 무조건 숨김
        const prev = map.get(d.deviceCode) || {};
        map.set(d.deviceCode, {
          ...prev,
          ...d,
          imageUrl: thumbs[d.deviceCode] ?? d.imageUrl ?? prev.imageUrl,
          species: (meta[d.deviceCode]?.species ?? d.species ?? prev.species),
          room:    (meta[d.deviceCode]?.room    ?? d.room    ?? prev.room),
        });
      });
      setDevices([...map.values()]);
    } catch {
      const del = readDeleted(token);
      const locals = readClientDevs(token).map(normDevice);
      const thumbs = readThumbs(token);
      const meta   = readMeta(token);
      const list = locals
        .filter(d => !del.has(d.deviceCode))
        .map(d => ({ ...d, imageUrl: thumbs[d.deviceCode] ?? d.imageUrl, species: meta[d.deviceCode]?.species ?? d.species, room: meta[d.deviceCode]?.room ?? d.room }));
      setDevices(list);
    }
  };

  // useEffect(() => { reloadDevices(); }, [authFetch, token]); !삭제!(401에러)
  useEffect(() => {        // !추가(4줄)!
   if (!token) return;     // ☆ 토큰 준비되면 그때 호출
   reloadDevices();
 }, [authFetch, token]);

  /* 등록 직후 선택 유지 */
  useEffect(() => {
    if (location.state?.addedDevice) {
      const { deviceCode } = location.state.addedDevice || {};
      const idx = devices.findIndex(d => sameCode(d.deviceCode, deviceCode));
      if (idx >= 0) setSelectedIndex(idx);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, devices]);

  /* 스토리지/커스텀 이벤트로 즉시 갱신 */
  useEffect(() => {
    const keys = [
      thumbsKeyForUser(token), metaKeyForUser(token),
      clientDevsKeyForUser(token), deletedKeyForUser(token),
      LS_DEVICES_LEGACY,
    ];
    const onStorage = (e) => { if (!e.key || keys.includes(e.key)) reloadDevices(); };
    const onCustom = () => reloadDevices();
    window.addEventListener('storage', onStorage);
    window.addEventListener('greeneye:client-devices-updated', onCustom);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('greeneye:client-devices-updated', onCustom); };
  }, [authFetch, token]);

  const current = devices[selectedIndex] || null;
  const currentDeviceCode = current?.deviceCode || '';
  const currentRawCode = current?.rawCode || currentDeviceCode;

  /* ── 삭제 처리 ───────────────────────────────────── */
  const tryApiDeleteOne = async (codeVariant) => {
    const paths = [
      { method: 'DELETE', path: `/api/devices/${encodeURIComponent(codeVariant)}` },
      { method: 'POST',   path: `/api/devices/${encodeURIComponent(codeVariant)}/delete` },
      { method: 'DELETE', path: `/api/device/${encodeURIComponent(codeVariant)}` },
    ];
    for (const p of paths) {
      try {
        const res = await authFetch(p.path, { method: p.method });
        if (res.ok) return true;
      } catch { /* next */ }
    }
    return false;
  };

  const tryApiDelete = async (raw) => {
    // 서버가 어떤 형식을 기대할지 몰라서 raw → last4 → canonical 순으로 시도
    const variants = [];
    if (raw) variants.push(raw);
    const tail = last4(raw);
    if (tail) variants.push(tail);
    const can = canonical(raw);
    if (can && !variants.includes(can)) variants.push(can);
    for (const v of variants) {
      const ok = await tryApiDeleteOne(v);
      if (ok) return true;
    }
    return false;
  };

  const removeLocalEverywhere = (code) => {
    const can = canonical(code);

    // 1) 로컬 임시 목록
    const list = readClientDevs(token).filter(d => !sameCode(d.deviceCode, can));
    writeClientDevs(token, list);

    // 2) 썸네일/메타
    try {
      const t = readThumbs(token); Object.keys(t).forEach(k => { if (sameCode(k, can)) delete t[k]; }); write(thumbsKeyForUser(token), t);
      const m = readMeta(token);   Object.keys(m).forEach(k => { if (sameCode(k, can)) delete m[k]; }); write(metaKeyForUser(token), m);
    } catch {}

    // 3) 설정의 카메라 대상 해제
    try {
      const s = read(LS_SETTINGS, {});
      if (s.cameraTargetDevice && sameCode(s.cameraTargetDevice, can)) {
        s.cameraTargetDevice = '';
        write(LS_SETTINGS, s);
        window.dispatchEvent(new CustomEvent('greeneye:settings-updated'));
      }
    } catch {}

    // 4) 레거시 목록 정리
    purgeLegacyLS(can);

    // 5) 브로드캐스트
    window.dispatchEvent(new CustomEvent('greeneye:client-devices-updated'));
  };

  const handleDeleteSelected = async () => {
    if (!currentDeviceCode) return alert('삭제할 기기를 먼저 선택하세요.');
    const label = current?.name || currentDeviceCode;
    if (!window.confirm(`선택한 기기(${label})를 삭제할까요?\n서버/로컬에서 제거됩니다.`)) return;

    // 서버 삭제 시도 (raw → tail4 → canonical)
    const ok = await tryApiDelete(currentRawCode);
    if (!ok) console.warn('[delete] server delete failed or unsupported; applying client-side hide');

    // 삭제 캐시에 넣어 재등장 방지(정규형)
    addDeleted(token, currentDeviceCode);

    // 로컬 정리
    removeLocalEverywhere(currentDeviceCode);

    // UI 즉시 반영
    setDevices(prev => prev.filter(d => !sameCode(d.deviceCode, currentDeviceCode)));
    setSelectedIndex(0);

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
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button style={btn('#1e40af')} onClick={() => navigate('/assistant')}>AI 챗봇 바로가기</button>
        <div className="spacer" style={{ flex: 1 }} />
        <button style={btn('#334155')} onClick={() => navigate('/settings')}>설정</button>
        <button style={btn('#16a34a')} onClick={() => navigate('/devices/link')}>기기 연결</button>
        <button
          style={btn('#dc2626')}
          onClick={() => { try { logout?.(); } catch {} navigate('/login', { replace: true }); }}
        >
          로그아웃
        </button>
      </div>

      {/* 갤러리 */}
      <PlantGallery
        devices={devices}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* 센서 카드 */}
      <div style={{ marginTop: 16 }}>
        <SensorInfo deviceCode={current?.deviceCode || ''} deviceName={current?.name || ''} />
      </div>

      {/* 제어 패널 */}
      <div style={{ marginTop: 16 }}>
        <ControlPanel deviceCode={current?.deviceCode || ''} />
      </div>
    </div>
  );
}
