import React, { useState, useRef, useEffect } from 'react';

export default function ChatAssistant() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([
    { who: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }
  ]);
  const [imgFile, setImgFile] = useState(null);
  const containerRef = useRef();

  // 새 메시지 생기면 스크롤 맨 아래로
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const sendText = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setLogs(prev => [...prev, { who: 'user', text: userMsg }]);
    setInput('');
    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        { who: 'bot', text: `"${userMsg}" 이라고 하셨군요! (임시 응답)` }
      ]);
    }, 500);
  };

  const sendImage = () => {
    if (!imgFile) return;
    const url = URL.createObjectURL(imgFile);
    setLogs(prev => [...prev, { who: 'user', image: url }]);
    setImgFile(null);
    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        { who: 'bot', text: '이미지 잘 보았습니다! (임시 응답)' }
      ]);
    }, 500);
  };

  return (
    <div style={{
      width: '80%',
      maxWidth: 800,
      height: '80vh',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      {/* 채팅 기록 영역 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: 16,
          overflowY: 'auto',
          background: '#f9f9f9'
        }}
      >
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: l.who === 'user' ? 'flex-end' : 'flex-start',
              margin: '8px 0'
            }}
          >
            {l.image && (
              <img
                src={l.image}
                alt="attachment"
                style={{ maxWidth: 200, borderRadius: 8 }}
              />
            )}
            {l.text && (
              <span style={{
                maxWidth: '70%',
                padding: '8px 12px',
                borderRadius: 16,
                background: l.who === 'user' ? '#e0f7fa' : '#f1f1f1'
              }}>
                {l.text}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 입력창 고정 영역 (가로 배치) */}
      <div style={{
        padding: 12,
        borderTop: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 'auto'
      }}>
        {/* 1. 이미지 선택 */}
        <input
          type="file"
          accept="image/*"
          onChange={e => setImgFile(e.target.files[0])}
          style={{ flex: 'none' }}
        />

        {/* 2. 이미지 전송 */}
        <button
          onClick={sendImage}
          disabled={!imgFile}
          style={{
            flex: 'none',
            padding: '6px 12px',
            background: imgFile ? '#4caf50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: imgFile ? 'pointer' : 'not-allowed'
          }}
        >
          이미지 전송
        </button>

        {/* 3. 텍스트 입력창 */}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendText()}
          placeholder="메시지를 입력하세요..."
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 16,
            border: '1px solid #ccc'
          }}
        />

        {/* 4. 메시지 전송 */}
        <button
          onClick={sendText}
          disabled={!input.trim()}
          style={{
            flex: 'none',
            padding: '8px 16px',
            background: input.trim() ? '#1e40af' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: input.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          전송
        </button>
      </div>
    </div>
  );
}