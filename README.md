# Personal Hub

个人化生活与知识管理系统，长期保存笔记、日记、图片、附件和穿搭记录。
前端为 **uni-app（Vue 3 + Vite）**，可打包为 Android App 安装到手机；后端 Spring Boot 与 MySQL 部署在服务器上，App 与网页版共用同一套数据。

## 当前结构

- `frontend/`：uni-app 前端（编译目标：Android App + H5 网页）
- `backend/`：Spring Boot 后端与笔记、日记 CRUD API
- `uploads/`：图片和附件存储目录
- `docs/`：项目设计与部署文档（App 打包见 `docs/mobile-app.md`）
- `docker-compose.yml`：服务器部署配置（MySQL、Spring Boot、H5 前端）

## 启动前端（H5 开发模式）

先在一个终端启动后端：

```powershell
cd backend
$env:PERSONAL_HUB_DB_PASSWORD = 'personal_hub 数据库用户密码'
$env:PERSONAL_HUB_ADMIN_USERNAME = 'admin'
$env:PERSONAL_HUB_ADMIN_PASSWORD = '你为 Personal Hub 设置的登录密码'
mvn -s test-settings.xml -gs test-settings.xml spring-boot:run
```

再在另一个终端启动前端：

```powershell
cd frontend
npm install
npm run dev:h5
```

打开终端里提示的本地地址，进入“笔记”或“日记”即可新增、查看、编辑和删除。正文支持 Markdown 编辑、预览和图片上传，原始 Markdown 文本保存在本机 MySQL 的 `personal_hub` 数据库中；首次启动时会自动创建数据库和 `notes`、`diaries` 表。H5 开发服务器会把 `/api` 请求转发给端口 8080 的后端。

“日记”按天记录：每篇日记可以选择日期（支持补记）、天气和心情，标题可留空；正文同样支持 Markdown 编辑、预览和图片上传（复用笔记的图片上传通道，保存在 `uploads/` 中）。

打包 Android App 的完整步骤见 `docs/mobile-app.md`（HBuilderX 云打包，无需安卓开发环境）。

## 手机 App

- 手机端以 Android App 形式安装使用，数据仍然保存在服务器上，需要联网访问；
- **App 支持热更新**：日常更新只需推送代码，App 启动时会自动提示一键升级前端，无需重新打包安装 APK；
- App 登录页可随时修改服务器地址，方便在不同网络间切换；
- 换手机或重装 App 都不会丢失数据，数据备份依旧只需备份 MySQL 与整个 `uploads/` 目录。

上传的 JPG、PNG、GIF、WebP 图片保存在项目根目录的 `uploads/` 中，单张最大 10MB。普通附件保存在 `uploads/files/` 中，单个最大 50MB；MySQL 的 `attachments` 表保存附件原始名称和存储信息。点击附件链接会在应用内预览：`.md` / `.txt` 直接渲染，`.doc` / `.docx` 由后端转换为简化排版后预览（限 20MB，图片与复杂格式建议下载查看），其他格式引导下载打开。部署和备份时需要同时保留 MySQL 数据库与整个 `uploads/` 目录。可以通过 `PERSONAL_HUB_UPLOAD_DIR` 和 `PERSONAL_HUB_FILE_DIR` 环境变量修改保存位置。

数据库连接默认使用 `127.0.0.1:3306` 和专用的 `personal_hub` 用户。可以通过 `PERSONAL_HUB_DB_URL`、`PERSONAL_HUB_DB_USERNAME`、`PERSONAL_HUB_DB_PASSWORD` 环境变量覆盖，密码不写入项目文件。

首次启动时，后端会使用 `PERSONAL_HUB_ADMIN_USERNAME` 和 `PERSONAL_HUB_ADMIN_PASSWORD` 创建管理员。登录密码至少 8 位，并以 BCrypt 哈希保存在 MySQL 中；环境变量中的明文密码不会写入数据库。管理员创建后不会在后续启动时被覆盖。

如果从 IDEA 启动后端，请在运行配置的环境变量中加入上述变量，然后重新启动后端。MySQL 数据需要使用 `mysqldump` 等方式定期备份。

当前使用项目内的 `backend/test-settings.xml` 绕过本机格式有误的 Maven 全局配置。修好全局 `settings.xml` 后可直接使用普通 `mvn` 命令。

## 图片访问说明

App 端渲染笔记内图片时不携带登录会话，因此 `GET /api/images/*` 对未登录请求开放；图片文件名为随机 UUID，无法枚举，隐私风险可控。**附件下载（`/api/files/**`）仍然必须登录**。

## 服务器部署

推荐按 `docs/deployment-public.md` 部署：**手机 App / 浏览器直接访问 `http://服务器IP:8081`**，不需要域名和备案，零额外费用；代码推送到 GitHub 后由 Actions 自动构建镜像，服务器上的 Watchtower 每 2 分钟自动拉取更新，**推代码约 5~8 分钟后线上即可看到效果**，全程无需登录服务器。以后想要更安全，再按同一文档的"模式 B"升级为域名 + HTTPS。

如果不购买服务器公网条件，也可以按 `docs/deployment-private.md` 使用 Tailscale 私有网络连接服务器；手机（App 或浏览器）登录同一个 Tailscale 账号后，通过专属 HTTPS 地址访问。MySQL 与上传文件放在持久化卷中，更新时重建容器不会丢数据。

## 后续计划

1. 完善独立文件库和附件管理
2. 增加修改密码和登录安全设置
3. 逐步加入穿搭和全局搜索
