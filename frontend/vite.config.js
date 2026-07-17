import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      hmr: { clientPort: 443, protocol: 'wss' },
      allowedHosts: true,
    },
    // Make process.env.REACT_APP_BACKEND_URL available for legacy code that expects it
    define: {
      'process.env': {
        REACT_APP_BACKEND_URL: JSON.stringify(env.REACT_APP_BACKEND_URL || env.VITE_API_URL || ''),
      },
    },
  };
});
