// 登录、登出与登录状态查询。
import { rawRequest, fetchCsrf, clearSessionData, invalidateCsrf, IS_H5, getServerBase } from './request'
import { STORAGE_KEYS, DEFAULT_SERVER } from '../config'

export async function getAuthStatus() {
  const response = await rawRequest('/api/auth/status')
  if (response.statusCode !== 200 || !response.data) return { authenticated: false, username: null }
  return response.data
}

// 读取登录页“服务器地址”输入框应显示的值。
export function currentServer() {
  if (IS_H5) return ''
  const saved = uni.getStorageSync(STORAGE_KEYS.server)
  return String(saved || DEFAULT_SERVER)
}

export function saveServer(address) {
  const cleaned = String(address || '').trim().replace(/\/+$/, '')
  if (!cleaned) throw new Error('请填写服务器地址。')
  if (!/^https?:\/\//i.test(cleaned)) throw new Error('服务器地址需要以 http:// 或 https:// 开头。')
  const previous = getServerBase()
  if (previous && previous !== cleaned) clearSessionData()
  uni.setStorageSync(STORAGE_KEYS.server, cleaned)
  return cleaned
}

export async function login(username, password) {
  const token = await fetchCsrf(true)
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  const response = await rawRequest('/api/auth/login', {
    method: 'POST',
    data: body,
    header: {
      'Content-Type': 'application/x-www-form-urlencoded',
      [token.headerName]: token.token,
    },
  })
  if (response.statusCode === 401) throw new Error('用户名或密码不正确。')
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error('登录失败，请稍后重试。')
  invalidateCsrf()
  return getAuthStatus()
}

export async function logout() {
  try {
    const token = await fetchCsrf(true)
    await rawRequest('/api/auth/logout', {
      method: 'POST',
      header: { [token.headerName]: token.token },
    })
  } catch { /* 即使登出请求失败，也继续清理本地会话 */ } finally {
    clearSessionData()
  }
}
