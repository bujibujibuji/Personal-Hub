# 手机 App 打包指南（Android）

前端已从纯网页迁移到 **uni-app（Vue 3 + Vite）**，同一份代码可以编译为：

- **Android App（APK）**：本文档的主角，安装后像普通应用一样使用；
- **H5 网页版**：沿用原来的 Docker + Caddy 部署，作为备用的浏览器入口。

后端 Spring Boot 与 MySQL 保持不变，App 与网页版访问同一套 API 和数据。

## 0. 准备

1. 电脑上安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)（标准版即可，首次打包时会自动提示安装“App云打包/真机运行”插件）。
2. 手机和服务器保持可连通（推荐按 `deployment-private.md` 接入 Tailscale 私有网络）。
3. 确认 `frontend/src/config.js` 里的 `DEFAULT_SERVER` 改成了你的服务器地址，例如：

   ```js
   export const DEFAULT_SERVER = 'https://your-host.tailXXXX.ts.net'
   ```

   打包后如果忘了改，也可以在 App 登录页的“服务器地址”输入框里临时修改。

## 1. 日常开发调试（可选）

```powershell
cd frontend
npm install
npm run dev:h5     # 浏览器里调试，/api 自动转发到本机 8080 后端
npm run dev:app    # App 基座调试，配合 HBuilderX“运行到手机”
```

真机调试：手机开启 USB 调试并连接电脑，在 HBuilderX 中打开 `frontend/` 目录，
选择“运行 → 运行到手机或模拟器 → 运行到 Android App 基座”。

## 2. 打包 APK（云打包，无需安卓开发环境）

1. HBuilderX 打开 `frontend/` 目录（vue3 CLI 工程，HBuilderX 可直接识别）。
2. 首次使用需要生成 AppID：双击 `src/manifest.json` → 基础配置 → “重新获取”。
3. （可选）配置图标：`src/static/logo.png` 已提供 1024×1024 图标，在
   manifest → App图标配置 中上传并自动生成全套尺寸。
4. 菜单“发行 → 原生App-云打包”：
   - Android：包名默认 `com.personalhub.app`，可自行修改；
   - 证书：个人使用选择 **公共测试证书** 即可（不上架应用商店够用）；
   - 打包类型：正式包；渠道包留空。
5. 等待云端打包完成后，把生成的 APK 传到手机安装（允许安装未知来源应用）。

> 如果服务器是 `http://` 明文地址，Android 9+ 默认禁止明文流量。
> `src/manifest.json` 已配置 `usesCleartextTraffic: true`；若打包后仍无法访问，
> 请改用 Tailscale 的 HTTPS 地址，或在云打包对话框中确认允许明文流量。

## 3. 更新版本：热更新，无需重装 APK

日常改代码（页面、界面、逻辑）后推送到 `main` 分支，GitHub Actions 会自动：

1. 构建前端 App 资源并打成一个 `wgt` 热更新包（版本号 = CI 构建序号，自动递增）；
2. 把更新包打进后端镜像发布，服务器 watchtower 自动拉取；
3. 已安装的 App 下次启动时访问 `/api/app/check-update`，发现新版本后弹窗“立即更新”，下载 wgt 并自动安装重启。

**整个过程不需要重新云打包，也不需要在手机上重装 APK。**

注意：

- 只有升级 uni-app 基座、新增原生插件、修改 manifest 原生配置（图标、权限）时，才需要回到第 2 步重新云打包 APK；
- 首次云打包时 HBuilderX 会把 AppID 写入 `src/manifest.json`，**请提交该文件**——热更新包必须与已安装 App 的 AppID 一致才能安装；
- `versionCode` 由 CI 自动管理，不要手动修改；
- 更新接口（`/api/app/**`）无需登录即可访问，包里只有应用代码，不含任何用户数据。

数据全部保存在服务器的 MySQL 和 `uploads/` 目录里，换手机、重装 App 都不会丢数据。

## 4. H5 网页版（可选保留）

```powershell
npm run build:h5   # 产物在 dist/build/h5
```

服务器上的 `docker-compose.yml` 中的 `web` 服务会自动执行同一构建，由 Caddy 托管并
反代 `/api`，部署方式不变。

## 5. 常见问题

| 现象 | 处理 |
| --- | --- |
| 登录页提示“无法连接登录服务” | 检查服务器地址、手机网络（Tailscale 是否已连接） |
| 笔记里图片不显示 | 图片对未登录访问开放（文件名为随机 UUID），确认后端已升级到包含 `GET /api/images/* permitAll` 的版本 |
| 附件点击无反应 | 附件下载需要登录会话，重新登录后再试；个别格式手机无法预览 |
| 上传图片失败 | 确认图片 ≤ 10MB；附件 ≤ 50MB |
| 想换服务器地址 | 登录页修改“服务器地址”后重新登录即可，本地会话会自动清理 |
| 启动时没有更新提示 | 服务器还没有发布过热更新包（推一次代码即可），或此前已对该版本点过“下次再说” |
| 热更新提示“安装失败” | 更新包与已装 App 的 AppID 或基座不一致（如基座升级后），按第 2 步重新云打包安装一次 |
