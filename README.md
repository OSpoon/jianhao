<div align="center">
  <img src="./src/assets/brand-mark.png" alt="渐好 Logo" width="96" height="96">
  <h1>渐好</h1>
  <p><strong>一款轻巧、专注本地体验的桌面坐姿提醒工具</strong></p>
  <p>实时感知坐姿变化，并以覆盖整个窗口的柔和提醒遮罩提示你适时调整。</p>
  <p>
    <a href="https://github.com/OSpoon/jianhao/releases/latest">下载桌面版</a>
    · <a href="./LICENSE">MIT License</a>
    · <a href="https://github.com/OSpoon/jianhao/issues">反馈问题</a>
  </p>
  <p>
    <img src="https://img.shields.io/github/license/OSpoon/jianhao?style=flat-square" alt="MIT License">
    <img src="https://img.shields.io/badge/macOS-Apple%20Silicon-555?style=flat-square" alt="macOS Apple Silicon">
    <img src="https://img.shields.io/badge/Windows-x64-555?style=flat-square" alt="Windows x64">
  </p>
</div>

## 关于渐好

渐好（Jianhao）通过电脑摄像头观察坐姿，在桌面悬浮窗口中呈现实时状态。检测和姿态分析都在本机完成，摄像头画面不会上传。

它希望把坐姿提醒做得及时、简单，不打断你正在进行的工作：保持自然坐姿完成校准，之后即可开始监测；需要调整时，整个窗口会出现柔和的半透明红黄渐变提醒遮罩。

## 主要功能

| 功能 | 说明 |
| --- | --- |
| 本地实时监测 | 在本机分析摄像头画面，不上传视频 |
| 自然坐姿校准 | 以当前坐姿建立个人基线，并支持重新校准 |
| 全窗视觉提醒 | 显示当前姿态状态，并通过覆盖整个窗口的柔和红黄渐变遮罩提示需要调整的情况 |
| 轻巧悬浮窗口 | 提供圆形和圆角矩形预览，可置顶显示、拖动位置 |
| 摄像头与镜像 | 选择摄像头、切换左右镜像，设置会保存在本机 |
| 个性化监测 | 调整检测灵敏度；可选在监测时保持屏幕唤醒 |
| 本地诊断日志 | 查看并打开本机日志目录，便于排查问题 |

## 下载与开始使用

前往 [GitHub Releases](https://github.com/OSpoon/jianhao/releases/latest) 下载最新安装包。当前自动构建的发行目标为：

- macOS Apple Silicon（`aarch64-apple-darwin`）
- Windows x64（`x86_64-pc-windows-msvc`）

首次使用时，允许应用访问摄像头，然后点击窗口中的开始按钮。应用默认使用系统摄像头；也可以在设置中选择其他设备。保持自然坐姿并完成校准后即可开始监测。

应用不会在后台持续运行。关闭主窗口会退出应用并停止摄像头监测。需要更新时，可从菜单栏图标菜单手动检查；下载和安装前会先征求确认。

## 隐私

摄像头画面、姿态推理与坐姿判断均在本机处理。应用不上传摄像头画面。更新检查会连接项目的 GitHub Releases 服务；诊断日志保存在本机应用数据目录中。

## 开发

### 环境要求

- Node.js `24.15.0`（见 [`.nvmrc`](./.nvmrc)）
- pnpm `10.15.1`
- Rust `1.95.0`（见 [`rust-toolchain.toml`](./rust-toolchain.toml)）
- macOS 开发需要 Xcode Command Line Tools

### 运行与构建

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

```sh
pnpm lint
pnpm typecheck
pnpm test:rust
pnpm clippy
pnpm build
pnpm tauri build
```

`pnpm format` 会自动格式化前端和 Rust 代码；`pnpm format:check` 用于检查格式。Linux CI 还需要安装 WebKitGTK 等 Tauri 系统依赖，详见 [CI workflow](./.github/workflows/ci.yml)。

修改 Logo 后运行 `pnpm icons:generate`，从 `src/assets/brand-mark.png` 重新生成应用图标。

### 发布

#### 配置应用内更新签名

首次发布前，在项目根目录生成 Tauri 更新签名密钥：

```sh
pnpm tauri signer generate -w ./.tauri/updater.key
```

命令会生成私钥 `.tauri/updater.key` 和对应的公钥 `.tauri/updater.key.pub`。`.tauri/` 已加入 Git 忽略列表。请妥善备份私钥，不要提交或分享；丢失私钥后，将无法为已安装的版本签发后续更新。

将 `.tauri/updater.key.pub` 的**文件内容**填入 [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json) 的 `plugins.updater.pubkey`，不要填文件路径。`bundle.createUpdaterArtifacts` 已启用，无需额外修改。

然后在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

- `TAURI_SIGNING_PRIVATE_KEY`：`.tauri/updater.key` 的文件内容。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：生成私钥时设置的密码；未设置密码时可留空或不创建该 Secret。

推送 `v*` 标签后，发行工作流会使用这些 Secrets 为 macOS Apple Silicon 和 Windows x64 构建安装包、生成更新签名，并创建待审核的 GitHub Draft Release。CI 会在分支推送和 Pull Request 时运行前端与 Rust 检查。

更多参数与平台细节见 [Tauri Updater 文档](https://tauri.app/zh-cn/plugin/updater/)。

`pnpm release` 会更新版本号与变更日志、创建版本提交和标签，并推送到远端；运行前请确认当前分支、工作区和远端配置。

## 技术栈

Tauri 2、Vue 3、TypeScript、Rust、MediaPipe Tasks Vision 与 `@vueuse/core`。

## 灵感与致谢

渐好的产品创意与方案受到 [LinklyAI/upright](https://github.com/LinklyAI/upright) 启发，尤其是使用摄像头进行姿态监测与个人基线校准的方向。我们据此探索了适合渐好的桌面悬浮窗口、本地监测与即时视觉反馈体验。感谢 LinklyAI 团队开放并分享 Upright 项目。

## 许可证

本项目以 [MIT License](./LICENSE) 发布。
