# Chaoschemy 找词记录

更新时间：2026-09-26（第一轮种子词研究与现场趋势复核）

## 目标

验证「无需下载、打开即玩、弹珠碰撞 + roguelite 升级」这条需求是否有现成搜索意图，再决定页面标题、描述和外部分发用语。这里只记录可复核的种子词，不把搜索结果页的排名当作搜索量。

## 种子词与意图

| 词组 | 意图 | 当前处理 | 下一步证据 |
|---|---|---|---|
| browser roguelite game | 找可以直接玩的浏览器 roguelite | 主落地页英文副标题与外链文案候选 | Search Console 查询、页面点击率 |
| free roguelite games online | 找免费在线 roguelite 列表 | 适合目录/评测站描述 | 实际目录收录与引荐会话 |
| marble game browser | 找弹珠类浏览器游戏 | 适合玩法描述，不单独承诺排名 | 关键词相关性与落地页开始率 |
| peg bounce game | 找碰撞/弹射玩法 | 作为玩法解释词 | SERP 点击与试玩完成率 |
| no download web game | 找免安装小游戏 | 适合首屏价值主张 | 引荐来源与首次发射率 |
| browser pinball roguelite | 找弹射/升级混合玩法 | 长尾实验词 | 单页实验与复玩率 |

## 已看到的市场语言

公开页面反复使用「free」「online」「browser」「no download」「no account」描述 roguelite 产品，说明这些词适合用来表达用户意图，但不等于 Chaoschemy 已获得搜索流量：

- [Roguelite Games Online](https://www.roguelite.org/)
- [Deep Keep](https://playdeepkeep.com/)
- [PlayBrain browser roguelike list](https://playbrain.games/roguelike-games)
- [itch.io web roguelike tag](https://itch.io/games/free/platform-web/tag-roguelike)

## 现场趋势边界

2026-09-26 用 Google Trends 全球、过去 30 天、Google Web Search 做相对比较：`no download web game` 的相对平均值为 10，`marble game browser` 为 3，`free browser roguelite`、`marble roguelite`、`browser pinball roguelite` 和 `browser roguelite game` 为 0 或数据不足。Google Trends 是相对指数，不是月搜索量；这些结果只支持优先测试“no download web game”与玩法长尾，不支持承诺流量。

Search Console 现场回读为“当前账号无权访问 chaoschemy.com”，所以查询、点击和 CTR 仍未测量。完成站点所有权验证后再更新本表。

## 发布前决策规则

1. 用 Google Trends、Search Console 或关键词工具补真实趋势/点击数据；本文件当前没有伪造搜索量。
2. 先测试 2 个标题版本：`Free Browser Roguelite` 与 `Marble Roguelite`。
3. 只有当某个词带来至少 30 个合格访问并且 `game_start / landing_view >= 25%`，才继续为该词做外链或内容页。
4. 不购买批量外链，不把目录收录或搜索结果排名当成用户留存。

## 本轮获客标记

X Thread 已发布；首页、指南和游戏入口现已使用 `utm_source`、`utm_campaign`、`utm_content` 三段标记，事件协议会完整保留这些字段，方便把来源、开始率和复玩率放在同一份报告里。没有 UTM 的旧访问会归入 `(direct)`，不会被强行归因。
