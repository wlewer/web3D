import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/admin': path.resolve(__dirname, './src/admin'),
      '@/admin/core': path.resolve(__dirname, './src/admin/core'),
      '@/admin/shared': path.resolve(__dirname, './src/admin/shared'),
      '@/admin/modules': path.resolve(__dirname, './src/admin/modules'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 代理API请求到后端
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 代理静态文件到后端
      '/app': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
