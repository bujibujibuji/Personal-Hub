<script setup>
import { computed, ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listNotes } from '../../api/notes'
import { logout } from '../../api/auth'
import { session, sessionReady, requireAuth } from '../../store/session'
import { plainExcerpt } from '../../utils/markdown'
import { formatDate, formatFullDate } from '../../utils/format'

const sections = [
  { id: 'notes', icon: '▤', label: '笔记', description: '把想法、知识与灵感慢慢收集起来。', ready: true },
  { id: 'diary', icon: '◫', label: '日记', description: '给每一天留下一点记忆。', ready: true },
  { id: 'outfits', icon: '◇', label: '穿搭', description: '记录喜欢的衣服与搭配。', ready: false },
  { id: 'files', icon: '▧', label: '文件', description: '让重要资料有一个固定的位置。', ready: false },
]

const recentNotes = ref([])
const loading = ref(false)
const loadError = ref('')
const currentDate = formatFullDate()
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

async function loadRecent() {
  loading.value = true
  loadError.value = ''
  try {
    const notes = await listNotes()
    recentNotes.value = Array.isArray(notes) ? notes.slice(0, 3) : []
  } catch (cause) {
    loadError.value = cause.message
  } finally {
    loading.value = false
  }
}

onShow(async () => {
  await sessionReady()
  if (!requireAuth()) return
  await loadRecent()
})

onPullDownRefresh(async () => {
  try {
    await loadRecent()
  } finally {
    uni.stopPullDownRefresh()
  }
})

function openSection(item) {
  if (item.id === 'notes') {
    uni.switchTab({ url: '/pages/notes/notes' })
    return
  }
  if (item.id === 'diary') {
    uni.switchTab({ url: '/pages/diary/diaries' })
    return
  }
  uni.navigateTo({
    url: `/pages/placeholder/placeholder?title=${encodeURIComponent(item.label)}&description=${encodeURIComponent(item.description)}&icon=${encodeURIComponent(item.icon)}`,
  })
}

function openNote(note) {
  uni.navigateTo({ url: `/pages/note/note?id=${note.id}` })
}

async function signOut() {
  try {
    await logout()
  } finally {
    session.user = null
    uni.reLaunch({ url: '/pages/login/login' })
  }
}
</script>

<template>
  <view class="home-page">
    <view class="welcome card">
      <text class="eyebrow">WELCOME HOME</text>
      <text class="welcome-title">{{ greeting }}，{{ session.user || '朋友' }}</text>
      <text class="welcome-hint">把每一天的想法、发现和喜欢的事物，安放在这里。</text>
      <text class="welcome-date">{{ currentDate }}</text>
    </view>

    <view class="section-head">
      <text class="section-title">我的空间</text>
      <text class="section-more">一点一点，搭建属于自己的生活地图</text>
    </view>
    <view class="module-grid">
      <view v-for="item in sections" :key="item.id" class="module-card" @click="openSection(item)">
        <text class="module-icon">{{ item.icon }}</text>
        <text class="module-name">{{ item.label }}</text>
        <text class="module-description">{{ item.description }}</text>
        <text class="module-footer">{{ item.ready ? '进入' : '即将开放' }} ↗</text>
      </view>
    </view>

    <view class="section-head recent-head">
      <text class="section-title">最近记录</text>
      <text v-if="loadError" class="recent-error" @click="loadRecent">{{ loadError }} · 点击重试</text>
    </view>
    <view v-if="loading && !recentNotes.length" class="empty-state">
      <text>正在加载…</text>
    </view>
    <view v-else-if="!recentNotes.length" class="empty-state">
      <text class="empty-icon">✎</text>
      <text class="empty-title">你的故事，即将从这里开始</text>
      <text class="empty-hint">第一篇笔记完成后，会在这里出现。</text>
    </view>
    <view v-else class="recent-list">
      <view v-for="note in recentNotes" :key="note.id" class="recent-note card" @click="openNote(note)">
        <text class="recent-note-title">{{ note.title }}</text>
        <text class="recent-note-excerpt">{{ plainExcerpt(note.content) }}</text>
        <text class="recent-note-date">更新于 {{ formatDate(note.updatedAt) }}</text>
      </view>
    </view>

    <view class="signout card" @click="signOut">
      <text class="signout-text">退出登录</text>
      <text class="signout-user">{{ session.user }}</text>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  padding: 24rpx 32rpx 60rpx;
}

.card {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 32rpx;
}

.eyebrow {
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: #69a083;
}

.welcome {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  background: linear-gradient(150deg, #eef6ef 0%, #ffffff 60%);
}

.welcome-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #252b30;
}

.welcome-hint {
  font-size: 26rpx;
  color: #65716d;
}

.welcome-date {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8da29a;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 40rpx 8rpx 20rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #252b30;
}

.section-more {
  font-size: 22rpx;
  color: #9aa3a0;
}

.module-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.module-card {
  width: calc(50% - 10rpx);
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  box-sizing: border-box;
}

.module-icon {
  font-size: 40rpx;
  color: #21594d;
}

.module-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #252b30;
}

.module-description {
  font-size: 22rpx;
  color: #858f8b;
  line-height: 1.5;
}

.module-footer {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #4d906e;
}

.recent-head {
  align-items: center;
}

.recent-error {
  font-size: 22rpx;
  color: #b04a3e;
}

.empty-state {
  background: #ffffff;
  border: 1px dashed #d8e2dc;
  border-radius: 24rpx;
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.empty-icon {
  font-size: 44rpx;
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

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.recent-note {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.recent-note-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #252b30;
}

.recent-note-excerpt {
  font-size: 24rpx;
  color: #858f8b;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-note-date {
  font-size: 20rpx;
  color: #aebbb4;
}

.signout {
  margin-top: 40rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.signout-text {
  font-size: 28rpx;
  color: #b04a3e;
}

.signout-user {
  font-size: 24rpx;
  color: #9aa3a0;
}
</style>
