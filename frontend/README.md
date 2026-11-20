# Frontend（uni-app）

uni-app（Vue 3 + Vite）前端，一份代码编译为 Android App 与 H5 网页版。

## 目录结构

```
frontend/
├── package.json          # uni-app 依赖与脚本（dev:h5 / build:h5 / build:app）
├── vite.config.js        # vite + uni 插件；H5 开发时把 /api 代理到本机 8080
├── index.html            # H5 模板
├── tools/gen-icons.mjs   # 生成 tabBar 图标（node tools/gen-icons.mjs；App 桌面图标在 icons/）
├── tools/scan-syntax.cjs # 检查 App 产物语法能否跑在旧 WebView（npm run check:app-syntax）
└── src/
    ├── main.js           # 应用入口
    ├── App.vue           # 全局样式 + 启动时查询登录状态
    ├── manifest.json     # App 打包配置（包名、权限、Android 配置）
    ├── pages.json        # 页面路由、tabBar、导航栏样式
    ├── config.js         # App 端默认服务器地址（打包前务必修改）
    ├── api/              # request 网络层（Cookie/CSRF/401 处理）、auth、notes、uploads
    ├── store/session.js  # 全局登录状态
    ├── utils/            # markdown 渲染、日期格式化、旧 WebView polyfill、启动诊断
    ├── static/           # 图标资源
    └── pages/
        ├── login/        # 登录（App 端多一个“服务器地址”输入框）
        ├── home/         # 首页：模块入口 + 最近笔记
        ├── notes/        # 笔记列表
        ├── note/         # 笔记详情 / Markdown 编辑预览 / 图片附件上传
        └── placeholder/  # 日记、穿搭、文件等未开放模块
```

## 常用命令

```powershell
npm install
npm run dev:h5      # 浏览器调试，/api → localhost:8080
npm run dev:app     # App 基座调试（配合 HBuilderX 真机运行）
npm run build:h5    # H5 产物 dist/build/h5（Docker 部署用）
npm run build:app   # App 产物 dist/build/app
npm run check:app-syntax  # 检查 App 产物能否在老 WebView 上解析（需先 build:app）
npm run icons       # 重新生成图标
```

## 关键实现说明

- **会话**：Spring Security 是 session cookie + CSRF header 方案。App 端 `uni.request`
  不自动管理跨请求 Cookie，`api/request.js` 手动解析 `Set-Cookie` 并持久化到本地存储，
  请求时回填 `Cookie` 头；H5 端交给浏览器自动处理。
- **Markdown**：App 端逻辑层没有 DOM，不能再用 DOMPurify + v-html。现在用
  `markdown-it`（13.x，语法兼容老 WebView）转出 HTML，交给 `mp-html` 组件安全解析渲染；
  `domain` 属性负责把 `/api/images/...` 相对地址补全成服务器绝对地址。
- **老设备兼容**：App 端 `app-service.js` 由手机系统 WebView 执行，因此
  `vite.config.js` 把语法降级到 es2015，`src/utils/polyfill.js` 补齐缺失的内置方法。
  升级依赖后务必执行 `npm run check:app-syntax`，避免引入命名捕获组、`\p{...}`、
  `matchAll` 等 Chrome 64+ 才有的特性导致整页白屏。
- **上传**：图片用 `uni.chooseImage`，附件用 `uni.chooseFile`，统一走 `uni.uploadFile`
  并附带 CSRF 与 Cookie 头。
- **附件预览**：`mp-html` 的 `linktap` 事件拦截 `/api/files/**` 链接，
  `uni.downloadFile`（带 Cookie）下载后用 `uni.openDocument` 打开。

打包 APK 的步骤见 `../docs/mobile-app.md`。
