// 全局会话状态：App 启动时查询登录状态，401 时统一跳转登录页。
import { reactive } from 'vue'
import { getAuthStatus } from '../api/auth'
import { setUnauthorizedHandler } from '../api/request'

export const session = reactive({
  ready: false,
  user: null,
})

let readyPromise = null

function initialize() {
  return getAuthStatus()
    .then((status) => {
      session.user = status.authenticated ? status.username : null
    })
    .catch(() => {
      // 网络不通时也放行到登录页，由用户修改服务器地址后重试。
      session.user = null
    })
    .finally(() => {
      session.ready = true
    })
}

// 多处页面共用同一个初始化过程，避免重复请求。
export function sessionReady() {
  if (!readyPromise) readyPromise = initialize()
  return readyPromise
}

export function requireAuth() {
  if (!session.user) {
    uni.reLaunch({ url: '/pages/login/login' })
    return false
  }
  return true
}

setUnauthorizedHandler(() => {
  session.user = null
  uni.reLaunch({ url: '/pages/login/login?expired=1' })
})
