<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listDiaries } from '../../api/diaries'
import { sessionReady, requireAuth } from '../../store/session'
import { plainExcerpt } from '../../utils/markdown'
import { formatDate, formatFullDate } from '../../utils/format'

const diaries = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await listDiaries()
    diaries.value = Array.isArray(data) ? data : []
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

function openDiary(item) {
  uni.navigateTo({ url: `/pages/diary/diary?id=${item.id}` })
}

function startNew() {
  uni.navigateTo({ url: '/pages/diary/diary' })
}

function itemTags(item) {
  return [item.weather, item.mood].filter(Boolean).join(' · ')
}
</script>

<template>
  <view class="diaries-page">
    <view class="diaries-heading">
      <view class="diaries-heading-copy">
        <text class="eyebrow">EVERY DAY, A MEMORY</text>
        <text class="diaries-title">我的日记</text>
      </view>
      <view class="new-button" @click="startNew">
        <text>＋ 写日记</text>
      </view>
    </view>

    <text v-if="error" class="diaries-error">{{ error }} · 下拉或点击重试</text>
    <text v-if="error" class="retry" @click="load">重试</text>

    <view v-if="loading && !diaries.length" class="diaries-empty">
      <text>正在加载…</text>
    </view>
    <view v-else-if="!diaries.length" class="diaries-empty">
      <text class="empty-icon">◫</text>
      <text class="empty-title">还没有日记</text>
      <text class="empty-hint">点击“写日记”，记下今天的一天。</text>
    </view>
    <view v-else class="diaries-list">
      <view v-for="item in diaries" :key="item.id" class="diary-item" @click="openDiary(item)">
        <view class="diary-item-head">
          <text class="diary-item-date">{{ formatFullDate(item.diaryDate) }}</text>
          <text v-if="itemTags(item)" class="diary-item-tags">{{ itemTags(item) }}</text>
        </view>
        <text v-if="item.title" class="diary-item-title">{{ item.title }}</text>
        <text class="diary-item-excerpt">{{ plainExcerpt(item.content) }}</text>
        <text class="diary-item-sub">更新于 {{ formatDate(item.updatedAt) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.diaries-page {
  padding: 24rpx 32rpx 60rpx;
}

.diaries-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.diaries-heading-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.eyebrow {
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: #69a083;
}

.diaries-title {
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

.diaries-error {
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

.diaries-empty {
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

.diaries-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.diary-item {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.diary-item-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.diary-item-date {
  font-size: 24rpx;
  font-weight: 600;
  color: #21594d;
}

.diary-item-tags {
  font-size: 22rpx;
  color: #8da29a;
}

.diary-item-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #252b30;
}

.diary-item-excerpt {
  font-size: 24rpx;
  color: #858f8b;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.diary-item-sub {
  font-size: 20rpx;
  color: #aebbb4;
}
</style>
