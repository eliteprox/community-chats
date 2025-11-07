import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const isArweave = mode === 'arweave';
  
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
      https: {
        key: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+3-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+3.pem')),
      },
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

