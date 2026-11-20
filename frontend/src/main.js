import './utils/polyfill' // 必须最先导入：补齐旧版 WebView 缺失的方法，避免 App 白屏
import { createSSRApp } from 'vue'
import App from './App.vue'
import { recordStartupError } from './utils/diagnostics'

export function createApp() {
  const app = createSSRApp(App)
  // 页面渲染出错时记录并提示，便于在手机上定位白屏原因。
  app.config.errorHandler = (error) => recordStartupError(error, 'vue')
  return { app }
}
