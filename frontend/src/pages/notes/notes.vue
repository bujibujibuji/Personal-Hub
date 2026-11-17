<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listNotes } from '../../api/notes'
import { sessionReady, requireAuth } from '../../store/session'
import { plainExcerpt } from '../../utils/markdown'
import { formatDate } from '../../utils/format'

const notes = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await listNotes()
    notes.value = Array.isArray(data) ? data : []
  } catch (cause) {
    error.value = cause.message
  } finally {
    loading.value = false
  }
}

onShow(async () => {
  await sessionReady()
  if (!requireAuth()) return
  await load()
})

onPullDownRefresh(async () => {
  try {
    await load()
  } finally {
    uni.stopPullDownRefresh()
  }
})

function openNote(note) {
  uni.navigateTo({ url: `/pages/note/note?id=${note.id}` })
}

function startNew() {
  uni.navigateTo({ url: '/pages/note/note' })
}
</script>

<template>
  <view class="notes-page">
    <view class="notes-heading">
      <view class="notes-heading-copy">
        <text class="eyebrow">YOUR KNOWLEDGE SPACE</text>
        <text class="notes-title">我的笔记</text>
      </view>
      <view class="new-button" @click="startNew">
        <text>＋ 新建笔记</text>
      </view>
    </view>

    <text v-if="error" class="notes-error">{{ error }} · 下拉或点击重试</text>
    <text v-if="error" class="retry" @click="load">重试</text>

    <view v-if="loading && !notes.length" class="notes-empty">
      <text>正在加载…</text>
    </view>
    <view v-else-if="!notes.length" class="notes-empty">
      <text class="empty-icon">✎</text>
      <text class="empty-title">还没有笔记</text>
      <text class="empty-hint">点击“新建笔记”，写下第一条记录。</text>
    </view>
    <view v-else class="notes-list">
      <view v-for="note in notes" :key="note.id" class="note-item" @click="openNote(note)">
        <text class="note-item-title">{{ note.title }}</text>
        <text class="note-item-excerpt">{{ plainExcerpt(note.content) }}</text>
        <text class="note-item-date">{{ formatDate(note.updatedAt) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.notes-page {
  padding: 24rpx 32rpx 60rpx;
}

.notes-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.notes-heading-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.eyebrow {
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: #69a083;
}

.notes-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #252b30;
}

.new-button {
  background: #21594d;
  color: #ffffff;
  font-size: 26rpx;
  padding: 18rpx 30rpx;
  border-radius: 16rpx;
}

.notes-error {
  display: block;
  font-size: 24rpx;
  color: #b04a3e;
  background: #faeee9;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 12rpx;
}

.retry {
  display: inline-block;
  font-size: 24rpx;
  color: #21594d;
  margin-bottom: 20rpx;
}

.notes-empty {
  background: #ffffff;
  border: 1px dashed #d8e2dc;
  border-radius: 24rpx;
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.empty-icon {
  font-size: 48rpx;
  color: #86b7a3;
}

.empty-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #5a7565;
}

.empty-hint {
  font-size: 24rpx;
  color: #9aa3a0;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.note-item {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.note-item-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #252b30;
}

.note-item-excerpt {
  font-size: 24rpx;
  color: #858f8b;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.note-item-date {
  font-size: 20rpx;
  color: #aebbb4;
}
</style>
