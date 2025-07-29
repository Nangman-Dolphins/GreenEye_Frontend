import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './components/auth/Login';
import SensorInfo from './components/dashboard/SensorInfo';
import StatsChart from './components/dashboard/StatsChart';
import ControlPanel from './components/dashboard/ControlPanel';
import ChatAssistant from './components/assistant/ChatAssistant';

function Dashboard() {
  return (
    <div style={{ padding: 20 }}>
      <SensorInfo />
      <StatsChart />
      <ControlPanel />
    </div>
  );
}

function Protected({ children }) {
  const { token } = React.useContext(AuthContext);
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <Protected><Dashboard/></Protected>
          }/>
          <Route path="/assistant" element={
            <Protected><ChatAssistant/></Protected>
          }/>
          <Route path="*" element={<Navigate to="/dashboard"/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}