## 弹珠炼金工坊 v1.0.0

首个公开版本已经包含完整五关流程、六种真实生效配方、Matter 物理弹盘、键鼠与触屏输入、暂停、音效开关、胜负和重新开始。

首轮独立浏览器验收发现并修复了触摸取消误发射、说明弹窗后的键盘焦点、短横屏裁切和鼠标右键误发射；这些问题都已加入持续回归。发布前通过 10 项规则测试、16 项本机 Google Chrome 交互测试、生产构建和依赖审计。

Release 资产包含：

- `codex-gameplay-v1.0.0.mp4`：完整时间线，正常速度，仅转码并添加版本标签；
- `codex-gameplay-v1.0.0-raw.webm`：Playwright 直接录制的无编辑原片；
- `recording-manifest-v1.0.0.json`：源码、构建、响应、事件和媒体 SHA-256 清单。

完整测试范围、受控测试边界、历史缺陷证据和未验证范围见仓库的 [`evaluation/`](../evaluation/README.md) 与 [`TESTING.md`](../TESTING.md)。
