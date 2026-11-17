# Personal Hub 服务器部署与自动更新

适用环境：国内云服务器（Ubuntu 22.04）+ GitHub 仓库。GitHub Actions 云端构建镜像，服务器上的 Watchtower 自动拉取更新；App 和浏览器直接通过 `http://服务器IP:端口` 访问。

## 两种访问模式

| | A. IP 直连（默认，推荐） | B. 域名 + HTTPS |
|---|---|---|
| 域名 | 不需要 | 需要（¥10~80/年） |
| ICP 备案 | **不需要**（备案针对域名） | 国内服务器必须 |
| 加密 | HTTP 明文传输 | HTTPS 加密 |
| App 里填的服务器地址 | `http://服务器IP:8081` | `https://你的域名` |

先用模式 A 上线（零成本、当天可用）；以后想更安全再买域名备案，切换只改 `.env` 两行。两种模式的构建、更新、备份完全相同。

## 整体架构

```
本地改代码 → git push (main)
                 │
                 ▼
        GitHub Actions（云端构建，约 3~5 分钟）
        ├─ personal-hub-backend 镜像 → ghcr.io
        └─ personal-hub-web     镜像 → ghcr.io
                 │
                 ▼
        服务器 watchtower（每 2 分钟轮询）
        发现新镜像 → 自动拉取并重启 backend / web
                 │
                 ▼
   手机 App / 浏览器 ──▶ Caddy(web):8081 ──/api──▶ Spring Boot ──▶ MySQL
                    （静态 H5 页面）              uploads 卷
```

推代码到页面上看到效果，全流程约 **5~8 分钟**，服务器全程不需要登录操作。

## 模式 A：IP 直连（推荐起步）

### 一、服务器准备

1. 云控制台**安全组/防火墙**放行：`22`（SSH 管理）和 `8081`（网站端口，可用 `.env` 的 `WEB_PORT` 改成别的）。
2. 安装 Docker：

   ```bash
   curl -fsSL https://get.docker.com | sh
   docker --version && docker compose version
   ```

### 二、推送代码触发首次构建

项目已配置 `.github/workflows/deploy.yml`，推送到 `main` 即自动构建：

```bash
git push origin main
```

在 GitHub 仓库的 **Actions** 页确认两个 job（backend、web）变绿，约 3~5 分钟。构建成功后，仓库右侧 **Packages** 出现 `personal-hub-backend` 和 `personal-hub-web` 两个镜像包（默认私有，仅自己可见）。

### 三、服务器准备 GHCR 拉取凭证

镜像包是私有的，服务器需要一个只读凭证：

1. GitHub → Settings → Developer settings → **Personal access tokens (classic)** → Generate new token，勾选 `read:packages`（细粒度 PAT 目前不支持 GHCR，请选 classic）；
2. 在服务器执行（token 只存进 Docker 凭证文件，不要写进项目或 Git）：

   ```bash
   sudo docker login ghcr.io -u 你的GitHub用户名
   # 粘贴 token
   ```

Watchtower 拉取镜像用的是同一份凭证（compose 已挂载 `/root/.docker/config.json`）；如果你用普通用户登录，把挂载路径改成 `~/.docker/config.json`。

### 四、服务器配置并启动

```bash
sudo mkdir -p /opt/personal-hub && cd /opt/personal-hub
git clone https://github.com/bujibujibuji/Personal-Hub.git .
cp .env.example .env
nano .env
```

`.env` 必填项（IP 模式下 `SITE_ADDRESS` 留空）：

```ini
WEB_PORT=8081
GHCR_OWNER=bujibujibuji           # 你的 GitHub 用户名
DB_PASSWORD=一个长随机密码
MYSQL_ROOT_PASSWORD=另一个长随机密码
PERSONAL_HUB_ADMIN_PASSWORD=你的登录密码（至少 8 位，建议 16 位以上）
```

启动（首次需手动 pull，之后交给 watchtower）：

```bash
docker compose pull
docker compose up -d
docker compose ps
```

验证：浏览器打开 `http://服务器IP:8081`，用 `PERSONAL_HUB_ADMIN_USERNAME` / `PERSONAL_HUB_ADMIN_PASSWORD` 登录。

### 五、手机 App

HBuilderX 按照书 `docs/mobile-app.md` 云打包出 APK（免费；实名认证可去掉 DCloud 开屏广告），安装到手机后：

1. 打开 App，登录页把**服务器地址**改成 `http://服务器IP:8081`；
2. 输入用户名密码登录。App 已配置允许 HTTP 明文访问（`usesCleartextTraffic`），无需额外设置。

也可以不装 App，直接用手机浏览器打开地址并"添加到主屏幕"。

### 六、HTTP 明文的安全提示

IP 直连不走 HTTPS，账号密码和内容在网络上明文传输。个人低频使用风险可控，建议：

- 登录密码 16 位以上随机字符串；
- `WEB_PORT` 改成五位数端口（如 `23456`）减少扫描；
- 不在公共 WiFi 下登录。

## 模式 B：升级为域名 + HTTPS

前提：已购域名并完成 ICP 备案（国内服务器对外提供域名网站服务必须备案，个人备案约 1~2 周），域名 A 记录已指向服务器 IP。

1. 云安全组额外放行 `80`、`443`（TCP + UDP）；
2. 服务器 `.env` 修改：

   ```ini
   SITE_ADDRESS=hub.example.com
   ```

3. `docker-compose.yml` 中 web 的 `ports` 改为（默认的 `WEB_PORT` 那行可删）：

   ```yaml
   ports:
     - "80:80"
     - "443:443"
     - "443:443/udp"
   ```

4. `docker compose up -d`，Caddy 会自动申请并续期 Let's Encrypt 证书；
5. App 登录页把服务器地址改成 `https://你的域名`。

## 日常开发：推代码即更新

```bash
# 本地改完代码
git add -A && git commit -m "..."
git push origin main
# 完事。接下来全自动：
# Actions 构建新镜像（可在 Actions 页看进度）
# watchtower 2 分钟内拉取并重启服务
```

注意事项：

- 只改 Java/Vue 代码 → 全自动，无需操作服务器；
- 改了 `docker-compose.yml` 或 `.env` → 服务器执行一次 `docker compose up -d` 让配置生效；
- 不想发布可以只往非 `main` 分支推送，Actions 只监听 `main`；也可以在 GitHub Actions 页手动 **Run workflow** 重新构建。

## 回滚

每次构建都会同时打 `latest` 和 commit SHA 两个标签。回滚时在服务器 `.env` 里把 TAG 指到旧版本：

```bash
nano .env          # TAG=旧版本的 commit SHA（在 GitHub Packages 或 Actions 历史里查）
docker compose up -d
```

恢复跟踪最新版：把 TAG 改回 `latest`，再 `docker compose up -d`。

## 备份（仍然重要）

自动更新不会动数据，但磁盘损坏、误删卷仍会丢数据：

```bash
# 数据库（在服务器上执行，文件保存在项目目录外更安全）
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" personal_hub' > backup-$(date +%F).sql

# 上传的图片与附件（uploads 卷）
docker run --rm -v personal-hub_uploads_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz /data
```

建议每周跑一次，把备份文件下载到本机或网盘。**不要执行 `docker compose down -v`**，会删掉持久化卷。

## 常见问题

- **`docker compose pull` 拉不动 / 超时**：内地服务器访问 ghcr.io 偶尔较慢。重试几次通常可以；持续不通时可先在服务器本地构建救急：`docker compose build backend web && docker compose up -d`（compose 保留了 build 通道），等网络恢复后 watchtower 会自动追平。
- **仓库是私有时 clone 失败**：用一个只读 PAT（Fine-grained，仅勾选该仓库 Contents: Read）或 SSH deploy key。
- **IP:8081 打不开**：检查安全组是否放行该端口、`docker compose ps` 容器是否都在运行、`docker compose logs web` 看报错。
- **修改密码后 App 登不上**：`.env` 改了 `PERSONAL_HUB_ADMIN_PASSWORD` 只影响首次创建的管理员，不会改已存在账号；该变量只在数据库无用户时生效。
- **服务器磁盘紧张**：watchtower 已带 `--cleanup` 自动清理旧镜像；也可 `docker system prune` 手动清理。
