import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const isArweave = mode === 'arweave';
  
  let httpsConfig = undefined;
  const keyPath = process.env.HTTPS_KEY_PATH ? path.resolve(__dirname, process.env.HTTPS_KEY_PATH) : null;
  const certPath = process.env.HTTPS_CERT_PATH ? path.resolve(__dirname, process.env.HTTPS_CERT_PATH) : null;
  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsConfig = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer',
      },
    },
    base: isArweave ? './' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ethers-vendor': ['ethers'],
          },
        },
      },
    },
    server: {
      port: 3000,
      https: httpsConfig,
      host: true,
    },
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
  };
})

