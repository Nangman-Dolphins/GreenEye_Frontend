// src/components/assistant/ChatAssistant.jsx
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
// ✅ 1단계: 마크다운 라이브러리를 import 합니다.
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 이전 코드의 안정적인 localStorage 방식을 그대로 사용합니다.
const LS_CONV_ID_KEY = 'greeneye_conversation_id';

function getOrCreateConvId() {
  const saved = localStorage.getItem(LS_CONV_ID_KEY);
  if (saved) return saved;
  const newId = `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(LS_CONV_ID_KEY, newId);
  return newId;
}

async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatAssistant() {
  const navigate = useNavigate();
  const { authFetch, token } = useContext(AuthContext);

  const [convId, setConvId] = useState(() => getOrCreateConvId());
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!token || !convId) return;
      
      setIsLoading(true);
      try {
        const res = await authFetch(`/api/chat/history?conversation_id=${convId}`);
        if (!res.ok) throw new Error('대화 기록을 불러오는데 실패했습니다.');
        
        const data = await res.json();
        // 이미지 URL도 함께 처리하도록 수정
        if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map(m => ({
              who: m.role === 'user' ? 'user' : 'bot',
              text: m.content,
              image: m.image_url || null // 백엔드에서 image_url을 보낸다는 가정
            })));
        } else {
            setMessages([{ who: 'bot', text: '안녕하세요! 무엇을 도와드릴까요?' }]);
        }
      } catch (error) {
        console.error(error);
        setMessages([{ who: 'bot', text: `오류: ${error.message}`, error: true }]);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [convId, authFetch, token]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImgFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImgPreview(previewUrl);
    } else {
      setImgFile(null);
      setImgPreview('');
    }
  };

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !imgFile) || isLoading) return;

    const userPrompt = input.trim();
    let userMessage = { who: 'user', text: userPrompt };
    let imageBase64 = null;

    if (imgFile && imgPreview) {
      userMessage.image = imgPreview;
      imageBase64 = await fileToDataURL(imgFile);
    }
    
    setMessages(prev => (prev.length === 1 && prev[0].text.includes('무엇을 도와드릴까요?')) 
      ? [userMessage] 
      : [...prev, userMessage]
    );

    setInput('');
    setImgFile(null);
    setImgPreview('');
    setIsLoading(true);

    try {
      const payload = {
        prompt: userPrompt || '이 이미지에 대해 설명해주세요.',
        conversation_id: convId,
        ...(imageBase64 && { image: imageBase64 }),
      };

      const res = await authFetch('/api/chat/gemini', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: '서버 응답 오류' }));
        throw new Error(errData.error || `HTTP 오류 ${res.status}`);
      }
      
      const data = await res.json();
      setMessages(prev => [...prev, { who: 'bot', text: data.answer }]);
      
    } catch (error) {
      setMessages(prev => [...prev, { who: 'bot', text: `오류: ${error.message}`, error: true }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, imgFile, imgPreview, isLoading, authFetch, convId, token]);
  
  const startNewChat = () => {
    if(window.confirm('새로운 대화를 시작할까요? 현재 대화 ID가 변경됩니다.')) {
        localStorage.removeItem(LS_CONV_ID_KEY);
        const newId = getOrCreateConvId();
        setConvId(newId);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          ← 대시보드로 돌아가기
        </button>
        <button onClick={startNewChat} style={styles.newChatButton}>
          새 대화 시작
        </button>
      </div>

      <div style={styles.chatWindow}>
        <div style={styles.messageArea}>
          {messages.map((m, i) => (
            <div key={i} style={styles.messageRow(m.who)}>
              <div style={styles.messageBubble(m.who, m.error)}>
                {m.image && <img src={m.image} alt="사용자 업로드" style={styles.imageInBubble} />}
                
                {/* ✅ 2단계: <p> 태그 대신 ReactMarkdown 컴포넌트를 사용합니다. */}
                {m.text && (
                    <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.text}
                        </ReactMarkdown>
                    </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={styles.messageRow('bot')}>
              <div style={styles.messageBubble('bot')}>...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={styles.inputArea}>
          {imgPreview && (
            <div style={styles.previewBox}>
              <img src={imgPreview} alt="미리보기" style={{height: '100%'}} />
              <button onClick={() => { setImgFile(null); setImgPreview(''); }}>×</button>
            </div>
          )}
          <label htmlFor="file-upload" style={styles.fileLabel}>📎</label>
          <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} disabled={isLoading} style={{display: 'none'}} />
          
          <input
            type="text"
            style={styles.textInput}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || (!input.trim() && !imgFile)} style={styles.sendButton}>
            {isLoading ? '...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 원래 코드의 초록색 테마 스타일 객체를 그대로 사용합니다.
const styles = {
    container: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: '100%', minHeight: '100vh', background: 'var(--ge-bg, #f3f4f6)', padding: '16px'
    },
    header: {
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '16px',
    },
    backButton: {
        padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', color: '#111827',
        borderRadius: '999px', cursor: 'pointer', fontWeight: 'bold'
    },
    newChatButton: {
        padding: '8px 16px', border: '1px solid #16a34a', background: '#dcfce7', color: '#166534',
        borderRadius: '999px', cursor: 'pointer', fontWeight: 'bold'
    },
    chatWindow: {
        width: '100%', maxWidth: '800px', height: 'calc(100vh - 120px)',
        display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: '12px', overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    messageArea: { flex: 1, padding: '20px', overflowY: 'auto' },
    messageRow: (who) => ({
        display: 'flex', justifyContent: who === 'user' ? 'flex-end' : 'flex-start', margin: '10px 0'
    }),
    messageBubble: (who, error) => ({
        maxWidth: '75%', padding: '12px 16px', borderRadius: '18px',
        background: error ? '#fee2e2' : (who === 'user' ? '#16a34a' : '#e5e7eb'),
        color: error ? '#b91c1c' : (who === 'user' ? '#fff' : '#111827'),
        lineHeight: 1.5, wordBreak: 'break-word'
    }),
    imageInBubble: {
        maxWidth: '250px', width: '100%', borderRadius: '10px', display: 'block', marginBottom: '8px'
    },
    inputArea: {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
        borderTop: '1px solid #e5e7eb', background: '#fff'
    },
    previewBox: {
        position: 'relative', height: '40px', padding: '4px',
        background: '#f3f4f6', borderRadius: '6px'
    },
    fileLabel: {
        fontSize: '24px', cursor: 'pointer', color: '#6b7280', padding: '8px'
    },
    textInput: {
        flex: 1, padding: '12px', border: '1px solid #d1d5db',
        borderRadius: '20px', background: '#f9fafb'
    },
    sendButton: {
        padding: '12px 20px', border: 'none', borderRadius: '20px',
        background: '#66B548', color: '#fff', fontWeight: 'bold', cursor: 'pointer'
    }
};