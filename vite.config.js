import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'pinia', 'naive-ui']
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    proxy: {
      '/live2d-models': {
        target: 'http://localhost:12393',
        changeOrigin: true,
        rewrite: path => path
      }
    }
  },
  optimizeDeps: {
    exclude: ['electron', '@pixi/webgl']
  },
  assetsInclude: [
    '**/*.wasm',
    '**/*.onnx',
    '**/*.bin',
    '**/*.model',
    '**/*.json',
    '**/*.tflite'
  ],
  publicDir: 'public'
})
