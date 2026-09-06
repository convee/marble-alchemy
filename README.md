# 弹珠炼金工坊 · 双版本对比

[![CI](https://github.com/convee/marble-alchemy/actions/workflows/ci.yml/badge.svg)](https://github.com/convee/marble-alchemy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c3a6fb.svg)](LICENSE)

同一份中文需求，交给两个模型各自从零实现的浏览器弹珠 Roguelite。两版都用 TypeScript + Phaser 3.90 + Matter 物理 + Vite，
都不接后端与在线 AI 接口，美术与音效全部程序生成。代码、测试与证据分别放在两个目录里，可以直接对照阅读。

| 版本 | 目录 | 在线试玩 | 说明 |
|---|---|---|---|
| Codex · GPT-6 | [`gpt6/`](gpt6/) | https://convee.cn/marble-alchemy/gpt6/ | [README](gpt6/README.md) · [测评材料](gpt6/evaluation/README.md) |
| Claude Code · fable 5.1 | [`fable5.1/`](fable5.1/) | https://convee.cn/marble-alchemy/fable5.1/ | [README](fable5.1/README.md) · [测试报告](fable5.1/docs/TEST-REPORT.md) |

对比首页：https://convee.cn/marble-alchemy/

## 需求里两版一致的部分

- 瞄准并发射弹珠，弹珠在弹盘中碰撞钉子累计伤害；所有弹珠落到底部后统一对敌人结算。
- 敌人存活则反击，玩家初始 5 点生命；生命归零失败。
- 五关递增，每次击败敌人后随机出现 3 个不同升级，选 1 个。
- 升级池固定六种：强化（每次碰撞基础伤害 +1）、火焰（每次碰撞额外累计 1 点）、闪电（对最近另外两个钉子各 1 点，连锁不再连锁）、
  分裂（每次发射首次碰撞额外生成 2 颗，不递归）、暴击（20% 概率本次伤害翻倍）、治疗（立即 +2 生命，上限 5）。
  强化与火焰可重复获得，其余被动获得后不再出现。
- 必须有明确的胜利、失败与重新开始流程；瞄准线、拖尾、碰撞粒子、伤害反馈、升级卡片、可关闭音效；鼠标与触屏都支持。

弹盘布局、具体数值、视觉风格、音效设计、工程结构由各版自行决定。

## 两版自测数据

| 项目 | Codex · GPT-6 | Claude Code · fable 5.1 |
|---|---|---|
| 自动化测试 | 规则测试 10 项、浏览器测试 16 项 | 单元测试 24 项、端到端 18 项 |
| 录屏方式 | 真实 UI 操作，完整无剪辑，附源码提交与 SHA-256 | 停主循环逐帧合成，画面与运行环境帧率无关 |
| 通关证据 | 一局五关胜利，58.7 秒，结束时 5/5 生命 | 12 局随机瞄准机器人对局，胜 5 局（42%），0 局卡死 |
| 额外检查 | Prettier、npm audit、运行期外部请求为 0 | 逐关无升级命中数实测、弹珠卡住看门狗单测 |

两列口径不同，都是各自版本自己跑出来的结果，不能直接相减比较，本仓库也不给裁判分数。原始报告见各自目录。

## 本地运行

两个目录各自独立，有各自的 `package.json` 与锁文件。要求 Node 22.12 以上（fable5.1 亦兼容 20.19 以上）。

```sh
cd gpt6 && npm ci && npm run dev          # Codex 版
cd fable5.1 && npm ci && npm run dev      # Claude Code 版
```

各自的测试：

```sh
cd gpt6 && npm test && npm run test:e2e
cd fable5.1 && npm test && npm run test:e2e
```

## 仓库结构

```
gpt6/          Codex GPT-6 版实现、测试与测评材料
fable5.1/      Claude Code fable 5.1 版实现、测试与测评报告
site/          对比首页（构建时作为站点根目录）
.github/       两版共用的 CI 与 GitHub Pages 部署工作流
```

## 部署

推送 `main` 后 `.github/workflows/pages.yml` 会分别构建两个版本，装配成：站点根是对比首页，
`/gpt6/` 与 `/fable5.1/` 分别是两版游戏；`.github/workflows/ci.yml` 对两版各跑一遍检查、测试、构建与端到端。

## License

MIT，见 [LICENSE](LICENSE)。两个子目录各自保留原有的许可与第三方声明。
