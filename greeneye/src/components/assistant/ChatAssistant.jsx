import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function ChatAssistant() {
  const { authFetch } = useContext(AuthContext);
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState([]);

  const send = async () => {
    if (!msg.trim()) return;
    setLogs(ls => [...ls, { who: 'user', text: msg }]);
    setMsg('');
    const res = await authFetch('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg })
    });
    if (res.ok) {
      const { reply } = await res.json();
      setLogs(ls => [...ls, { who: 'bot', text: reply }]);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-log">
        {logs.map((l, i) => (
          <div key={i} className={`chat-${l.who}`}>
            {l.text}
          </div>
        ))}
      </div>
      <input
        value={msg}
        onChange={e => setMsg(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
      />
      <button onClick={send}>전송</button>
    </div>
  );
}