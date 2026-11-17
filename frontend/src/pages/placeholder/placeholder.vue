<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const title = ref('即将开放')
const description = ref('我们会先完成笔记功能，再逐步加入这里的内容。')
const icon = ref('✳')

onLoad((query) => {
  if (!query) return
  if (query.title) title.value = decodeURIComponent(query.title)
  if (query.description) description.value = decodeURIComponent(query.description)
  if (query.icon) icon.value = decodeURIComponent(query.icon)
  uni.setNavigationBarTitle({ title: title.value })
})
</script>

<template>
  <view class="placeholder-page">
    <view class="placeholder-card">
      <view class="placeholder-icon">
        <text>{{ icon }}</text>
      </view>
      <text class="placeholder-eyebrow">YOUR PERSONAL SPACE</text>
      <text class="placeholder-title">{{ title }}空间正在准备中</text>
      <text class="placeholder-hint">{{ description }}</text>
      <text class="placeholder-note">我们会先完成笔记功能，再逐步加入这里的内容。</text>
    </view>
  </view>
</template>

<style scoped>
.placeholder-page {
  padding: 40rpx 32rpx;
}

.placeholder-card {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 24rpx;
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  text-align: center;
}

.placeholder-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 32rpx;
  background: #eaf3ed;
  color: #21594d;
  font-size: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}

.placeholder-eyebrow {
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: #69a083;
}

.placeholder-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #252b30;
}

.placeholder-hint {
  font-size: 26rpx;
  color: #65716d;
}

.placeholder-note {
  font-size: 22rpx;
  color: #9aa3a0;
}
</style>
