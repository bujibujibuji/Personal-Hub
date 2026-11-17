<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html.vue'
import { getAttachment, getAttachmentPreview, downloadAndOpen } from '../../api/uploads'
import { absoluteUrl, getServerBase } from '../../api/request'
import { renderMarkdown } from '../../utils/markdown'

const attachmentId = ref(null)
const attachment = ref(null)
const previewType = ref('') // markdown / html / text / unsupported / download-only（含加载失败）
const content = ref('')
const loading = ref(false)
const error = ref('')
const serverBase = getServerBase()

const renderedContent = computed(() =>
  previewType.value === 'markdown' ? renderMarkdown(content.value) : content.value
)

const markdownTagStyle = {
  p: 'line-height:1.75; margin:0 0 14px 0;',
  a: 'color:#21594d; text-decoration:underline;',
  h1: 'font-size:24px; font-weight:700; margin:18px 0 12px;',
  h2: 'font-size:21px; font-weight:700; margin:16px 0 10px;',
  h3: 'font-size:18px; font-weight:700; margin:14px 0 8px;',
  ul: 'margin:0 0 14px 0; padding-left:22px;',
  ol: 'margin:0 0 14px 0; padding-left:22px;',
  li: 'line-height:1.7;',
  blockquote: 'margin:0 0 14px 0; padding:8px 14px; border-left:3px solid #86b7a3; color:#5a7565; background:#f4f7f4;',
  code: 'background:#f4f7f4; padding:2px 6px; border-radius:4px; font-size:14px;',
  pre: 'background:#f4f7f4; padding:12px; border-radius:8px; overflow:auto;',
  table: 'border-collapse:collapse; width:100%; margin:0 0 14px 0;',
  th: 'border:1px solid #d8e2dc; padding:6px 10px; background:#f4f7f4; font-size:14px;',
  td: 'border:1px solid #d8e2dc; padding:6px 10px; font-size:14px;',
  img: 'max-width:100%; border-radius:8px;',
}

onLoad((query) => {
  attachmentId.value = query && query.id ? Number(query.id) : null
  if (attachmentId.value) load()
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const meta = await getAttachment(attachmentId.value)
    attachment.value = meta
    uni.setNavigationBarTitle({ title: meta.originalName || '附件预览' })
    const preview = await getAttachmentPreview(attachmentId.value)
    previewType.value = preview.type
    content.value = preview.content || ''
    if (preview.type === 'unsupported') {
      error.value = '该文件类型暂不支持在线预览，可下载后打开。'
    }
  } catch (cause) {
    // 文件过大 / 解析失败等：给出提示并保留下载按钮。
    previewType.value = 'download-only'
    error.value = cause.message
  } finally {
    loading.value = false
  }
}

function download() {
  if (!attachment.value) return
  downloadAndOpen(attachment.value.downloadUrl).catch((cause) => {
    uni.showToast({ title: cause.message, icon: 'none' })
  })
}

// ---------- 链接处理 ----------
function onLinkTap(event) {
  const href = (event && event.detail && event.detail.attrs && event.detail.attrs.href) || ''
  if (!href) return
  const match = href.match(/^\/api\/files\/(\d+)\/download$/)
  if (match) {
    uni.navigateTo({ url: `/pages/preview/preview?id=${match[1]}` })
    return
  }
  if (/^\/api\/images\//.test(href)) {
    downloadAndOpen(href).catch((cause) => {
      uni.showToast({ title: cause.message, icon: 'none' })
    })
    return
  }
  if (/^https?:\/\//i.test(href)) {
    // #ifdef APP-PLUS
    plus.runtime.openURL(absoluteUrl(href))
    // #endif
    // #ifndef APP-PLUS
    window.open(absoluteUrl(href), '_blank')
    // #endif
  }
}
</script>

<template>
  <view class="preview-page">
    <view v-if="loading" class="preview-empty">
      <text>正在加载…</text>
    </view>

    <view v-else-if="previewType === 'markdown' || previewType === 'html'" class="preview-card">
      <text class="preview-name">{{ attachment?.originalName }}</text>
      <view class="preview-body">
        <mp-html :content="renderedContent" :domain="serverBase" :tag-style="markdownTagStyle" @linktap="onLinkTap" />
      </view>
      <text v-if="previewType === 'html'" class="preview-hint">Word 文档以简化排版预览，图片与复杂格式请下载后查看</text>
    </view>

    <view v-else-if="previewType === 'text'" class="preview-card">
      <text class="preview-name">{{ attachment?.originalName }}</text>
      <view class="preview-body"><text class="preview-text">{{ content }}</text></view>
    </view>

    <view v-else class="preview-empty">
      <text class="preview-empty-icon">⇩</text>
      <text class="preview-empty-title">{{ error || '该文件类型暂不支持在线预览' }}</text>
      <text v-if="attachment" class="preview-empty-name">{{ attachment.originalName }}</text>
      <view class="action-primary" @click="download"><text>下载打开</text></view>
    </view>

    <view v-if="attachment && previewType !== 'unsupported'" class="preview-actions">
      <view class="action-ghost" @click="download"><text>下载原文件</text></view>
    </view>
  </view>
</template>

<style scoped>
.preview-page {
  padding: 24rpx 32rpx 80rpx;
}

.preview-card {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  display: flex;
  flex-direction: column;
}

.preview-name {
  font-size: 24rpx;
  color: #5a7565;
  margin-bottom: 20rpx;
  word-break: break-all;
}

.preview-body {
  color: #43504b;
  font-size: 28rpx;
  word-break: break-word;
}

.preview-text {
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-hint {
  margin-top: 24rpx;
  font-size: 20rpx;
  color: #9ca6a1;
}

.preview-empty {
  background: #ffffff;
  border: 1px dashed #d8e2dc;
  border-radius: 24rpx;
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  color: #858f8b;
}

.preview-empty-icon {
  font-size: 44rpx;
  color: #86b7a3;
}

.preview-empty-title {
  font-size: 26rpx;
  color: #5a7565;
  text-align: center;
}

.preview-empty-name {
  font-size: 22rpx;
  color: #aebbb4;
  word-break: break-all;
}

.preview-actions {
  margin-top: 32rpx;
}

.action-primary {
  min-width: 240rpx;
  height: 88rpx;
  padding: 0 40rpx;
  border-radius: 18rpx;
  background: #21594d;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-ghost {
  height: 88rpx;
  border-radius: 18rpx;
  background: #f4f7f4;
  color: #5a7565;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
