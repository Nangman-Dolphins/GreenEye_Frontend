import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login         from './components/auth/Login';
import Dashboard     from './components/dashboard/Dashboard';
import ChatAssistant from './components/assistant/ChatAssistant';

function Protected({ children }) {
  const { token } = React.useContext(AuthContext);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 루트: 로그인 페이지로 리다이렉트 */}
          <Route index element={<Navigate to="/login" replace />} />

          {/* 로그인 */}
          <Route path="/login" element={<Login />} />

          {/* 대시보드 (인증된 사용자만 접근) */}
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />

          {/* AI 챗봇 페이지 (인증된 사용자만 접근) */}
          <Route
            path="/assistant"
            element={
              <Protected>
                <ChatAssistant />
              </Protected>
            }
          />

          {/* 그 외 모든 경로 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
