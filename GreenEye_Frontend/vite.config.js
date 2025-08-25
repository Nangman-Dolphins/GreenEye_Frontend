import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // 필요하면 다음 두 줄 추가
        // secure: false,
        // rewrite: (path) => path, // prefix 그대로
      },
    },
  },
});
