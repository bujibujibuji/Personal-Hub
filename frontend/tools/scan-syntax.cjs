// 检查 App 端构建产物能否被老版本 Android WebView 解析。
// App 端 app-service.js 直接跑在手机系统 WebView 里，只要有一个新语法，
// 整个文件都会解析失败，表现为“闪屏约 10 秒 + 除底部导航外整页空白”。
// 用法：npm run check:app-syntax（需先 npm run build:app）
const fs = require('fs')
const path = require('path')
const acorn = require('acorn')

const file = process.argv[2] || path.join(__dirname, '../dist/build/app/app-service.js')
if (!fs.existsSync(file)) {
  console.error(`未找到构建产物：${file}\n请先运行 npm run build:app。`)
  process.exit(1)
}
const code = fs.readFileSync(file, 'utf8')

const problems = []

// 1) 语法检查：uni-app 声明支持 Android WebView 49+，对应 ES2015。
const versions = [2015, 2016, 2017, 2018, 2019, 2020]
for (const version of versions) {
  try {
    acorn.parse(code, {
      ecmaVersion: version,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
    })
    console.log(`语法：ES${version} 通过`)
    break
  } catch (error) {
    console.log(`语法：ES${version} 失败 -> ${error.message}`)
    if (version === 2015) problems.push(error.message)
  }
}

// 2) 正则表达式检查：esbuild 不会降级正则语法，必须单独扫描。
const patterns = [
  ['命名捕获组', /\(\?<[A-Za-z_$][\w$]*>/g],
  ['命名反向引用', /\\k<[A-Za-z_$][\w$]*>/g],
  ['Unicode 属性转义', /\\[pP]\{/g],
  ['后行断言', /\(\?<[=!]/g],
]
for (const [label, pattern] of patterns) {
  const matches = [...code.matchAll(pattern)]
  if (matches.length) {
    problems.push(`${label} ${matches.length} 处`)
    const index = matches[0].index
    console.log(`正则：发现${label} ${matches.length} 处：`)
    console.log(`  ...${code.slice(Math.max(0, index - 100), index + 100)}...`)
  }
}

// 3) 常用但老引擎缺失的内置方法（需确认 src/utils/polyfill.js 已覆盖）。
const missingApis = [
  'queueMicrotask',
  'matchAll',
  'Object.hasOwn',
  'replaceAll',
  'padStart',
  'Object.entries',
]
for (const api of missingApis) {
  const count = code.split(api).length - 1
  if (count) console.log(`内置方法：${api} 出现 ${count} 次（确认 polyfill 覆盖）`)
}

if (problems.length) {
  console.error(`\n检查失败：${problems.join('；')}`)
  process.exit(1)
}
console.log('\n检查通过：产物可用于 Chrome 49+ 的 WebView。')
