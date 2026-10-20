# Personal Hub

个人化生活与知识管理系统，长期保存笔记、日记、图片、附件和穿搭记录。

## 当前结构

- `frontend/`：Vue 3 + Vite 前端
- `backend/`：Spring Boot 后端与笔记 CRUD API
- `uploads/`：图片和附件存储目录
- `docs/`：项目设计与部署文档
- `docker-compose.yml`：服务器部署配置（MySQL、Spring Boot、前端）

## 启动前端

先在一个终端启动后端：

```powershell
cd D:\Project\Personal-Hub\backend
$env:PERSONAL_HUB_DB_PASSWORD = 'personal_hub 数据库用户密码'
$env:PERSONAL_HUB_ADMIN_USERNAME = 'admin'
$env:PERSONAL_HUB_ADMIN_PASSWORD = '你为 Personal Hub 设置的登录密码'
mvn -s test-settings.xml -gs test-settings.xml spring-boot:run
```

再在另一个终端启动前端：

```powershell
cd D:\Project\Personal-Hub\frontend
npm run dev
```

打开 `http://localhost:5173/`，进入“笔记”即可新增、查看、编辑和删除。正文支持 Markdown 编辑、预览和图片上传，原始 Markdown 文本保存在本机 MySQL 的 `personal_hub` 数据库中；首次启动时会自动创建数据库和 `notes` 表。前端开发服务器会把 `/api` 请求转发给端口 8080 的后端。

上传的 JPG、PNG、GIF、WebP 图片保存在项目根目录的 `uploads/` 中，单张最大 10MB。普通附件保存在 `uploads/files/` 中，单个最大 50MB；MySQL 的 `attachments` 表保存附件原始名称和存储信息。部署和备份时需要同时保留 MySQL 数据库与整个 `uploads/` 目录。可以通过 `PERSONAL_HUB_UPLOAD_DIR` 和 `PERSONAL_HUB_FILE_DIR` 环境变量修改保存位置。

数据库连接默认使用 `127.0.0.1:3306` 和专用的 `personal_hub` 用户。可以通过 `PERSONAL_HUB_DB_URL`、`PERSONAL_HUB_DB_USERNAME`、`PERSONAL_HUB_DB_PASSWORD` 环境变量覆盖，密码不写入项目文件。

首次启动时，后端会使用 `PERSONAL_HUB_ADMIN_USERNAME` 和 `PERSONAL_HUB_ADMIN_PASSWORD` 创建管理员。登录密码至少 8 位，并以 BCrypt 哈希保存在 MySQL 中；环境变量中的明文密码不会写入数据库。管理员创建后不会在后续启动时被覆盖。

如果从 IDEA 启动后端，请在运行配置的环境变量中加入上述变量，然后重新启动后端。MySQL 数据需要使用 `mysqldump` 等方式定期备份。

当前使用项目内的 `backend/test-settings.xml` 绕过本机格式有误的 Maven 全局配置。修好全局 `settings.xml` 后可直接使用普通 `mvn` 命令。

## 手机安装

前端包含 PWA 应用清单和图标。部署为 HTTPS 后，可在 Android Chrome 中安装，或在 iPhone Safari 中通过“分享 → 添加到主屏幕”安装。应用需要联网访问服务器；私人笔记不会离线缓存。

## 服务器部署

个人手机使用不需要购买域名。推荐按 `docs/deployment-private.md` 使用 Tailscale 私有网络连接服务器；手机和服务器登录同一个 Tailscale 账号后，通过专属 HTTPS 地址访问。配置好私有 Git 远程仓库后，每次更新先推送代码，再在服务器拉取并重新构建；MySQL 与上传文件放在持久化卷中。

## 后续计划

1. 完善独立文件库和附件管理
2. 增加修改密码和登录安全设置
3. 逐步加入日记、穿搭和全局搜索

