import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isArweave = mode === 'arweave';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
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
      host: true,
    },
    define: {
      'process.env': {},
    },
  };
})

