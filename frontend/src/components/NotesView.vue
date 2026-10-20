<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { apiFetch } from '../api/auth'

const emit = defineEmits(['changed', 'unauthorized'])
const notes = ref([])
const selectedId = ref(null)
const editing = ref(false)
const busy = ref(false)
const uploadingImage = ref(false)
const uploadingFile = ref(false)
const error = ref('')
const draft = ref({ title: '', content: '' })
const editorMode = ref('write')
const contentInput = ref(null)
const imageInput = ref(null)
const fileInput = ref(null)
const selected = computed(() => notes.value.find((note) => note.id === selectedId.value))
const renderedSelected = computed(() => renderMarkdown(selected.value?.content))
const renderedDraft = computed(() => renderMarkdown(draft.value.content))

marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(content) {
  if (!content) return '<p class="markdown-empty">暂无正文</p>'
  return DOMPurify.sanitize(marked.parse(content))
}

function plainExcerpt(content) {
  return content?.replace(/```[\s\S]*?```/g, ' 代码片段 ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' 图片 ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, '').replace(/\s+/g, ' ').trim() || '暂无正文'
}

async function insertMarkdown(before, after = '', placeholder = '文字') {
  const textarea = contentInput.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const chosen = draft.value.content.slice(start, end) || placeholder
  draft.value.content = `${draft.value.content.slice(0, start)}${before}${chosen}${after}${draft.value.content.slice(end)}`
  await nextTick()
  textarea.focus()
  textarea.setSelectionRange(start + before.length, start + before.length + chosen.length)
}

function chooseImage() {
  imageInput.value?.click()
}

async function uploadImage(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    error.value = '仅支持 JPG、PNG、GIF 和 WebP 图片。'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = '图片不能超过 10MB。'
    return
  }

  uploadingImage.value = true
  error.value = ''
  try {
    const body = new FormData()
    body.append('image', file)
    const response = await apiFetch('/api/images', { method: 'POST', body })
    if (response.status === 401) {
      emit('unauthorized')
      throw new Error('登录已过期，请重新登录。')
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || '图片上传失败，请确认后端已重新启动。')
    editorMode.value = 'write'
    await nextTick()
    const alt = result.originalName.replace(/[\[\]\r\n]/g, '') || '图片'
    await insertMarkdown('![', `](${result.url})`, alt)
  } catch (cause) {
    error.value = cause.message
  } finally {
    uploadingImage.value = false
  }
}

function chooseFile() {
  fileInput.value?.click()
}

async function uploadFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (file.size > 50 * 1024 * 1024) {
    error.value = '附件不能超过 50MB。'
    return
  }

  uploadingFile.value = true
  error.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const response = await apiFetch('/api/files', { method: 'POST', body })
    if (response.status === 401) {
      emit('unauthorized')
      throw new Error('登录已过期，请重新登录。')
    }
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || '附件上传失败，请确认后端已重新启动。')
    editorMode.value = 'write'
    await nextTick()
    const label = result.originalName.replace(/[\[\]\r\n]/g, '') || '下载附件'
    await insertMarkdown('[', `](${result.downloadUrl})`, label)
  } catch (cause) {
    error.value = cause.message
  } finally {
    uploadingFile.value = false
  }
}

async function request(path = '', options = {}) {
  const response = await apiFetch(`/api/notes${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (response.status === 401) {
    emit('unauthorized')
    throw new Error('登录已过期，请重新登录。')
  }
  if (!response.ok) throw new Error(response.status === 404 ? '这篇笔记已不存在，请刷新列表。' : '请求失败，请确认后端已启动。')
  return response.status === 204 ? null : response.json()
}

async function load() {
  busy.value = true
  error.value = ''
  try {
    notes.value = await request()
    emit('changed', notes.value)
    if (selectedId.value && !notes.value.some((note) => note.id === selectedId.value)) selectedId.value = null
  } catch (cause) { error.value = cause.message }
  finally { busy.value = false }
}

function startNew() {
  selectedId.value = null
  draft.value = { title: '', content: '' }
  error.value = ''
  editorMode.value = 'write'
  editing.value = true
}

function select(note) {
  selectedId.value = note.id
  editing.value = false
  error.value = ''
}

function startEdit() {
  draft.value = { title: selected.value.title, content: selected.value.content || '' }
  editorMode.value = 'write'
  editing.value = true
}

function cancelEdit() { editing.value = false; error.value = '' }

async function save() {
  if (!draft.value.title.trim()) { error.value = '请填写笔记标题。'; return }
  busy.value = true
  error.value = ''
  try {
    const note = await request(selectedId.value ? `/${selectedId.value}` : '', {
      method: selectedId.value ? 'PUT' : 'POST', body: JSON.stringify(draft.value),
    })
    selectedId.value = note.id
    editing.value = false
    await load()
  } catch (cause) { error.value = cause.message }
  finally { busy.value = false }
}

async function remove() {
  if (!selected.value || !window.confirm(`确定删除“${selected.value.title}”吗？删除后无法恢复。`)) return
  busy.value = true
  error.value = ''
  try {
    await request(`/${selectedId.value}`, { method: 'DELETE' })
    selectedId.value = null
    await load()
  } catch (cause) { error.value = cause.message }
  finally { busy.value = false }
}

function formatDate(value) { return value ? new Date(value).toLocaleDateString('zh-CN') : '' }
onMounted(load)
</script>

<template>
  <div class="page-content notes-page">
    <div class="notes-heading"><div><span class="eyebrow">YOUR KNOWLEDGE SPACE</span><h1>我的笔记<span class="title-dot">.</span></h1><p>把值得记下的事情，留在这里。</p></div><button class="primary-button" type="button" @click="startNew">＋ 新建笔记</button></div>
    <p v-if="error" class="notes-error" role="alert">{{ error }} <button v-if="!editing" type="button" @click="load">重试</button></p>
    <div class="notes-layout">
      <div class="notes-list"><div class="notes-list-head">全部笔记 <span>{{ notes.length }}</span></div><div v-if="busy && !notes.length" class="notes-muted">正在加载…</div><div v-else-if="!notes.length" class="notes-muted">还没有笔记，点击“新建笔记”开始。</div><button v-for="note in notes" :key="note.id" type="button" class="note-list-item" :class="{ active: selectedId === note.id }" @click="select(note)"><strong>{{ note.title }}</strong><span>{{ plainExcerpt(note.content) }}</span><small>{{ formatDate(note.updatedAt) }}</small></button></div>
      <div class="note-detail">
        <form v-if="editing" @submit.prevent="save">
          <label for="note-title">标题</label><input id="note-title" v-model="draft.title" maxlength="255" placeholder="给笔记起个标题" required>
          <div class="editor-heading"><label for="note-content">正文</label><div class="editor-tabs" role="tablist"><button type="button" :class="{ active: editorMode === 'write' }" @click="editorMode = 'write'">编辑</button><button type="button" :class="{ active: editorMode === 'preview' }" @click="editorMode = 'preview'">预览</button></div></div>
          <div v-show="editorMode === 'write'" class="markdown-editor">
            <div class="markdown-toolbar" aria-label="Markdown 格式工具"><button type="button" title="二级标题" @click="insertMarkdown('## ', '', '标题')">H2</button><button type="button" title="粗体" @click="insertMarkdown('**', '**', '粗体文字')"><strong>B</strong></button><button type="button" title="无序列表" @click="insertMarkdown('- ', '', '列表项')">≡</button><button type="button" title="引用" @click="insertMarkdown('> ', '', '引用内容')">❞</button><button type="button" title="行内代码" @click="insertMarkdown('`', '`', '代码')">&lt;/&gt;</button><button type="button" title="链接" @click="insertMarkdown('[', '](https://)', '链接文字')">↗</button><span class="toolbar-separator"></span><button class="image-tool" type="button" title="上传图片" :disabled="uploadingImage || uploadingFile" @click="chooseImage">{{ uploadingImage ? '上传中…' : '▧ 图片' }}</button><button class="image-tool" type="button" title="上传附件" :disabled="uploadingImage || uploadingFile" @click="chooseFile">{{ uploadingFile ? '上传中…' : '⇩ 附件' }}</button><input ref="imageInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" @change="uploadImage"><input ref="fileInput" class="visually-hidden" type="file" @change="uploadFile"></div>
            <textarea id="note-content" ref="contentInput" v-model="draft.content" rows="14" placeholder="# 标题&#10;&#10;从这里开始写 Markdown…"></textarea>
          </div>
          <div v-show="editorMode === 'preview'" class="markdown-preview markdown-body" v-html="renderedDraft"></div>
          <div class="markdown-help">图片最大 10MB，附件最大 50MB；上传后会自动插入链接</div>
          <div class="note-actions"><button class="primary-button" type="submit" :disabled="busy || uploadingImage || uploadingFile">{{ busy ? '保存中…' : '保存笔记' }}</button><button class="back-button" type="button" @click="cancelEdit">取消</button></div>
        </form>
        <article v-else-if="selected"><small>更新于 {{ formatDate(selected.updatedAt) }}</small><h2>{{ selected.title }}</h2><div class="note-body markdown-body" v-html="renderedSelected"></div><div class="note-actions"><button class="back-button" type="button" @click="startEdit">编辑</button><button class="delete-button" type="button" @click="remove" :disabled="busy">删除</button></div></article>
        <div v-else class="note-placeholder"><span>✎</span><h2>选一篇笔记，或写下新的想法</h2><p>内容会保存到后端数据库。</p></div>
      </div>
    </div>
  </div>
</template>
