// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './styles/styles.css';

async function boot() {
  // DEV 이면서 VITE_USE_MSW !== '0' 일 때만 MSW 켠다
  const useMSW = import.meta.env.DEV && import.meta.env.VITE_USE_MSW !== '0';

  if (useMSW) {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: { url: '/mockServiceWorker.js' },
      });
      console.info('[MSW] enabled');
    } catch (e) {
      console.warn('[MSW] failed to start', e);
    }
  } else {
    // 과거에 등록된 mockServiceWorker가 있으면 해제
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      regs.forEach((r) => {
        if (r.active?.scriptURL?.includes('mockServiceWorker.js')) {
          r.unregister();
        }
      });
    }
    console.info('[MSW] disabled');
  }

  console.log('[API BASE]', import.meta.env.VITE_API_BASE || '(vite proxy)');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

boot();
