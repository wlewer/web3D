import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    dedupe: ['three'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/admin': path.resolve(__dirname, './src/admin'),
      '@/admin/core': path.resolve(__dirname, './src/admin/core'),
      '@/admin/shared': path.resolve(__dirname, './src/admin/shared'),
      '@/admin/modules': path.resolve(__dirname, './src/admin/modules'),
      // ★ 优先匹配 three/addons/* 再匹配 three，避免别名覆盖 package.json exports 映射
      'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      // ★ 强制所有包解析到同一个 three 实例，防止 threepipe/@react-three/drei 各引入一份
      'three': path.resolve(__dirname, 'node_modules/three'),
      // threepipe dist 版本自带 three.js 依赖，避免与项目 three@0.180 冲突
      'threepipe': path.resolve(__dirname, 'node_modules/threepipe/dist/index.mjs'),
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
      // 代理生成模型文件到后端
      '/generation-models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // 代理静态模型文件（根目录 models/）到后端
      '/static-models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // ★ 代理 /models/ 到后端的 /static-models/（兼容旧路径 + 兜底）
      '/models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/models/, '/static-models'),
      },
    },
  },
})
