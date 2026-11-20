// App 端默认服务器地址。H5 版本同源访问，不使用此配置。
// 打包安装后，也可以在 App 的登录页里临时修改服务器地址。
// 推荐 Tailscale 私有网络的 HTTPS 地址，例如：https://your-host.tailXXXX.ts.net
export const DEFAULT_SERVER = 'http://100.108.192.39:8080'

export const STORAGE_KEYS = {
  server: 'ph_server',
  cookies: 'ph_cookies',
  csrf: 'ph_csrf',
  ignoredUpdate: 'ph_ignored_update',
  lastError: 'ph_last_error',
}
