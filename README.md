<div align="center">
  <img src="./src/assets/brand-mark.png" alt="渐好 Logo" width="96" height="96">
  <h1>渐好</h1>
  <p><strong>工作再投入，也别忘了身体。</strong></p>
  <p>一款在本机分析坐姿的桌面提醒工具。画面不上传，提醒由你掌握。</p>
  <p>
    <a href="https://ospoon.github.io/jianhao/">官方网站</a>
    · <a href="https://github.com/OSpoon/jianhao/releases/latest">下载桌面版</a>
    · <a href="https://github.com/OSpoon/jianhao/issues">问题反馈</a>
    · <a href="./LICENSE">MIT License</a>
  </p>
  <p>
    <img src="https://img.shields.io/github/license/OSpoon/jianhao?style=flat-square" alt="MIT License">
    <img src="https://img.shields.io/badge/macOS-Apple%20Silicon-555?style=flat-square" alt="macOS Apple Silicon">
    <img src="https://img.shields.io/badge/Windows-x64-555?style=flat-square" alt="Windows x64">
  </p>
</div>

## 关于渐好

长时间伏案时，注意力容易留在屏幕和手头的事上。渐好用电脑摄像头在本机观察坐姿；需要调整时，桌面窗口边框会以柔和的红黄渐变呼吸提醒。摄像头画面和姿态分析都留在本机。

提醒可能短暂打断思路，所以提醒节奏由你决定：可以选择低、标准或高检测灵敏度，关闭提示音，也可以在不方便中断时暂停监测。

## 主要功能

| 功能 | 说明 |
| --- | --- |
| 本机实时监测 | 在本机分析摄像头画面，不上传视频 |
| 自然坐姿校准 | 以舒服的日常坐姿建立个人基线，之后也可重新校准 |
| 边框呼吸提醒 | 需要调整时，以柔和的红黄渐变提示你留意坐姿 |
| 灵敏度与声音设置 | 选择低、标准或高灵敏度；提示音可关闭或试听 |
| 轻巧悬浮窗口 | 提供圆形和圆角矩形预览，可置顶显示、拖动位置 |
| 摄像头与镜像 | 选择摄像头、切换左右镜像，设置保存在本机 |
| 本地诊断日志 | 在本机查看姿态记录，便于排查问题 |

## 下载与开始使用

前往 [GitHub Releases](https://github.com/OSpoon/jianhao/releases/latest) 下载适用于 macOS（Apple Silicon 或 Intel）和 Windows x64 的版本。

首次使用时，允许应用访问摄像头。保持平时自然、舒服的坐姿完成校准，即可开始监测。你可以在设置中更换摄像头、调整检测灵敏度，或决定是否播放提示音；需要暂时不被提醒时，可以暂停监测。

渐好不会在后台持续运行。关闭主窗口会退出应用并停止摄像头监测。检查更新可从菜单栏图标菜单手动发起；下载和安装前会先征求确认。

## 隐私

摄像头画面、姿态推理与坐姿判断均在本机处理，摄像头画面不会上传。更新检查会连接项目的 GitHub Releases 服务；诊断日志保存在本机应用数据目录中。

## 许可证

渐好以 [MIT License](./LICENSE) 发布。


## 灵感与致谢

渐好的产品创意与方案受到 [LinklyAI/upright](https://github.com/LinklyAI/upright) 启发，尤其是使用摄像头进行姿态监测与个人基线校准的方向。我们据此探索了适合渐好的桌面悬浮窗口、本地监测与即时视觉反馈体验。感谢 LinklyAI 开放并分享 Upright 项目。
