let csrf = null

export async function getAuthStatus() {
  const response = await fetch('/api/auth/status')
  if (!response.ok) return { authenticated: false, username: null }
  return response.json()
}

async function getCsrf(force = false) {
  if (!csrf || force) {
    const response = await fetch('/api/auth/csrf')
    if (!response.ok) throw new Error('无法连接登录服务，请确认后端已启动。')
    csrf = await response.json()
  }
  return csrf
}

export async function login(username, password) {
  const token = await getCsrf(true)
  const body = new URLSearchParams({ username, password })
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      [token.headerName]: token.token,
    },
    body,
  })
  if (response.status === 401) throw new Error('用户名或密码不正确。')
  if (!response.ok) throw new Error('登录失败，请稍后重试。')
  csrf = null
  return getAuthStatus()
}

export async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  const send = async (forceToken = false) => {
    const headers = new Headers(options.headers || {})
    if (needsCsrf) {
      const token = await getCsrf(forceToken)
      headers.set(token.headerName, token.token)
    }
    return fetch(url, { ...options, headers })
  }
  let response = await send(false)
  if (needsCsrf && response.status === 403) {
    csrf = null
    response = await send(true)
  }
  return response
}

export async function logout() {
  const token = await getCsrf(true)
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { [token.headerName]: token.token },
  })
  csrf = null
  if (!response.ok) throw new Error('退出失败，请刷新页面后重试。')
}
