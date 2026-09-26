# Google Search Console 验证与回读

更新：2026-09-26

## 当前状态

- 当前 Google Search Console 账号还不能访问 `chaoschemy.com`，所以查询、点击、展示、CTR 和平均排名都标记为 `not-measured`。
- 当前公开 DNS 没有返回 TXT 记录：`dig TXT chaoschemy.com +short` 为空。尚未添加 Google 提供的验证 token，也没有把 token 写入站点文件。
- 站点已经公开 `https://chaoschemy.com/sitemap.xml`，但在完成所有权验证前不要把 Search Console 的数据当作已接入。
- 这一步需要用户在自己的 Google 账号和 DNS/站点托管处完成；本项目不会代替用户登录、修改 DNS 或提交外部表单。

## 推荐路线：Domain property + DNS TXT

Domain property 覆盖 `https://chaoschemy.com/` 以及同域名的协议、子域名和路径，适合后续长期统计。

1. 打开 [Google Search Console](https://search.google.com/search-console)，选择 **Add property**。
2. 选择 **Domain**，输入 `chaoschemy.com`，不要输入 `https://` 或路径。
3. 复制 Google 展示的 TXT 值（形如 `google-site-verification=...`）。这个值只用于验证，不要把它发到聊天中。
4. 在域名 DNS 提供商新增一条记录：

   | 字段 | 值 |
   |---|---|
   | Type | `TXT` |
   | Host/Name | `@`（有些面板要求填空或 `chaoschemy.com`） |
   | Value | Google 提供的完整 `google-site-verification=...` |
   | TTL | 默认值即可；若可选，使用 `300` 或 `600` 秒 |

5. 等待 DNS 传播。先在本机或 DNS 查询工具确认 TXT 已公开，再回到 Search Console 点击 **Verify**。
6. 验证通过后，在 Search Console 的属性选择器中确认显示的是 `chaoschemy.com` Domain property。

DNS 面板若自动给 Host 追加域名，不能把 `@.chaoschemy.com` 误填成主机名；保存后应能查到根域 TXT。

## 备用路线：URL-prefix + HTML

如果暂时不能修改 DNS，可以先验证 `https://chaoschemy.com/` URL-prefix property。该路线只覆盖这个协议和主机名。

可选的 HTML 验证方式有两种，任选其一：

- **HTML tag**：Search Console 给出 `<meta name="google-site-verification" content="TOKEN" />`。把完整标签放进首页 `<head>`，部署到正式站点后回到 Search Console 点击 **Verify**。
- **HTML file**：Search Console 给出一个文件名和文件内容。把该文件放到站点根目录，使其可通过 `https://chaoschemy.com/文件名` 直接访问，再点击 **Verify**。

当前仓库没有安装这两类 token，因此不能直接点击验证。HTML 路线需要一次代码提交和 Pages 部署，部署后应先用浏览器或 `curl` 回读文件/标签，再在 Search Console 验证。

## 验证后的回读顺序

完成所有权验证后按以下顺序回读，并把日期、属性类型和截图/CSV 留在项目记录中：

1. **URL Inspection**：检查 `https://chaoschemy.com/`、`/games/`、`/gpt6/`、`/fable5.1/` 和 `https://chaoschemy.com/sitemap.xml`。对首页和两个游戏页执行 **Test live URL**；发现未编入索引时再请求编入索引。
2. **Sitemaps**：提交完整地址 `https://chaoschemy.com/sitemap.xml`，确认状态为成功并记录发现的 URL 数量。不要提交相对路径。
3. **Performance → Search results**：日期先选过去 28 天，随后每周切换过去 3 个月；打开 **Queries、Pages、Countries、Devices** 四个维度，记录 `Clicks`、`Impressions`、`CTR`、`Average position`。
4. **导出**：使用 Export → CSV/Google Sheets 保存原始表。文件名建议包含属性、日期范围和导出日期，例如 `chaoschemy-gsc-queries-2026-09-26.csv`。
5. **分层**：分别查看首页、`/games/`、`/gpt6/`、`/fable5.1/` 和指南页，避免把品牌词、验证访问和自然搜索混为一个转化率。Search Console 的点击不能替代第一方 `page_view`、`game_start`、`run_complete` 事件。
6. **更新关键词账本**：将真实查询和页面点击补入 [`KEYWORD-RESEARCH.md`](KEYWORD-RESEARCH.md)，并在 [`LOOP-STATUS.md`](LOOP-STATUS.md) 把 `not-measured` 改为实际日期范围和样本量。数据不足 7–14 天时只做观察，不据此判断留存或收入。

## 回读记录模板

| 记录项 | 值 |
|---|---|
| 验证日期（Asia/Shanghai） | 待用户完成 |
| 属性 | `chaoschemy.com` Domain 或 `https://chaoschemy.com/` URL-prefix |
| 验证方式 | DNS TXT / HTML tag / HTML file |
| 查询日期范围 | 待导出 |
| Clicks / Impressions | 待导出 |
| CTR / Average position | 待导出 |
| Sitemap 状态 | 待回读 |
| URL Inspection | 待回读 |

## 边界

- Search Console 验证 token 不是 Paddle 密钥，但仍应只由用户在自己的 DNS 或仓库发布流程中使用；不要把 token、Google 账号凭据或 DNS 登录信息提交到聊天或代码库。
- 验证通过只证明站点所有权，不代表 Google 已收录页面，也不代表有自然搜索流量。索引状态、查询数据和第一方事件必须分别记录。
