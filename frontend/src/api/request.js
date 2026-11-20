// 网络层封装：统一处理服务器地址、会话 Cookie（App 端需手动维护）、CSRF 令牌和 401 跳转。
import { DEFAULT_SERVER, STORAGE_KEYS } from '../config'

// H5 平台 Cookie 由浏览器自动携带，且不允许手动设置 Cookie 头。
export let IS_H5 = false
// #ifdef H5
IS_H5 = true
// #endif

// ---------- 服务器地址 ----------
export function getServerBase() {
  if (IS_H5) return ''
  const saved = uni.getStorageSync(STORAGE_KEYS.server)
  // 首次安装还没有保存地址时回退到打包配置，避免请求变成相对路径而必然失败。
  const base = String(saved || '').trim() || String(DEFAULT_SERVER || '').trim()
  return base.replace(/\/+$/, '')
}

export function absoluteUrl(path) {
  if (/^https?:\/\//i.test(path)) return path
  return getServerBase() + path
}

// ---------- Cookie 管理 ----------
function readCookies() {
  try {
    return JSON.parse(uni.getStorageSync(STORAGE_KEYS.cookies) || '{}')
  } catch {
    return {}
  }
}

function persistCookies(jar) {
  uni.setStorageSync(STORAGE_KEYS.cookies, JSON.stringify(jar))
}

function captureCookies(headers) {
  if (!headers) return
  const jar = readCookies()
  let changed = false
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== 'set-cookie') continue
    const values = Array.isArray(headers[key]) ? headers[key] : [headers[key]]
    for (const raw of values) {
      const pair = String(raw).split(';')[0]
      const eq = pair.indexOf('=')
      if (eq <= 0) continue
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (!name) continue
      const expired = !value || /max-age\s*=\s*0/i.test(String(raw)) || /expires\s*=\s*Thu,\s*01\s+Jan\s+1970/i.test(String(raw))
      if (expired) {
        if (name in jar) {
          delete jar[name]
          changed = true
        }
        continue
      }
      jar[name] = value
      changed = true
    }
  }
  if (changed) persistCookies(jar)
}

function cookieHeader() {
  const jar = readCookies()
  return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join('; ') || null
}

export function clearSessionData() {
  try {
    uni.removeStorageSync(STORAGE_KEYS.cookies)
    uni.removeStorageSync(STORAGE_KEYS.csrf)
  } catch { /* 忽略存储清理失败 */ }
  csrfCache = null
}

// ---------- CSRF 令牌 ----------
let csrfCache = null
try {
  csrfCache = JSON.parse(uni.getStorageSync(STORAGE_KEYS.csrf) || 'null')
} catch {
  csrfCache = null
}

export async function fetchCsrf(force = false) {
  if (csrfCache && !force) return csrfCache
  const response = await rawRequest('/api/auth/csrf')
  if (response.statusCode !== 200 || !response.data || !response.data.token) {
    throw new Error('无法连接登录服务，请确认服务器地址和网络。')
  }
  csrfCache = response.data
  uni.setStorageSync(STORAGE_KEYS.csrf, JSON.stringify(csrfCache))
  return csrfCache
}

// ---------- 底层请求 ----------
function rawRequest(path, { method = 'GET', data, header = {}, timeout = 20000 } = {}) {
  const finalHeader = { ...header }
  const cookie = cookieHeader()
  if (!IS_H5 && cookie) finalHeader.Cookie = cookie
  return new Promise((resolve, reject) => {
    uni.request({
      url: absoluteUrl(path),
      method,
      data,
      header: finalHeader,
      timeout,
      success: (response) => {
        captureCookies(response.headers)
        resolve(response)
      },
      fail: () => reject(new Error('无法连接服务器，请检查网络和服务器地址。')),
    })
  })
}

// 组装带会话与 CSRF 的请求头，供 uni.uploadFile / uni.downloadFile 复用。
export async function authHeaders(needsCsrf = true) {
  const headers = {}
  const cookie = cookieHeader()
  if (!IS_H5 && cookie) headers.Cookie = cookie
  if (needsCsrf) {
    const token = await fetchCsrf()
    headers[token.headerName] = token.token
  }
  return headers
}

export async function refreshCsrfToken() {
  return fetchCsrf(true)
}

// 登录/登出后服务器会轮换 CSRF 令牌，主动丢弃本地缓存。
export function invalidateCsrf() {
  csrfCache = null
  try {
    uni.removeStorageSync(STORAGE_KEYS.csrf)
  } catch { /* 忽略存储清理失败 */ }
}

// ---------- 未登录处理 ----------
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export function handleUnauthorized() {
  clearSessionData()
  if (typeof unauthorizedHandler === 'function') unauthorizedHandler()
}

export class UnauthorizedError extends Error {
  constructor(message = '登录已过期，请重新登录。') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

// ---------- 业务请求 ----------
export async function apiRequest(path, { method = 'GET', data, header = {} } = {}) {
  const upper = String(method).toUpperCase()
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(upper)
  const send = async (forceToken) => {
    const finalHeader = { ...header }
    if (needsCsrf) {
      const token = await fetchCsrf(forceToken)
      finalHeader[token.headerName] = token.token
    }
    return rawRequest(path, { method: upper, data, header: finalHeader })
  }

  let response = await send(false)
  if (needsCsrf && response.statusCode === 403) {
    // CSRF 令牌失效，强制刷新后重试一次。
    response = await send(true)
  }
  if (response.statusCode === 401) {
    handleUnauthorized()
    throw new UnauthorizedError()
  }
  return response
}

export async function apiJson(path, options = {}) {
  const response = await apiRequest(path, {
    ...options,
    header: { 'Content-Type': 'application/json', ...(options.header || {}) },
  })
  if (response.statusCode >= 200 && response.statusCode < 300) return response.data
  const message = response.data && response.data.message
  throw new Error(message || `请求失败（${response.statusCode}），请稍后重试。`)
}

export { rawRequest }
