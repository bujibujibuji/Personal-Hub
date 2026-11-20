// Markdown 渲染与摘要。App 端没有 DOM，使用 markdown-it 转出 HTML 后交给 mp-html 组件安全解析渲染。
// 这里刻意选用 markdown-it 13：它的代码不含命名捕获组、Unicode 属性转义等新语法，
// 老版本 Android WebView（Chrome 49 起）也能正常解析；升级前请先运行 npm run check:app-syntax。
import MarkdownIt from 'markdown-it/dist/markdown-it.js'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
})

export function renderMarkdown(content) {
  if (!content || !content.trim()) return '<p class="markdown-empty">暂无正文</p>'
  return md.render(content)
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
