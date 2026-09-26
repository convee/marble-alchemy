# 监控与闭环事件

## 已启用

- Cloudflare Web Analytics：覆盖 `chaoschemy.com/`、`/gpt6/`、`/fable5.1/`，统计页面访问、设备/地区和性能指标。
- 入口页、两个 Marble Alchemy 游戏页和 Kids Game Garden 页面都加载官方 beacon；隐私说明位于 `/privacy.html`。
- 2026-09-26（GMT+8）现场回读 Cloudflare 站点列表：`chaoschemy.com` 显示最近 24 小时 37 次 page views、35 次 visits；包含验证和未知来源流量，不能当作自然获客样本。
- 2026-09-26 23:44（GMT+8）再次回读 Cloudflare Web Analytics：仪表板显示 0 visits / 0 page views，并提示数据量不足；这说明当前还没有可用于判断增长的 Cloudflare 样本。
- 第一方事件接收 Worker 已部署在 `https://chaoschemy-analytics.convee-cn.workers.dev/events`，D1 数据库绑定为 `chaoschemy-analytics`；GitHub Pages 构建变量 `VITE_ANALYTICS_ENDPOINT` 已配置。
- 2026-09-26（GMT+8）用正式站点真实浏览器链路回读到 `page_view`、`game_start`、`shot_attempt`、`level_complete`，两个版本都带有 `utm_source=x` 和 `utm_campaign=launch_thread`。这些是发布验证流量，不是自然用户 cohort。
- 2026-09-26 19:29（GMT+8）导出第一方 D1：264 events / 17 sessions / 41 page views / 2 game-start sessions / 3 completed sessions / 1 replay session。来源分层为 direct 12 sessions、X 4 sessions、landing 2 sessions、guide 2 sessions；D1/D7 尚无 eligible cohort。这仍是同日混合验证样本，不能推导自然转化率或留存。
- 2026-09-26 23:44（GMT+8）D1 当前累计为 281 events / 19 sessions / 49 page views / 8 game starts / 3 completions；最近一小时只有 1 个直接首页 session（2 个事件），无法证明是外部自然用户，仍按混合验证样本处理。
- 2026-09-27 00:24（GMT+8）清理已确认的结账冒烟验证 session 后，D1 正本为 238 events / 19 sessions / 30 page views / 8 game starts / 3 completions；最近可见的非结账验证首页 session 在 16:16 UTC，来源字段为空，仍只能标记为 unknown/direct。

## 游戏事件协议

两个游戏都调用同一套匿名事件接口。事件默认只保存在浏览器 `localStorage`，只有构建时设置 `VITE_ANALYTICS_ENDPOINT` 才会通过 `sendBeacon` 发给第一方接口；因此不会在没有端点时偷偷把用户行为送到第三方。

| 事件 | 关键属性 | 用途 |
|---|---|---|
| `page_view` | `app` | 入口到游戏的漏斗起点 |
| `game_start` | `app` | 首次进入有效游戏 |
| `shot_attempt` | `app`, `level`, `ai_challenge`, `ai_effect` | 首次操作和命题下的操作深度 |
| `level_complete` | `app`, `level` | 中途完成度 |
| `volley_settled` | `app`, `level`, `killed` | 单轮结算 |
| `run_complete` / `run_won` | `app`, `level`, `shots` | 通关率 |
| `run_lost` | `app`, `level`, `shots` | 失败位置 |
| `upgrade_selected` | `app`, `upgrade`, `level` | 玩法偏好 |
| `run_restart` | `app` | 复玩意愿 |
| `ai_challenge_loaded` | `app`, `challenge`, `effect`, `source`, `generated_by` | 模型命题是否成功进入真实玩法 |
| `ai_rule_triggered` | `app`, `challenge`, `effect`, `level` | AI 规则是否实际触发，而不是只展示文案 |
| `daily_challenge_completed` | `app`, `challenge`, `source`, `streak` | 每日命题完成与连续回访 |
| `share_attempt` / `share_completed` | `app`, `challenge`, `result`, `score` | 结果分享与自然传播意愿 |
| `landing_view` | `app`, 三段 UTM | 首页真实到达量与来源分层 |
| `cta_click` | `app`, `target`, 三段 UTM | 首页到游戏/指南/支持入口的点击归因 |
| `paddle_checkout_event` | `app`, `event` | Paddle 结账打开、关闭、完成等生命周期归因 |
| Kids Game Garden | `app=kids-games`, `game_id`, `event_type` | 大厅/游戏页访问、开始、关卡进度、完成/失败和 AI 陪玩互动 |

## 本地复盘工具

事件可以从 D1 导出为 JSON 或 NDJSON，再运行：

```sh
node scripts/analyze-events.mjs events.ndjson --pretty
node --test scripts/analyze-events.test.mjs
```

报告会给出入口到开始、完成、复玩率、来源归因以及可用时的 D1/D7 cohort。示例输入在
[`events.sample.ndjson`](events.sample.ndjson)，它只是协议样例，不是线上用户数据。

## 运行边界

第一方 Worker 的代码、绑定和 D1 schema 在 [`infra/analytics-worker`](../../infra/analytics-worker)。
当前可以导出线上事件并运行分析器，但验证数据不足以代表自然开始率、通关率、复玩率或 D1/D7 留存；这些指标要等 7–14 天真实访问后再判定。
