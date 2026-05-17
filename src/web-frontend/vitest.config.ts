import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/admin': path.resolve(__dirname, './src/admin'),
      '@/admin/core': path.resolve(__dirname, './src/admin/core'),
      '@/admin/shared': path.resolve(__dirname, './src/admin/shared'),
      '@/admin/modules': path.resolve(__dirname, './src/admin/modules'),
      '@sparkjsdev/spark': path.resolve(__dirname, './src/__tests__/mocks/spark-mock.ts'),
      'three/addons': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
      'three': path.resolve(__dirname, 'node_modules/three'),
      'threepipe': path.resolve(__dirname, 'node_modules/threepipe/dist/index.mjs'),
      '@threepipe/plugin-tweakpane': path.resolve(__dirname, './src/__tests__/mocks/threepipe-plugins-mock.ts'),
      '@threepipe/plugin-tweakpane-editor': path.resolve(__dirname, './src/__tests__/mocks/threepipe-plugins-mock.ts'),
    },
  },
});
