import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    // 确保所有路由请求都返回 index.html
    historyApiFallback: true,
    proxy: {
      // 只代理 API 请求，避免代理前端页面路由
      '/api': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // 保留原有的代理配置，但添加 bypass 逻辑
      '/auth': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          // 如果是页面请求（Accept 包含 text/html），不代理
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      },
      '/home': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      },
      '/business': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      },
      '/savings': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      },
      '/chart': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      },
      '/upload': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      },
      '/friends': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/'
          }
        }
      }
    }
  }
})