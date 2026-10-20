<script setup>
import { ref } from 'vue'
import { login } from '../api/auth'

const emit = defineEmits(['logged-in'])
const username = ref('admin')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码。'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const status = await login(username.value.trim(), password.value)
    if (!status.authenticated) throw new Error('登录状态确认失败，请重试。')
    password.value = ''
    emit('logged-in', status)
  } catch (cause) {
    error.value = cause.message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-decoration" aria-hidden="true"><span>✦</span><span>✿</span><span>✳</span></div>
    <section class="login-card">
      <div class="login-brand"><span class="brand-mark">P<span>·</span></span><div><strong>Personal Hub</strong><small>我的生活空间</small></div></div>
      <div class="login-intro"><span class="eyebrow">WELCOME BACK</span><h1>欢迎回来<span class="title-dot">.</span></h1><p>登录后继续记录你的想法与日常。</p></div>
      <form @submit.prevent="submit">
        <label for="login-username">用户名</label>
        <input id="login-username" v-model="username" name="username" autocomplete="username" maxlength="100" placeholder="请输入用户名">
        <label for="login-password">密码</label>
        <input id="login-password" v-model="password" name="password" type="password" autocomplete="current-password" placeholder="请输入密码">
        <p v-if="error" class="login-error" role="alert">{{ error }}</p>
        <button class="login-button" type="submit" :disabled="submitting">{{ submitting ? '正在登录…' : '进入我的空间' }} <span>↗</span></button>
      </form>
      <p class="login-footnote">属于你的私人空间，请妥善保管登录密码。</p>
    </section>
  </main>
</template>
