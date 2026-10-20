<!--
 * @Author: buji 1493005357@qq.com
 * @Date: 2026-10-02 18:52:09
 * @LastEditors: buji 1493005357@qq.com
 * @LastEditTime: 2026-10-02 19:31:24
 * @FilePath: \Personal-Hub\frontend\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getAuthStatus, logout } from './api/auth'
import LoginView from './components/LoginView.vue'
import NotesView from './components/NotesView.vue'

const sections = [
  { id: 'home', icon: '⌂', label: '首页', description: '你的空间，从这里开始。' },
  { id: 'notes', icon: '▤', label: '笔记', description: '把想法、知识与灵感慢慢收集起来。' },
  { id: 'diary', icon: '◫', label: '日记', description: '给每一天留下一点记忆。' },
  { id: 'outfits', icon: '◇', label: '穿搭', description: '记录喜欢的衣服与搭配。' },
  { id: 'files', icon: '▧', label: '文件', description: '让重要资料有一个固定的位置。' },
]

const activeId = ref(sections.some((item) => item.id === location.hash.slice(1)) ? location.hash.slice(1) : 'home')
const activeSection = computed(() => sections.find((item) => item.id === activeId.value))
const currentDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
const recentNotes = ref([])
const authLoading = ref(true)
const currentUser = ref(null)

async function refreshRecentNotes() {
  try {
    const response = await fetch('/api/notes')
    if (response.status === 401) return handleUnauthorized()
    if (response.ok) recentNotes.value = await response.json()
  } catch { recentNotes.value = [] }
}

async function initializeAuth() {
  try {
    const status = await getAuthStatus()
    if (status.authenticated) {
      currentUser.value = status
      await refreshRecentNotes()
    }
  } finally {
    authLoading.value = false
  }
}

function handleLoggedIn(status) {
  currentUser.value = status
  refreshRecentNotes()
}

function handleUnauthorized() {
  currentUser.value = null
  recentNotes.value = []
  activeId.value = 'home'
}

async function signOut() {
  try { await logout() } finally { handleUnauthorized() }
}

function navigate(id) {
  activeId.value = id
  location.hash = id === 'home' ? '' : id
}
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1)
  activeId.value = sections.some((item) => item.id === hash) ? hash : 'home'
})
onMounted(initializeAuth)
</script>

<template>
  <div v-if="authLoading" class="auth-loading"><span>正在打开你的空间…</span></div>
  <LoginView v-else-if="!currentUser" @logged-in="handleLoggedIn" />
  <div v-else class="app-shell">
    <aside class="sidebar" aria-label="主导航">
      <button class="brand" type="button" @click="navigate('home')">
        <span class="brand-mark">P<span>·</span></span>
        <span class="brand-copy"><strong>Personal Hub</strong><small>我的生活空间</small></span>
      </button>
      <div class="nav-caption">我的空间</div>
      <nav class="nav-list">
        <button v-for="item in sections" :key="item.id" type="button" class="nav-item" :class="{ active: activeId === item.id }" :aria-current="activeId === item.id ? 'page' : undefined" @click="navigate(item.id)">
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span><span v-if="item.id !== 'home'" class="nav-arrow" aria-hidden="true">↗</span>
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="side-note"><span>✳</span><p>留一点空间给日常，<br>也留一点空间给自己。</p></div>
        <div class="profile"><span class="avatar">我</span><div class="profile-copy"><strong>{{ currentUser.username }}</strong><small>已安全登录</small></div><button class="logout-button" type="button" title="退出登录" aria-label="退出登录" @click="signOut">↪</button></div>
      </div>
    </aside>

    <main class="main-content">
      <header class="topbar"><span>我的空间 <span class="slash">/</span> {{ activeSection.label }}</span><div class="topbar-actions"><span>{{ currentDate }}</span><button type="button" @click="signOut">退出</button></div></header>
      <div v-if="activeId === 'home'" class="page-content">
        <section class="welcome">
          <div class="welcome-copy"><span class="eyebrow">WELCOME HOME</span><h1>你好，欢迎回来<span class="title-dot">.</span></h1><p>把每一天的想法、发现和喜欢的事物，安放在这里。</p><button class="primary-button" type="button" @click="navigate('notes')">开始记录 <span>↗</span></button></div>
          <div class="welcome-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="flower">✿</span><span class="spark">✦</span><span class="art-caption">a space to grow.</span></div>
        </section>
        <section class="section-block"><div class="section-heading"><div><span class="eyebrow">EXPLORE YOUR SPACE</span><h2>从这里开始</h2></div><p>一点一点，搭建属于自己的生活地图</p></div>
          <div class="module-grid"><button v-for="item in sections.slice(1)" :key="item.id" type="button" class="module-card" :class="`module-${item.id}`" @click="navigate(item.id)"><span class="module-icon" aria-hidden="true">{{ item.icon }}</span><strong>{{ item.label }}</strong><span class="module-description">{{ item.description }}</span><span class="module-footer">{{ item.id === 'notes' ? '进入笔记' : '即将开放' }} <span>↗</span></span></button></div>
        </section>
        <section class="lower-grid"><div class="recent-panel"><span class="eyebrow">YOUR RECENT MOMENTS</span><h2>最近记录</h2><div v-if="!recentNotes.length" class="empty-state"><span>✎</span><strong>你的故事，即将从这里开始</strong><p>第一篇笔记完成后，会在这里出现。</p></div><button v-for="note in recentNotes.slice(0, 3)" :key="note.id" type="button" class="recent-note" @click="navigate('notes')"><strong>{{ note.title }}</strong><span>{{ new Date(note.updatedAt).toLocaleDateString('zh-CN') }}</span></button></div><div class="quote-panel"><span class="quote-mark">“</span><p>生活不是等待被记录，<br>而是在记录中慢慢变得清晰。</p><span class="quote-footer">PERSONAL HUB · 每一天都值得珍藏</span></div></section>
      </div>
      <NotesView v-else-if="activeId === 'notes'" @changed="recentNotes = $event" @unauthorized="handleUnauthorized" />
      <div v-else class="page-content subpage"><span class="eyebrow">YOUR PERSONAL SPACE</span><h1>{{ activeSection.label }}<span class="title-dot">.</span></h1><p>{{ activeSection.description }}</p><div class="coming-soon"><span class="coming-icon">{{ activeSection.icon }}</span><span class="eyebrow">即将开放</span><h2>{{ activeSection.label }}空间正在准备中</h2><p>我们会先完成笔记功能，再逐步加入这里的内容。</p><button type="button" class="back-button" @click="navigate('home')">← 返回首页</button></div></div>
    </main>
  </div>
</template>
