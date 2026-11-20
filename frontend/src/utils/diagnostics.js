// 启动诊断：App 白屏时手机上没有控制台，把启动阶段的异常存到本地并用原生弹窗提示，
// 这样下一次打包安装后能直接看到真实的报错信息，而不是只能看到一片空白。
import { STORAGE_KEYS } from '../config'

let popupShown = false

function messageOf(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  const text = error.errMsg || error.message || error.msg || ''
  if (text) return String(text)
  try {
    return String(error)
  } catch {
    return ''
  }
}

// 网络类错误属于正常业务分支，不弹窗，避免每次启动都被打断。
function isNetworkError(message) {
  return /无法连接|request:fail|网络|timeout|超时/i.test(message)
}

export function recordStartupError(error, source = 'runtime') {
  const message = messageOf(error).trim()
  if (!message) return
  try {
    uni.setStorageSync(
      STORAGE_KEYS.lastError,
      JSON.stringify({ message, source, at: Date.now() }),
    )
  } catch {
    /* 忽略存储失败 */
  }
  try {
    console.error('[startup]', source, error)
  } catch {
    /* 忽略控制台不可用 */
  }
  // #ifdef APP-PLUS
  if (source !== 'rejection' && !isNetworkError(message) && !popupShown) {
    popupShown = true
    setTimeout(() => {
      try {
        uni.showModal({
          title: '启动异常',
          content: message.slice(0, 300),
          showCancel: false,
          confirmText: '知道了',
        })
      } catch {
        /* 弹窗失败时忽略 */
      }
    }, 1200)
  }
  // #endif
}

export function installErrorListeners() {
  try {
    if (typeof uni.onError === 'function') {
      uni.onError((error) => recordStartupError(error, 'uni'))
    }
    if (typeof uni.onUnhandledRejection === 'function') {
      uni.onUnhandledRejection((result) => recordStartupError(result && result.reason, 'rejection'))
    }
  } catch {
    /* 低版本基座没有这些 API 时忽略 */
  }
}
