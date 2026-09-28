# 渐好官方网站

这是独立于 Tauri 桌面应用的静态官网。页面直接从本目录发布，不参与桌面应用的 Vite 构建。

GitHub Pages 地址：<https://ospoon.github.io/jianhao/>

首次发布前，请在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。之后推送 `main` 分支上的 `website/` 或 `.github/workflows/deploy-website.yml` 变更，会自动部署；也可以在 Actions 页面手动运行 `Deploy website`。
