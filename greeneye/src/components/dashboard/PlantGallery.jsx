import React from 'react';

export default function PlantGallery({
  devices = [],
  selectedIndex = 0,
  onSelect = () => {},
  onDeleteSelected = () => {},
}) {
  const disabled = devices.length === 0;

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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          {devices.map((d, i) => {
            const selected = i === selectedIndex;
            return (
              <button
                key={d.deviceCode || i}
                onClick={() => onSelect(i)}
                style={{
                  textAlign: 'left',
                  padding: 8,
                  borderRadius: 10,
                  border: selected ? '2px solid #1e40af' : '1px solid #e5e7eb',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
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
      )}
    </div>
  );
}
