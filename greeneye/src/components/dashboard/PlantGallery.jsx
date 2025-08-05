import React, { useState } from 'react';

export default function PlantGallery({ plants, selectedIndex, onSelect }) {
  // plants: [{ file, url }] 배열
  // selectedIndex: 현재 선택된 인덱스
  // onSelect(i): i번 화분 선택 콜백

  return (
    <div style={{
      marginTop: 24,
      padding: 16,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 12px' }}>🌱 나의 화분 갤러리</h3>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={e => {
          const files = Array.from(e.target.files).map(f => ({
            file: f,
            url: URL.createObjectURL(f)
          }));
          e.target.value = null;
          onSelect(-1, files);  // -1 신호로 “새로 추가” 처리
        }}
        style={{ marginBottom: 12 }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {plants.map((p, i) => (
          <div
            key={i}
            onClick={() => onSelect(i)}
            style={{
              position: 'relative',
              width: 100,
              height: 100,
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: selectedIndex === i
                ? '0 0 0 3px #1e40af'
                : '0 1px 3px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            <img
              src={p.url}
              alt={`plant-${i}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}