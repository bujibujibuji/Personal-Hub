// Markdown 渲染与摘要。App 端没有 DOM，使用 marked 转出 HTML 后交给 mp-html 组件安全解析渲染。
import { marked } from 'marked'

marked.use({ breaks: true, gfm: true })

export function renderMarkdown(content) {
  if (!content || !content.trim()) return '<p class="markdown-empty">暂无正文</p>'
  return marked.parse(content)
}

export function plainExcerpt(content) {
  return (
    (content || '')
      .replace(/```[\s\S]*?```/g, ' 代码片段 ')
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' 图片 ')
      .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~-]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || '暂无正文'
  )
}
