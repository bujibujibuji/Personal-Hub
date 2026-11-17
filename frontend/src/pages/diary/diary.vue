<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html.vue'
import { getDiary, createDiary, updateDiary, deleteDiary } from '../../api/diaries'
import { uploadImage, downloadAndOpen } from '../../api/uploads'
import { absoluteUrl, getServerBase } from '../../api/request'
import { renderMarkdown } from '../../utils/markdown'
import { formatDate, formatFullDate } from '../../utils/format'

const WEATHER_OPTIONS = ['晴', '多云', '阴', '雨', '雪']
const MOOD_OPTIONS = ['开心', '平静', '疲惫', '难过', '焦虑']

const diaryId = ref(null)
const diary = ref(null)
const mode = ref('view') // view：阅读；edit：编辑
const draft = ref({ title: '', content: '', diaryDate: '', weather: '', mood: '' })
const editorTab = ref('write') // write：编辑；preview：预览
const loading = ref(false)
const saving = ref(false)
const uploadingImage = ref(false)
const error = ref('')
const cursorPosition = ref(0)
const serverBase = getServerBase()

const renderedDiary = computed(() => renderMarkdown(diary.value?.content))
const renderedDraft = computed(() => renderMarkdown(draft.value.content))

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
  img: 'max-width:100%; border-radius:8px;',
}

onLoad((query) => {
  diaryId.value = query && query.id ? Number(query.id) : null
  if (diaryId.value) {
    loadDiary()
  } else {
    startEdit()
  }
})

async function loadDiary() {
  loading.value = true
  error.value = ''
  try {
    diary.value = await getDiary(diaryId.value)
    mode.value = 'view'
    uni.setNavigationBarTitle({ title: diary.value.title || '日记' })
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
}

function todayString() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function startEdit() {
  draft.value = {
    title: diary.value?.title || '',
    content: diary.value?.content || '',
    diaryDate: diary.value?.diaryDate || todayString(),
    weather: diary.value?.weather || '',
    mood: diary.value?.mood || '',
  }
  editorTab.value = 'write'
  error.value = ''
  mode.value = 'edit'
}

function cancelEdit() {
  if (diaryId.value) {
    mode.value = 'view'
    error.value = ''
  } else {
    goBack()
  }
}

function onDateChange(event) {
  const value = event && event.detail && event.detail.value
  if (value) draft.value.diaryDate = value
}

function toggleOption(field, option) {
  draft.value[field] = draft.value[field] === option ? '' : option
}

function trackCursor(event) {
  if (event && event.detail && typeof event.detail.cursor === 'number') {
    cursorPosition.value = event.detail.cursor
  }
}

function insertMarkdown(before, after = '', placeholder = '文字') {
  const content = draft.value.content || ''
  const position = Math.min(Math.max(cursorPosition.value, 0), content.length)
  const snippet = before + placeholder + after
  draft.value.content = content.slice(0, position) + snippet + content.slice(position)
  cursorPosition.value = position + snippet.length
}

// ---------- 图片上传 ----------
function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    success: async (result) => {
      const filePath = result.tempFilePaths && result.tempFilePaths[0]
      if (!filePath) return
      const info = result.tempFiles && result.tempFiles[0]
      if (info && info.size > 10 * 1024 * 1024) {
        error.value = '图片不能超过 10MB。'
        return
      }
      uploadingImage.value = true
      error.value = ''
      try {
        const result2 = await uploadImage(filePath)
        const alt = String(result2.originalName || '图片').replace(/[[\]\r\n]/g, '')
        insertMarkdown('![', `](${result2.url})`, alt)
        editorTab.value = 'write'
      } catch (cause) {
        error.value = cause.message
      } finally {
        uploadingImage.value = false
      }
    },
    fail: () => { /* 用户取消选择 */ },
  })
}

// ---------- 保存与删除 ----------
async function save() {
  if (!draft.value.title.trim() && !(draft.value.content || '').trim()) {
    error.value = '写点什么再保存吧。'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const payload = {
      title: draft.value.title.trim(),
      content: draft.value.content,
      diaryDate: draft.value.diaryDate,
      weather: draft.value.weather,
      mood: draft.value.mood,
    }
    const saved = diaryId.value ? await updateDiary(diaryId.value, payload) : await createDiary(payload)
    diary.value = saved
    mode.value = 'view'
    uni.setNavigationBarTitle({ title: saved.title || '日记' })
    uni.showToast({ title: '已保存', icon: 'success' })
    goBack()
  } catch (cause) {
    error.value = cause.message
  } finally {
    saving.value = false
  }
}

function confirmRemove() {
  if (!diary.value) return
  uni.showModal({
    title: '删除日记',
    content: `确定删除${formatFullDate(diary.value.diaryDate)}的日记吗？删除后无法恢复。`,
    confirmColor: '#b04a3e',
    success: async (result) => {
      if (!result.confirm) return
      try {
        await deleteDiary(diaryId.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        goBack()
      } catch (cause) {
        error.value = cause.message
      }
    },
  })
}

// ---------- 链接处理 ----------
function onLinkTap(event) {
  const href = (event && event.detail && event.detail.attrs && event.detail.attrs.href) || ''
  if (!href) return
  const fileMatch = href.match(/^\/api\/files\/(\d+)\/download$/)
  if (fileMatch) {
    uni.navigateTo({ url: `/pages/preview/preview?id=${fileMatch[1]}` })
    return
  }
  if (/^\/api\/(files|images)\//.test(href)) {
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

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/diary/diaries' })
  }
}
</script>

<template>
  <view class="diary-page">
    <view v-if="loading" class="diary-empty">
      <text>正在加载…</text>
    </view>

    <!-- 阅读模式 -->
    <view v-else-if="mode === 'view' && diary" class="diary-view">
      <text class="diary-date">{{ formatFullDate(diary.diaryDate) }}</text>
      <view v-if="diary.weather || diary.mood" class="diary-tags">
        <text v-if="diary.weather" class="tag">天气 · {{ diary.weather }}</text>
        <text v-if="diary.mood" class="tag">心情 · {{ diary.mood }}</text>
      </view>
      <text v-if="diary.title" class="diary-title">{{ diary.title }}</text>
      <view class="diary-body">
        <mp-html :content="renderedDiary" :domain="serverBase" :tag-style="markdownTagStyle" @linktap="onLinkTap" />
      </view>
      <text class="diary-meta">更新于 {{ formatDate(diary.updatedAt) }}</text>
      <view class="diary-actions">
        <view class="action-primary" @click="startEdit"><text>编辑</text></view>
        <view class="action-danger" @click="confirmRemove"><text>删除</text></view>
      </view>
    </view>

    <!-- 编辑模式 -->
    <view v-else-if="mode === 'edit'" class="diary-editor">
      <view class="field">
        <text class="field-label">日期</text>
        <picker mode="date" :value="draft.diaryDate" @change="onDateChange">
          <view class="field-input picker-field">
            <text>{{ formatFullDate(draft.diaryDate) || '选择日记日期' }}</text>
            <text class="picker-arrow">▾</text>
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="field-label">天气</text>
        <view class="option-row">
          <view
            v-for="option in WEATHER_OPTIONS"
            :key="option"
            class="option"
            :class="{ active: draft.weather === option }"
            @click="toggleOption('weather', option)"
          >
            <text>{{ option }}</text>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">心情</text>
        <view class="option-row">
          <view
            v-for="option in MOOD_OPTIONS"
            :key="option"
            class="option"
            :class="{ active: draft.mood === option }"
            @click="toggleOption('mood', option)"
          >
            <text>{{ option }}</text>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="field-label">标题（可留空）</text>
        <input v-model="draft.title" class="field-input" :maxlength="255" placeholder="今天的主角是……" placeholder-class="field-placeholder">
      </view>

      <view class="editor-tabs">
        <view class="tab" :class="{ active: editorTab === 'write' }" @click="editorTab = 'write'"><text>编辑</text></view>
        <view class="tab" :class="{ active: editorTab === 'preview' }" @click="editorTab = 'preview'"><text>预览</text></view>
      </view>

      <view v-show="editorTab === 'write'" class="editor-write">
        <view class="toolbar">
          <view class="tool" @click="insertMarkdown('## ', '', '标题')"><text>H2</text></view>
          <view class="tool" @click="insertMarkdown('**', '**', '粗体文字')"><text class="bold">B</text></view>
          <view class="tool" @click="insertMarkdown('- ', '', '列表项')"><text>≡</text></view>
          <view class="tool" @click="insertMarkdown('> ', '', '引用内容')"><text>❞</text></view>
          <view class="tool" @click="insertMarkdown('`', '`', '代码')"><text>&lt;/&gt;</text></view>
          <view class="tool" @click="insertMarkdown('[', '](https://)', '链接文字')"><text>↗</text></view>
          <view class="tool file-tool" :class="{ disabled: uploadingImage }" @click="chooseImage">
            <text>{{ uploadingImage ? '上传中…' : '▧ 图片' }}</text>
          </view>
        </view>
        <textarea
          v-model="draft.content"
          class="editor-textarea"
          :maxlength="-1"
          placeholder="今天发生了什么、想到了什么…&#10;&#10;支持 Markdown，点击“▧ 图片”可上传照片。"
          placeholder-class="field-placeholder"
          @input="trackCursor"
          @blur="trackCursor"
        />
      </view>

      <view v-show="editorTab === 'preview'" class="editor-preview">
        <mp-html :content="renderedDraft" :domain="serverBase" :tag-style="markdownTagStyle" @linktap="onLinkTap" />
      </view>

      <text class="editor-help">图片最大 10MB，上传后会自动插入正文</text>

      <text v-if="error" class="editor-error">{{ error }}</text>

      <view class="diary-actions">
        <view class="action-primary" :class="{ disabled: saving || uploadingImage }" @click="save">
          <text>{{ saving ? '保存中…' : '保存日记' }}</text>
        </view>
        <view class="action-ghost" @click="cancelEdit"><text>取消</text></view>
      </view>
    </view>

    <view v-else class="diary-empty">
      <text v-if="error">{{ error }}</text>
      <text v-else>这篇日记不存在，可能已被删除。</text>
      <view class="action-ghost back" @click="goBack"><text>返回</text></view>
    </view>
  </view>
</template>

<style scoped>
.diary-page {
  padding: 24rpx 32rpx 80rpx;
}

.diary-empty {
  background: #ffffff;
  border: 1px dashed #d8e2dc;
  border-radius: 24rpx;
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  color: #858f8b;
}

.diary-view {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  display: flex;
  flex-direction: column;
}

.diary-date {
  font-size: 24rpx;
  font-weight: 600;
  color: #21594d;
  margin-bottom: 12rpx;
}

.diary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.tag {
  font-size: 20rpx;
  color: #5a7565;
  background: #f4f7f4;
  border-radius: 999rpx;
  padding: 6rpx 18rpx;
}

.diary-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #252b30;
  line-height: 1.4;
  margin-bottom: 24rpx;
}

.diary-body {
  color: #43504b;
  font-size: 28rpx;
  word-break: break-word;
}

.diary-meta {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: #aebbb4;
}

.diary-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.action-primary {
  flex: 1;
  height: 88rpx;
  border-radius: 18rpx;
  background: #21594d;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-primary.disabled {
  opacity: 0.6;
}

.action-danger {
  flex: 1;
  height: 88rpx;
  border-radius: 18rpx;
  background: #faeee9;
  color: #b04a3e;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-ghost {
  flex: 1;
  height: 88rpx;
  border-radius: 18rpx;
  background: #f4f7f4;
  color: #5a7565;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-ghost.back {
  margin-top: 10rpx;
  min-width: 240rpx;
  flex: none;
  padding: 0 40rpx;
}

.diary-editor {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 28rpx;
}

.field-label {
  font-size: 24rpx;
  color: #5a7565;
}

.field-input {
  height: 84rpx;
  padding: 0 24rpx;
  border: 1px solid #e8ece9;
  border-radius: 16rpx;
  background: #fbfcfb;
  font-size: 28rpx;
  color: #252b30;
}

.picker-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-arrow {
  color: #9aa3a0;
}

.field-placeholder {
  color: #aebbb4;
}

.option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.option {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #f4f7f4;
  color: #5a7565;
  font-size: 24rpx;
}

.option.active {
  background: #eaf3ed;
  color: #24604e;
  font-weight: 600;
}

.editor-tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.tab {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #f4f7f4;
  color: #5a7565;
  font-size: 24rpx;
}

.tab.active {
  background: #eaf3ed;
  color: #24604e;
  font-weight: 600;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.tool {
  min-width: 72rpx;
  height: 64rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  background: #f4f7f4;
  color: #43504b;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool.bold {
  font-weight: 700;
}

.tool.file-tool {
  background: #eaf3ed;
  color: #24604e;
}

.tool.disabled {
  opacity: 0.6;
}

.editor-textarea {
  width: 100%;
  height: 560rpx;
  box-sizing: border-box;
  padding: 24rpx;
  border: 1px solid #e8ece9;
  border-radius: 16rpx;
  background: #fbfcfb;
  font-size: 28rpx;
  line-height: 1.6;
  color: #252b30;
}

.editor-preview {
  min-height: 300rpx;
  padding: 24rpx;
  border: 1px solid #e8ece9;
  border-radius: 16rpx;
  background: #fbfcfb;
  color: #43504b;
  font-size: 28rpx;
  word-break: break-word;
}

.editor-help {
  display: block;
  margin-top: 16rpx;
  font-size: 20rpx;
  color: #9ca6a1;
}

.editor-error {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #b04a3e;
  background: #faeee9;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}
</style>
