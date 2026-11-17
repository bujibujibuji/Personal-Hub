import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// H5 开发时把 /api 转发到本机 Spring Boot 后端。
// App 端直连 src/config.js 中配置的服务器地址，不经过此代理。
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
