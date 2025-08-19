//Main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';            // App.jsx 위치 확인
import './styles/styles.css';           // styles.css 위치 확인

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);