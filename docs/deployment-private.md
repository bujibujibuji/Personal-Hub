# Personal Hub 私人服务器部署

适用环境：Ubuntu 22.04 服务器，供自己的手机和电脑私下访问。采用 Docker Compose 运行 MySQL、Spring Boot 和前端，Tailscale Serve 提供仅限个人 Tailnet 的 HTTPS 入口。

## 需要准备

- Ubuntu 服务器的 SSH 登录方式
- 一个 Tailscale 账号（个人方案当前免费，最多 6 位用户，用户设备不限）
- 自己设置的数据库密码、MySQL 管理员密码和 Personal Hub 登录密码

此方案无需购买域名。服务器只把网站绑定到本机 `127.0.0.1:8081`；Tailscale Serve 将它安全地提供给已加入你 Tailnet 的设备。不要启用 Tailscale Funnel。

## 首次部署

1. 在 Ubuntu 22.04 安装 Docker Engine 与 Docker Compose 插件，并安装 Tailscale。将服务器加入自己的 Tailscale 网络，建议把设备名称设为 `personal-hub`。
2. 在 Tailscale 管理控制台打开 MagicDNS 与 HTTPS Certificates。启用 HTTPS 时，Tailscale 会提示确认机器名称会出现在公开的证书透明度日志中；请使用不含个人敏感信息的机器名。
3. 将本项目放到服务器（例如 `/opt/personal-hub`），进入该目录：

   ```bash
   cd /opt/personal-hub
   cp .env.example .env
   nano .env
   ```

4. 将 `.env` 中的示例值替换成独立、足够长的随机密码。`PERSONAL_HUB_ADMIN_PASSWORD` 是网页登录密码，至少 8 位。不要把真实 `.env` 上传到 Git。
5. 分开构建镜像，降低 2GB 内存服务器首次构建时的峰值占用，再启动服务：

   ```bash
   docker compose build backend
   docker compose build web
   docker compose up -d
   docker compose ps
   ```

6. 在服务器运行下面命令开启仅限 Tailnet 的 HTTPS 访问：

   ```bash
   sudo tailscale serve --bg 8081
   sudo tailscale serve status
   ```

   状态输出会显示一个 `https://设备名.你的Tailnet.ts.net` 地址。首次使用时，按命令提示在 Tailscale 管理页面启用 HTTPS。

7. 在手机安装 Tailscale 并登录同一账号，保持 Tailscale 已连接。用手机浏览器打开上一步显示的 HTTPS 地址并登录 Personal Hub。

## 安装到手机桌面

- Android：使用 Chrome 打开 HTTPS 地址，在菜单中选择“安装应用”或“添加到主屏幕”。
- iPhone：使用 Safari 打开 HTTPS 地址，点“分享 → 添加到主屏幕”；需要访问时，先保持 Tailscale 连接。

前端的 PWA 清单提供独立窗口和图标。页面目前需要联网；离线时不会显示或缓存笔记。

## 更新

在服务器项目目录执行（前提是已经为项目配置了 Git 远程仓库）：

```bash
git pull
docker compose up -d --build
```

MySQL 数据和上传文件保存在 Docker 持久化卷中，重建容器不会删除这些数据。仍需定期备份数据库与上传文件；不要执行 `docker compose down -v`，它会删除持久化卷。

如果还没有 Git 远程仓库，更新方式是先把本机改动提交并推送到私有仓库，再在服务器执行上面的更新命令。首次部署也需要把项目文件传到服务器；不需要把 `.env` 或本地笔记备份提交到仓库。

## 网络访问

云防火墙仅需开放 SSH 管理端口。应用端口 8081 只绑定在服务器本机，MySQL 不映射到公网；网站访问经 Tailscale 私有网络进行。Tailscale 账号和手机端应用需要持续可用，手机连接 Tailscale 后才能访问。

如果以后要让不安装 Tailscale 的设备访问，或者公开分享网站，再购买域名并切换为公开 HTTPS 部署；中国内地服务器还需先完成 ICP 备案。
