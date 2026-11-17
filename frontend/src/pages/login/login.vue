<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { login, currentServer, saveServer } from '../../api/auth'
import { session } from '../../store/session'
import { IS_H5 } from '../../api/request'

const serverAddress = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

onLoad((query) => {
  serverAddress.value = currentServer()
  if (query && query.expired) error.value = '登录已过期，请重新登录。'
})

async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码。'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    // #ifndef H5
    saveServer(serverAddress.value)
    // #endif
    const status = await login(username.value.trim(), password.value)
    if (!status.authenticated) throw new Error('登录状态确认失败，请重试。')
    session.user = status.username
    password.value = ''
    uni.reLaunch({ url: '/pages/home/home' })
  } catch (cause) {
    error.value = cause.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="login-page">
    <view class="login-decoration" aria-hidden="true">
      <text>✦</text><text>✿</text><text>✳</text>
    </view>
    <view class="login-card">
      <view class="login-brand">
        <view class="brand-mark"><text>P</text></view>
        <view class="brand-copy">
          <text class="brand-name">Personal Hub</text>
          <text class="brand-sub">我的生活空间</text>
        </view>
      </view>
      <view class="login-intro">
        <text class="eyebrow">WELCOME BACK</text>
        <text class="login-title">欢迎回来</text>
        <text class="login-hint">登录后继续记录你的想法与日常。</text>
      </view>
      <view class="login-form">
        <!-- #ifndef H5 -->
        <view class="field">
          <text class="field-label">服务器地址</text>
          <input v-model="serverAddress" class="field-input" placeholder="https://your-server" placeholder-class="field-placeholder">
        </view>
        <!-- #endif -->
        <view class="field">
          <text class="field-label">用户名</text>
          <input v-model="username" class="field-input" :maxlength="100" placeholder="请输入用户名" placeholder-class="field-placeholder">
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <input v-model="password" class="field-input" password :placeholder="'请输入密码'" placeholder-class="field-placeholder">
        </view>
        <text v-if="error" class="login-error">{{ error }}</text>
        <view class="login-button" :class="{ disabled: submitting }" @click="submit">
          <text>{{ submitting ? '正在登录…' : '进入我的空间 ↗' }}</text>
        </view>
      </view>
      <text class="login-footnote">属于你的私人空间，请妥善保管登录密码。</text>
    </view>
  </view>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 100rpx 40rpx 80rpx;
  background: linear-gradient(160deg, #eef6ef 0%, #f8f9f7 45%, #e8f2e8 100%);
  box-sizing: border-box;
}

.login-decoration {
  display: flex;
  gap: 24rpx;
  padding-left: 16rpx;
  font-size: 40rpx;
  color: #69a083;
  margin-bottom: 48rpx;
}

.login-card {
  background: #ffffff;
  border: 1px solid #e9eeea;
  border-radius: 32rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 18rpx 48rpx rgba(33, 89, 77, 0.08);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.brand-mark {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: #21594d;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  font-weight: 700;
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #252b30;
}

.brand-sub {
  font-size: 24rpx;
  color: #8da29a;
}

.login-intro {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 40rpx;
}

.eyebrow {
  font-size: 20rpx;
  letter-spacing: 4rpx;
  color: #69a083;
}

.login-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #252b30;
}

.login-hint {
  font-size: 26rpx;
  color: #65716d;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.field-label {
  font-size: 24rpx;
  color: #5a7565;
}

.field-input {
  height: 88rpx;
  padding: 0 24rpx;
  border: 1px solid #e8ece9;
  border-radius: 16rpx;
  background: #fbfcfb;
  font-size: 28rpx;
  color: #252b30;
}

.field-placeholder {
  color: #aebbb4;
}

.login-error {
  font-size: 24rpx;
  color: #b04a3e;
  background: #faeee9;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
}

.login-button {
  height: 92rpx;
  border-radius: 18rpx;
  background: #21594d;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-button.disabled {
  opacity: 0.6;
}

.login-footnote {
  display: block;
  margin-top: 36rpx;
  font-size: 22rpx;
  color: #9ca6a1;
  text-align: center;
}
</style>
