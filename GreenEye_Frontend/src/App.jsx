import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, AuthContext } from './context/AuthContext.jsx';

import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import ChatAssistant from './components/assistant/ChatAssistant.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import Settings from './components/settings/Settings.jsx';
import DeviceLink from './components/devices/DeviceLink.jsx';

const STORAGE_KEY = 'auth_token';

/** 튼튼한 보호 컴포넌트
 * - 컨텍스트가 비어도 localStorage 토큰이 있으면 즉시 복구(login)
 * - 복구 가능한 상태(saved)면 리다이렉트 금지 → 새로고침해도 안 튕김
 */
function Protected({ children }) {
  const { token, login } = React.useContext(AuthContext);
  const saved = React.useMemo(() => {
    try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
  }, []);

  React.useEffect(() => {
    if (!token && saved) login(saved);
  }, [token, saved, login]);

  if (!token && !saved) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/assistant" element={<Protected><ChatAssistant /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/devices/link" element={<Protected><DeviceLink /></Protected>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
