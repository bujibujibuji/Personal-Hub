// App 热更新：启动时向服务器检查新版本，提示后下载 wgt 包自动安装。
// 仅 App 端生效；H5 由浏览器直接加载最新页面，无需此机制。
import { STORAGE_KEYS } from '../config'
import { absoluteUrl, rawRequest } from '../api/request'

function localVersionCode() {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    plus.runtime.getProperty(plus.runtime.appid, (info) => {
      resolve(Number(info && info.versionCode) || 0)
    })
    // #endif
    // #ifndef APP-PLUS
    resolve(0)
    // #endif
  })
}

export function checkAppUpdate() {
  // #ifndef APP-PLUS
  return Promise.resolve()
  // #endif
  // #ifdef APP-PLUS
  return check()
  // #endif
}

async function check() {
  try {
    // 未配置服务器地址（刚安装还未登录）时跳过。
    if (!getServerBase()) return
    const local = await localVersionCode()
    if (!local) return
    const response = await rawRequest('/api/app/check-update')
    if (response.statusCode !== 200 || !response.data || !response.data.versionCode) return
    const release = response.data
    if (Number(release.versionCode) <= local) return
    await promptUpdate(release)
  } catch {
    // 静默失败：更新检查不应影响正常使用。
  }
}

function promptUpdate(release) {
  return new Promise((resolve) => {
    // 同一个版本只提醒一次，用户点过“下次再说”就不再打扰。
    const ignored = uni.getStorageSync(STORAGE_KEYS.ignoredUpdate)
    if (String(ignored) === String(release.versionCode)) return resolve()
    const notes = release.notes || `新版本 ${release.versionName || release.versionCode} 已发布。`
    uni.showModal({
      title: '发现新版本',
      content: notes,
      confirmText: '立即更新',
      cancelText: '下次再说',
      success: (result) => {
        if (!result.confirm) {
          uni.setStorageSync(STORAGE_KEYS.ignoredUpdate, release.versionCode)
          return resolve()
        }
        downloadAndInstall(release, resolve)
      },
      fail: () => resolve(),
    })
  })
}

function downloadAndInstall(release, done) {
  uni.showLoading({ title: '下载更新中…', mask: true })
  uni.downloadFile({
    url: absoluteUrl(release.url || '/api/app/download'),
    success: (response) => {
      if (response.statusCode !== 200 || !response.tempFilePath) {
        uni.hideLoading()
        uni.showToast({ title: '下载失败，请稍后重试', icon: 'none' })
        return done()
      }
      plus.runtime.install(response.tempFilePath, { force: false }, () => {
        uni.hideLoading()
        uni.showModal({
          title: '更新完成',
          content: '需要重启应用以使用新版本',
          showCancel: false,
          success: () => plus.runtime.restart(),
        })
      }, () => {
        uni.hideLoading()
        uni.showToast({ title: '安装失败，请重新打开 App 或重装', icon: 'none' })
        done()
      })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败，请检查网络', icon: 'none' })
      done()
    },
  })
}
