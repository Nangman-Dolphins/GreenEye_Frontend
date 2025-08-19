//App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, AuthContext } from './context/AuthContext.jsx';

import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import ChatAssistant from './components/assistant/ChatAssistant.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import Settings from './components/settings/Settings.jsx';
import DeviceLink from './components/devices/DeviceLink.jsx';

function Protected({ children }) {
  const { token } = React.useContext(AuthContext);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 최초 진입 → 로그인 */}
          <Route index element={<Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 공개 라우트 */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 보호 라우트 */}
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/assistant"
            element={
              <Protected>
                <ChatAssistant />
              </Protected>
            }
          />
          <Route
            path="/settings"
            element={
              <Protected>
                <Settings />
              </Protected>
            }
          />
          <Route
            path="/devices/link"
            element={
              <Protected>
                <DeviceLink />
              </Protected>
            }
          />

          {/* 나머지 → 로그인 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
