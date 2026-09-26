# 目录与社区分发包

状态：**可提交，部分渠道受环境或平台审核阻塞**（2026-09-26）。本文件只准备可执行素材和回读标准；打开投稿页不计为已发布，只有拿到公开 URL 才标记为 `published`。

## 已上线资产

- 正式首页：<https://chaoschemy.com/>
- 多游戏目录：<https://chaoschemy.com/games/>
- AI Director 入口：<https://chaoschemy.com/gpt6/?utm_source=directory&utm_campaign=ai_director_launch&utm_content=gpt6>
- Deterministic baseline 入口：<https://chaoschemy.com/fable5.1/?utm_source=directory&utm_campaign=ai_director_launch&utm_content=fable5.1>
- Field guide：<https://chaoschemy.com/guide.html?utm_source=directory&utm_campaign=ai_director_launch&utm_content=guide>
- 源码：<https://github.com/convee/marble-alchemy>

`/games/` 是后续添加其他游戏的稳定目录入口；每个游戏可以挂多个可玩的 build/variant。外部投稿默认链接到目录或对应 build，不使用临时开发地址。

## 标准英文简介

> Marble Alchemy is a free, no-download browser roguelite. GLM-5.3 Flash writes one bounded daily challenge, Matter physics executes it locally, and the result receives an AI strategy debrief with measured run stats. Play the AI Director build, compare the deterministic baseline, and inspect the open-source evidence.

### 短文案（目录卡片）

> A free browser roguelite with a bounded AI challenge, deterministic physics, and an open-source baseline. Play instantly in your browser—no download or account required.

### Product Hunt / 社区帖首段

> I built Marble Alchemy, a browser roguelite where an AI Director writes one bounded challenge per day and local Matter physics makes the run reproducible. You can play the AI build, compare it with a deterministic baseline, and inspect the source and measured run stats. It is free, requires no download, and takes about five minutes to try.

### itch.io 页面说明

> **Marble Alchemy** is a free HTML5 browser roguelite.
>
> - No download and no account wall
> - An AI Director writes a bounded daily challenge
> - Local Matter physics keeps the run playable and auditable
> - A deterministic baseline is available for comparison
> - Open source: <https://github.com/convee/marble-alchemy>
>
> Start with the AI Director build, then compare the same core loop with the baseline. Keyboard and touch controls are supported.

## 标题、标签与 UTM

- 标题：`Marble Alchemy · AI-Directed Browser Roguelite`
- 短标题：`A daily AI challenge inside a playable marble roguelite`
- 标签：`browser game`, `roguelite`, `marble`, `AI game`, `no download`, `indie`, `open source`
- 默认目录链接：`https://chaoschemy.com/games/?utm_source=directory&utm_campaign=directory_launch&utm_content=catalog`
- AI build：`https://chaoschemy.com/gpt6/?utm_source=directory&utm_campaign=directory_launch&utm_content=gpt6`
- Baseline：`https://chaoschemy.com/fable5.1/?utm_source=directory&utm_campaign=directory_launch&utm_content=fable5_1`
- Guide：`https://chaoschemy.com/guide.html?utm_source=directory&utm_campaign=directory_launch&utm_content=guide`

UTM 约定：`utm_source` 使用平台短名（如 `itchio`、`producthunt`、`reddit`、`roguelite_org`），`utm_campaign=directory_launch`，`utm_content` 使用页面或 build 的稳定短名。平台已有链接不要改写；发布后必须记录最终 URL 和实际使用的 UTM。

## 目标渠道与当前状态

| 渠道 | 目标动作 | 状态 | 阻塞或下一步 |
|---|---|---|---|
| itch.io | 创建 HTML5 项目，上传可试玩构建，添加 `web`/`roguelike` 标签 | `blocked-by-environment` | `https://itch.io/game/new` 当前进入 Cloudflare 安全验证；需人工在可通过验证的浏览器完成 |
| BrowserCraft | 提交浏览器游戏目录条目 | `not-submitted` | 已检查公开目录，未找到明确投稿入口；不要猜测表单或批量联系 |
| Roguelite.org | 发送目录/评测简介 | `submitted-by-email` | 已发至 `contact@roguelite.org`，等待回复；收到公开 URL 后回读并记录 |
| Product Hunt | 创建 launch draft 并发布 | `blocked-by-environment` | `https://www.producthunt.com/launch` 当前进入 Cloudflare 安全验证；需人工完成验证和发布 |
| Reddit | 先读版规，再发一条体验帖 | `not-submitted` | 尚未选择 subreddit；需人工确认版规、标题和自我推广限制后再发 |
| DEV Community | 发布工程拆解 | `published` | <https://dev.to/kang_wang_375088cb68739bf/building-an-ai-directed-browser-roguelite-with-a-deterministic-baseline-2848>（2026-09-26） |
| Hashnode / Chaoschemy | 发布工程拆解 | `published` | <https://chaoschemy.hashnode.dev/building-an-ai-directed-browser-roguelite-with-a-deterministic-baseline>（2026-09-26）；公开页回读被 Cloudflare 拦截 |

`blocked-by-environment` 表示需要用户在浏览器完成挑战或平台恢复访问；不代表投稿已完成。外部平台登录、验证码、付款和最终发布仍由用户在平台内接管。

## 待提交英文短文案

### Roguelite.org / BrowserCraft

**Title**

`Marble Alchemy — AI-Directed Browser Roguelite`

**Description**

`A free, no-download browser roguelite with a bounded AI challenge, local Matter physics, a deterministic comparison build, and open-source evidence. Play instantly in the browser.`

**URL**

`https://chaoschemy.com/games/?utm_source=roguelite_org&utm_campaign=directory_launch&utm_content=catalog`

### Reddit（等待版规确认）

**Title**

`I built a browser roguelite where an AI writes one bounded challenge per day`

**Body**

`Marble Alchemy is a free, no-download browser roguelite. The AI Director writes a bounded daily challenge; local Matter physics executes it, and a deterministic baseline lets you compare the same core loop. I kept the source and run evidence public. If you try it, I would appreciate feedback on whether the challenge feels authored or too constrained. Play: https://chaoschemy.com/games/?utm_source=reddit&utm_campaign=directory_launch&utm_content=catalog`

不要在版规确认前跨多个 subreddit 复制这段文字，也不要使用未经验证的收入、用户数或“完全自动化”表述。

### Product Hunt（Cloudflare 通过后）

**Tagline**

`A browser roguelite with a bounded AI challenge and a deterministic baseline`

**First comment**

`Marble Alchemy is a five-minute browser experiment: play an AI-authored challenge, compare the deterministic baseline, and inspect the source. No download or account is required. Feedback on challenge quality and replayability is welcome.`

## 发布前检查清单

1. 用英文页面、正式 HTTPS 域名和稳定的 `/games/` 或 build 链接；确认页面 200、canonical 正确、图片可加载。
2. 确认链接带当前渠道的 UTM；不使用 localhost、preview URL、临时域名或内部管理链接。
3. 每个平台只提交一条真实体验说明；先读版规，不购买批量外链、不重复复制评论。
4. 仅宣传已验证事实：免费、无需下载/账号、AI Director build、deterministic baseline、开源；不承诺收益或固定留存。
5. 需要登录、Cloudflare 验证、验证码或最终发布时，由用户在对应平台完成；代理只准备素材和回读公开结果。
6. 发布后记录：平台、公开 URL、发布时间（Asia/Shanghai）、实际 UTM、使用的 build、是否可匿名打开。
7. 发布后从 Worker/D1 和 Cloudflare 回读 `page_view`、`game_start`、`run_won`/`run_restart`，确认来源字段未丢失；目录打开或草稿保存不算转化。
8. 在至少 30 个合格访问且 `game_start / landing_view >= 25%` 前，不扩展同一关键词的外链投放；把验证流量与自然 cohort 分开。

## 待回读记录模板

```text
platform:
public_url:
published_at_asia_shanghai:
utm_source:
utm_campaign: directory_launch
utm_content:
build: catalog | gpt6 | fable5_1
anonymous_open: pass | fail
page_view_seen: yes | no
game_start_seen: yes | no
notes:
```
