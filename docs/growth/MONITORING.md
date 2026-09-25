# 监控与闭环事件

## 已启用

- Cloudflare Web Analytics：覆盖 `chaoschemy.com/`、`/gpt6/`、`/fable5.1/`，统计页面访问、设备/地区和性能指标。
- 入口页、两个游戏页都加载官方 beacon；隐私说明位于 `/privacy.html`。
- 2026-09-25 23:38（GMT+8）现场回读 Cloudflare 站点列表：`chaoschemy.com` 显示最近 24 小时 3 次 page views、3 次 visits。这是本次上线验证流量，不是自然获客样本。

## 游戏事件协议

两个游戏都调用同一套匿名事件接口。事件默认只保存在浏览器 `localStorage`，只有构建时设置 `VITE_ANALYTICS_ENDPOINT` 才会通过 `sendBeacon` 发给第一方接口；因此不会在没有端点时偷偷把用户行为送到第三方。

| 事件 | 关键属性 | 用途 |
|---|---|---|
| `page_view` | `app` | 入口到游戏的漏斗起点 |
| `game_start` | `app` | 首次进入有效游戏 |
| `shot_attempt` | `app`, `level` | 首次操作和操作深度 |
| `level_complete` | `app`, `level` | 中途完成度 |
| `volley_settled` | `app`, `level`, `killed` | 单轮结算 |
| `run_complete` / `run_won` | `app`, `level`, `shots` | 通关率 |
| `run_lost` | `app`, `level`, `shots` | 失败位置 |
| `upgrade_selected` | `app`, `upgrade`, `level` | 玩法偏好 |
| `run_restart` | `app` | 复玩意愿 |

## 本地复盘工具

事件可以从 D1 导出为 JSON 或 NDJSON，再运行：

```sh
node scripts/analyze-events.mjs events.ndjson --pretty
node --test scripts/analyze-events.test.mjs
```

报告会给出入口到开始、完成、复玩率、来源归因以及可用时的 D1/D7 cohort。示例输入在
[`events.sample.ndjson`](events.sample.ndjson)，它只是协议样例，不是线上用户数据。

## 仍未闭合

Cloudflare beacon 已能测页面访问；第一方 Worker 的代码和 D1 schema 在
[`infra/analytics-worker`](../../infra/analytics-worker)，但尚未绑定真实 D1、部署并把
`VITE_ANALYTICS_ENDPOINT` 写入 GitHub 仓库变量。完成这一步前不宣称已有真实开始率、通关率或 D1/D7 留存。
