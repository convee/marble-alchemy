# 商业闭环状态账本

更新：2026-09-26

| 环节 | 当前证据 | 状态 | 下一闸门 |
|---|---|---|---|
| 找词 | `KEYWORD-RESEARCH.md` 已记录 6 个种子词；Google Trends 现场数据稀疏，Search Console 当前账号无权访问站点 | conditional | 验证站点所有权后读取查询/点击；没有量级证据前只做页面与少量人工目录分发 |
| 监控 | Cloudflare 最新回读为 0 page views / 0 visits（提示数据量不足）；清理已确认验证 session 后，第一方 D1 正本为 238 events / 19 sessions / 30 page views / 8 game starts / 3 completions，最近可见首页 session 的来源字段为空 | conditional | 继续按自然/验证流量分层；等待 7–14 天真实 cohort 后再判断留存 |
| 获客 | 英文首页、游戏页、field guide、canonical、sitemap、robots 已上线；事实版 X Thread 已发布（1/3、2/3、3/3）；Roguelite.org 投稿邮件已发送；DEV 与 Hashnode 英文工程文章已发布 | conditional | Product Hunt、itch.io 和 Hashnode 公开页当前被 Cloudflare 安全验证拦截；BrowserCraft 无公开投稿入口；先验证 Search Console，再按规则做 5–15 条人工外链 |
| 复玩 | GPT-6 版形成“模型命题 → 受限规则 → 玩家五关回应 → AI 复盘 → 本地每日完成记录/分享”；事件包含 `landing_view`、`cta_click`、`ai_challenge_loaded`、`ai_rule_triggered`、`daily_challenge_completed`、`run_complete` 和三段 UTM | conditional | 累积 7–14 天真实访问，再按命题来源、开始率、通关率、复玩率和 D1/D7 判断 AI 是否带来留存 |
| 变现 | Paddle.js 一次性 `$5 USD` 支持入口已上线并可打开结账；账户验证资料已提交，Paddle 显示 In progress；AdSense 未提交；结算资料、退款/Webhook 回归未完成 | prepared-handoff | 等待 Paddle 审核，完成结算资料，跑 Sandbox 成功/取消/退款/Webhook；再决定是否提交 AdSense |
| 复盘 | 事件字典、UTM 归因、D1 导出分析器和目录分发包已提交；最新导出有 264 events / 17 sessions，但 D1/D7 尚无 eligible cohort | conditional | 用 7–14 天真实 cohort 数据做一次继续/停止决定 |

## 不能混写的证据边界

- CI、自动对局和录屏证明产品可构建、可游玩，不证明有需求、留存或收入。
- Cloudflare 当前 0 次 page views / 0 次 visits（数据量不足），以及第一方 D1 的 238 events / 19 sessions，都是当前观测值，不是自然获客、留存或收入证明。
- X 帖子已发布，但当前尚未把 X 引荐流量与自然流量混为一谈。
