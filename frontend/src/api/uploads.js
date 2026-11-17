// 图片与附件上传（multipart）、附件信息与在线预览，以及附件的下载打开。
import { apiJson, absoluteUrl, authHeaders, refreshCsrfToken, handleUnauthorized, UnauthorizedError } from './request'

function uploadOnce(path, filePath, name, headers) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: absoluteUrl(path),
      filePath,
      name,
      header: headers,
      success: resolve,
      fail: () => reject(new Error('上传失败，请检查网络连接。')),
    })
  })
}

async function uploadAndParse(path, filePath, name, fallbackMessage) {
  let response = await uploadOnce(path, filePath, name, await authHeaders(true))
  if (response.statusCode === 403) {
    // CSRF 令牌失效，刷新后重试一次。
    await refreshCsrfToken()
    response = await uploadOnce(path, filePath, name, await authHeaders(true))
  }
  if (response.statusCode === 401) {
    handleUnauthorized()
    throw new UnauthorizedError()
  }
  let payload = {}
  try {
    payload = JSON.parse(response.data)
  } catch { /* 非 JSON 响应时使用通用错误提示 */ }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(payload.message || fallbackMessage)
  }
  return payload
}

export function uploadImage(filePath) {
  return uploadAndParse('/api/images', filePath, 'image', '图片上传失败，请稍后重试。')
}

export function uploadAttachment(filePath) {
  return uploadAndParse('/api/files', filePath, 'file', '附件上传失败，请稍后重试。')
}

// 附件元信息（文件名、大小、下载地址）。
export function getAttachment(id) {
  return apiJson(`/api/files/${id}`)
}

// 附件在线预览：md/txt 返回纯文本，doc/docx 返回转换后的 HTML；不支持的格式引导下载。
export function getAttachmentPreview(id) {
  return apiJson(`/api/files/${id}/preview`)
}

// 下载笔记里的附件（需要会话 Cookie），下载完成后调用系统预览打开。
export function downloadAndOpen(path) {
  return new Promise(async (resolve, reject) => {
    try {
      uni.showLoading({ title: '下载中…' })
      uni.downloadFile({
        url: absoluteUrl(path),
        header: await authHeaders(false),
        success: (response) => {
          if (response.statusCode !== 200) {
            reject(new Error('下载失败，请稍后重试。'))
            return
          }
          uni.openDocument({
            filePath: response.tempFilePath,
            showMenu: true,
            fail: () => reject(new Error('当前设备无法预览该文件。')),
          })
        },
        fail: () => reject(new Error('下载失败，请检查网络连接。')),
        complete: () => uni.hideLoading(),
      })
    } catch (cause) {
      uni.hideLoading()
      reject(cause)
    }
  })
}
