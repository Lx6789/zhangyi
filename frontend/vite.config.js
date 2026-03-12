import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'  // 引入 path 模块

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // 添加 ./ 前缀更明确
    }
  },
  server: {
    proxy: {
      // 配置代理，解决开发环境跨域问题
      '/auth': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/home': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/business': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/savings': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/chart': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/friends': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      }
    }
  }
})