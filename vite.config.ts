import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              utils: ['jspdf', 'jspdf-autotable', 'xlsx']
            }
          }
        }
      },
      server: {
        port: 5173,
        host: true,
        proxy: {
          '/api': {
            target: 'http://autocontrolsanitarioapp-backend-5plj5f-f5ea1c-31-97-193-114.traefik.me',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path
          }
        }
      },
      preview: {
        port: 4173,
        host: true
      }
    };
});
