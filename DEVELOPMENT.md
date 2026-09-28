# 开发与发布指南

## 项目技术栈

渐好使用 Tauri 2、Vue 3、TypeScript、Rust、MediaPipe Tasks Vision 与 `@vueuse/core`。

## 环境要求

- Node.js `24.15.0`（见 [`.nvmrc`](./.nvmrc)）
- pnpm `10.15.1`
- Rust `1.95.0`（见 [`rust-toolchain.toml`](./rust-toolchain.toml)）
- macOS 开发需要 Xcode Command Line Tools

## 本地运行与检查

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

`pnpm format` 会格式化前端和 Rust 代码；`pnpm format:check` 用于检查格式。Linux CI 还需要安装 WebKitGTK 等 Tauri 系统依赖，详见 [CI workflow](./.github/workflows/ci.yml)。

修改 Logo 后运行 `pnpm icons:generate`，从 `src/assets/brand-mark.png` 重新生成应用图标。

## 官网部署

官网静态文件位于 [`website/`](./website/)，通过 GitHub Pages 发布。首次部署前，请在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。此后推送 `main` 分支上的官网或部署工作流改动时会自动发布；也可在 Actions 页面手动运行 `Deploy website`。

## 发布

### 配置应用内更新签名

首次发布前，在项目根目录生成 Tauri 更新签名密钥：

```sh
pnpm tauri signer generate -w ./.tauri/updater.key
```

命令会生成私钥 `.tauri/updater.key` 和对应的公钥 `.tauri/updater.key.pub`。`.tauri/` 已加入 Git 忽略列表。请妥善备份私钥，不要提交或分享；丢失私钥后，将无法为已安装的版本签发后续更新。

将 `.tauri/updater.key.pub` 的**文件内容**填入 [`src-tauri/tauri.conf.json`](./src-tauri/tauri.conf.json) 的 `plugins.updater.pubkey`，不要填文件路径。`bundle.createUpdaterArtifacts` 已启用，无需额外修改。

然后在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 添加：

- `TAURI_SIGNING_PRIVATE_KEY`：`.tauri/updater.key` 的文件内容。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：生成私钥时设置的密码；未设置密码时可留空或不创建该 Secret。

推送 `v*` 标签后，发行工作流会使用这些 Secrets 为 macOS Apple Silicon、macOS Intel 和 Windows x64 构建安装包、生成更新签名，并创建待审核的 GitHub Draft Release。CI 会在分支推送和 Pull Request 时运行前端与 Rust 检查。

更多参数与平台细节见 [Tauri Updater 文档](https://tauri.app/zh-cn/plugin/updater/)。

`pnpm release` 会更新版本号与变更日志、创建版本提交和标签，并推送到远端；运行前请确认当前分支、工作区和远端配置。

## 灵感与致谢

渐好的产品创意与方案受到 [LinklyAI/upright](https://github.com/LinklyAI/upright) 启发，尤其是使用摄像头进行姿态监测与个人基线校准的方向。我们据此探索了适合渐好的桌面悬浮窗口、本地监测与即时视觉反馈体验。感谢 LinklyAI 团队开放并分享 Upright 项目。
