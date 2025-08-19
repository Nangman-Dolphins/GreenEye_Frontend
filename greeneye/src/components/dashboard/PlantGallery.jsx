// src/components/dashboard/PlantGallery.jsx
import React from 'react';

export default function PlantGallery({
  devices = [],
  selectedIndex = 0,
  onSelect = () => {},
  onDeleteSelected = () => {},
}) {
  const disabled = devices.length === 0;

  // 원본 인덱스를 유지해 onSelect(i) 정확히 동작
  const list = devices.map((d, i) => ({
    ...d,
    __index: i,
    room: (d?.room ?? '').trim(),
  }));
  const normRoom = (r) => (r ? r : '미지정');

  // 방 집합 + 정렬
  const rooms = Array.from(new Set(list.map((d) => normRoom(d.room))))
    .sort((a, b) => a.localeCompare(b, 'ko'));

  // 방별 아이템 그룹
  const grouped = rooms.map((room) => ({
    room,
    items: list.filter((d) => normRoom(d.room) === room),
  }));

  // 2개씩 줄(행)으로 묶기
  const chunk2 = (arr) => {
    const out = [];
    for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
    return out;
  };
  const rows = chunk2(grouped);

  const headBtn = {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? '#fca5a5' : '#ef4444',
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  const roomTag = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#eef2ff',
    color: '#3730a3',
    fontSize: 12,
    fontWeight: 700,
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
      {/* 헤더: 제목 + 우측 상단 삭제버튼 */}
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
          {rows.map((pair, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              // 가로 2열 고정
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                columnGap: 16,
                rowGap: 0,
                // 행 사이에 점선(수평) 구분 원하면 아래 주석 해제:
                // borderTop: rowIdx === 0 ? 'none' : '1px dotted #d1d5db', paddingTop: rowIdx === 0 ? 0 : 12,
              }}
            >
              {pair.map((grp, colIdx) => (
                <div
                  key={grp.room}
                  // 가운데 점선(수직) 구분: 왼쪽 칸에만 보더
                  style={{
                    paddingRight: colIdx === 0 ? 16 : 0,
                    marginRight: colIdx === 0 ? 8 : 0,
                    borderRight: colIdx === 0 ? '2px dotted #d1d5db' : 'none',
                    minWidth: 0, // flex/grid overflow 방지
                  }}
                >
                  {/* 방 섹션 헤더 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      margin: '0 0 8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={roomTag}>{grp.room}</span>
                      <span style={{ color: '#6b7280', fontSize: 12 }}>총 {grp.items.length}대</span>
                    </div>
                  </div>

                  {/* 방별 그리드(디바이스 카드) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {grp.items.map((d) => {
                      const selected = d.__index === selectedIndex;
                      return (
                        <button
                          key={d.deviceCode || d.__index}
                          onClick={() => onSelect(d.__index)}
                          style={{
                            textAlign: 'left',
                            padding: 8,
                            borderRadius: 10,
                            border: selected ? '2px solid #1e40af' : '1px solid #e5e7eb',
                            background: '#fff',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          {/* 방 배지 (카드 우상단) */}
                          <div style={{ position: 'absolute', top: 8, right: 8 }}>
                            <span style={roomTag}>{normRoom(d.room)}</span>
                          </div>

                          <div
                            style={{
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
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {d.name || '이름 없음'}
                          </div>
                          <div
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: '#374151',
                              marginTop: 2,
                            }}
                          >
                            {d.deviceCode}
                          </div>
                          {selected && (
                            <div style={{ marginTop: 6, color: '#1e40af', fontSize: 12 }}>
                              ✅ 선택됨
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* 방 개수가 홀수면 오른쪽 빈칸 채우기(구분선 균형) */}
              {pair.length === 1 && (
                <div aria-hidden style={{ minHeight: 1 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
