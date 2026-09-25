# X 对比 Thread 草稿

状态：已于 2026-09-25 发布，公开 Thread：

- 1/3：https://x.com/Youzi_Ai/status/2103513585158848773
- 2/3：https://x.com/Youzi_Ai/status/2103513586924753188
- 3/3：https://x.com/Youzi_Ai/status/2103513588749176981

## 1 / 3

同一份需求，两套 coding agent 做《弹珠炼金工坊》。Codex 版：TypeScript + Phaser + Matter，5 关、6 种真实生效升级、键鼠/触屏、程序美术与合成音效。Claude Code · fable 5.1 版：同样是 TypeScript + Phaser + Matter，5 关、6 种升级、键鼠/触屏输入与独立视觉音效。

## 2 / 3

这次不只看首屏。Codex 版首轮独立验收发现 4 个输入/适配问题，修复后全部转成回归；发布版 10 项规则测试 + 16 项本机 Chrome 测试通过，正常 UI 录屏完成五关。Claude 版 24 项单元测试 + 18 项端到端测试通过，12 局随机瞄准机器人胜 5 局（42%）、0 局卡死；两版证据口径不同。

## 3 / 3

对比首页：https://chaoschemy.com/ · Codex：https://chaoschemy.com/gpt6/ · Claude：https://chaoschemy.com/fable5.1/

源码、完整原片与可复核材料：https://github.com/convee/marble-alchemy

你会更看重第一眼完成度，还是经过真实操作后剩下的缺陷？

> 发布前检查每帖的 X 实际字符计数；链接会被按 t.co 统一计入。不要把受控边界测试当成自然通关数据，完整录屏未注入游戏状态。
