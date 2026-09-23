# 渐好 (Jianhao)

渐好 (Jianhao) 是一款以 macOS 菜单栏为中心的本地姿态检测桌面应用。摄像头画面和姿态推理均在本机完成。

## 开发环境

- Node.js：`24.15.0`（见 [`.nvmrc`](./.nvmrc)）
- pnpm：`10.15.1`（由 `packageManager` 固定）
- Rust：`1.95.0`（见 [`rust-toolchain.toml`](./rust-toolchain.toml)）
- macOS 开发需安装 Xcode Command Line Tools；Linux CI 使用 Tauri WebKitGTK 系统依赖。

```sh
pnpm install --frozen-lockfile
pnpm tauri dev
```

## 本地检查

```sh
pnpm lint          # ESLint：Vue、TypeScript 与 JavaScript
pnpm typecheck     # vue-tsc
pnpm format        # ESLint 自动修复 + rustfmt
pnpm format:check  # lint + Rust 格式检查
pnpm test:rust     # Rust tests
pnpm clippy        # Rust 静态检查，warning 视为失败
pnpm build         # 类型检查 + 前端生产构建
pnpm tauri build   # 桌面安装包
```

依赖安装时会注册 Git hooks。`pre-commit` 用 `lint-staged` 格式化本次提交的 Vue/TS/JS 与 Rust 文件；`commit-msg` 用 Commitlint 校验 Conventional Commits。若包管理器未执行 `prepare`，可运行：

```sh
pnpm exec simple-git-hooks
```

提交格式示例：

```text
feat(camera): add camera mirroring
fix(menu-bar): keep status indicators stable
docs: update development guide
```

允许的类型包括 `feat`、`fix`、`perf`、`refactor`、`docs`、`style`、`test`、`build`、`ci`、`chore`、`revert` 和自动发版使用的 `release`。

## CI 与发版

- [CI workflow](./.github/workflows/ci.yml) 在分支 push、Pull Request 和手动触发时运行前端 lint/格式、typecheck、build，以及 Rust 格式、test、Clippy 和编译检查。
- [Release workflow](./.github/workflows/release.yml) 监听 `v*` tag，构建 Apple Silicon macOS 与 Windows x64 安装包，并创建 GitHub Draft Release；不会自动正式发布。
- [Dependabot](./.github/dependabot.yml) 每周检查 npm、Cargo 和 GitHub Actions 更新。

发布前确认工作区干净、改动已合并，并且 Conventional Commit 历史完整：

```sh
pnpm release
```

`bumpp` 会同步更新 `package.json`、`src-tauri/Cargo.toml` 与 `src-tauri/tauri.conf.json` 的版本，刷新 pnpm/Cargo lockfile，依据 Conventional Commits 生成 `CHANGELOG.md`，再创建 `release: v<version>` 提交和 `v<version>` tag 并推送。tag 随后触发 Release workflow。确认 GitHub 仓库已配置 `origin` 和 Actions 权限；仓库设置中建议要求 PR 合并前 CI 的 `Frontend checks`、`Rust checks` 均通过。

macOS workflow 默认使用 ad-hoc signing，便于构建测试包，但不能代替 Developer ID 签名和 Apple notarization。正式向用户分发时，在 GitHub Actions secrets 中配置 `APPLE_CERTIFICATE`（base64 编码的 Developer ID `.p12`）、`APPLE_CERTIFICATE_PASSWORD`、`KEYCHAIN_PASSWORD`、`APPLE_ID`、`APPLE_PASSWORD`（app-specific password）和 `APPLE_TEAM_ID`。Windows 包目前也未配置代码签名。签名凭据不可提交到仓库。

当前发版流程只构建和发布安装包；应用内自动更新尚未接入，本流程也不生成 updater 签名文件。移动端不在项目目标范围内。
