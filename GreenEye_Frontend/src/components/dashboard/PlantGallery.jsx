// src/components/dashboard/PlantGallery.jsx
import React from 'react';

/**
 * 식물종 문자열에서 한글만 추출
 * 예) "팬지 / 삼색제비꽃 (Pansy)" → "팬지"
 *     "라벤더 (Lavender)"          → "라벤더"
 */
function speciesKR(s) {
  if (!s) return '';
  // 괄호 안 영문 제거
  let t = String(s).replace(/\s*\([^)]*\)\s*$/g, '');
  // 슬래시로 여러 이름 있으면 첫 항목 사용
  t = t.split('/')[0].trim();
  // 한글/공백/중점(·)만 남기기 (안 남으면 원본 반환)
  const cleaned = t.replace(/[^\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3\s·]/g, '');
  return cleaned || t;
}

export default function PlantGallery({
  devices = [],
  selectedIndex = 0,
  onSelect = () => {},
  onDeleteSelected = () => {},
}) {
  const disabled = devices.length === 0;

  // 방별 그룹핑 (입력 순서 보존). 방이 없으면 '미지정'
  const groups = React.useMemo(() => {
    const map = new Map();
    devices.forEach((d, idx) => {
      const room = (d.room && String(d.room).trim()) || '미지정';
      if (!map.has(room)) map.set(room, []);
      map.get(room).push({ ...d, __idx: idx });
    });
    return Array.from(map.entries()).map(([room, items]) => ({ room, items }));
  }, [devices]);

  // 한 줄(행)에 최대 2개 그룹
  const rows = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < groups.length; i += 2) arr.push(groups.slice(i, i + 2));
    return arr;
  }, [groups]);

  const headBtn = {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? '#fca5a5' : '#ef4444',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        padding: 16,
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>🌱 나의 화분 갤러리</h3>
        <button style={headBtn} disabled={disabled} onClick={onDeleteSelected} title="선택된 기기 삭제">
          선택 기기 삭제
        </button>
      </div>

      {devices.length === 0 ? (
        <div style={{ color: '#6b7280' }}>
          등록된 기기가 없습니다. 상단의 <b>기기 연결</b>에서 먼저 추가하세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rows.map((row, rIdx) => {
            const isTwo = row.length === 2;
            return (
              <div
                key={rIdx}
                style={{
                  display: 'grid',
                  // ✅ 홀수 개(3,5,7...)인 경우에도 마지막 행의 폭이 줄지 않도록 항상 2열 레이아웃 유지
                  gridTemplateColumns: '1fr 16px 1fr',
                  gap: 12,
                  alignItems: 'stretch',
                }}
              >
                {/* 좌측 그룹 */}
                <RoomGroup group={row[0]} selectedIndex={selectedIndex} onSelect={onSelect} />

                {/* 가운데 점선 구분자: 그룹이 1개뿐이면 공간은 유지하되 시각적으로만 숨김 */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}>
                  <div
                    style={{
                      borderLeft: '2px dotted #cbd5e1',
                      height: '100%',
                      visibility: isTwo ? 'visible' : 'hidden', // 공간 유지
                    }}
                  />
                </div>

                {/* 우측 그룹: 없으면 빈 칸으로 자리만 채워 동일한 폭 유지 */}
                {isTwo ? (
                  <RoomGroup group={row[1]} selectedIndex={selectedIndex} onSelect={onSelect} />
                ) : (
                  <div aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoomGroup({ group, selectedIndex, onSelect }) {
  if (!group) return null;
  const { room, items } = group;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 방 타이틀(상단 라벨) */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          color: '#111827',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ padding: '2px 8px', border: '1px dashed #94a3b8', borderRadius: 999, background: '#f8fafc' }}>
          {room}
        </span>
      </div>

      {/* 방 안의 디바이스 카드들 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
        }}
      >
        {items.map((d) => {
          const selected = d.__idx === selectedIndex;
          const sp = speciesKR(d.species);
          return (
            <button
              key={d.deviceCode || d.__idx}
              onClick={() => onSelect(d.__idx)}
              style={{
                position: 'relative',
                textAlign: 'left',
                padding: 8,
                borderRadius: 10,
                border: selected ? '2px solid #1e40af' : '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {/* 썸네일 */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16 / 9',
                  background: '#000',
                  borderRadius: 8,
                  overflow: 'hidden',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {d.imageUrl ? (
                  <img
                    src={d.imageUrl}
                    alt={d.name || d.deviceCode}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color: '#9ca3af' }}>이미지 없음</span>
                )}

                {/* 🔖 식물종(한글) 배지 — 우측 상단 오버레이 */}
                {sp ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: '#fef3c7', // amber-100
                      color: '#92400e', // amber-800
                      border: '1px solid #fcd34d', // amber-300
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 12,
                      lineHeight: 1.2,
                      maxWidth: '80%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={sp}
                  >
                    {sp}
                  </span>
                ) : null}
              </div>

              {/* 이름/코드 */}
              <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name || '이름 없음'}</div>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#374151',
                  marginTop: 2,
                  wordBreak: 'break-all',
                }}
              >
                {d.deviceCode}
              </div>

              {/* ✅ 선택 상태 — 높이 고정(레이아웃 변동 없음) */}
              <div style={{ marginTop: 6, height: 18, display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 12,
                    color: '#1e40af',
                    visibility: selected ? 'visible' : 'hidden',
                  }}
                >
                  ✅ 선택됨
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
