# Chaoschemy 第一方事件接口

这个 Worker 只接收两个游戏已经定义的匿名事件，不接收姓名、邮箱、支付信息或原始文件。它把事件写入 Cloudflare D1，供后续导出为 NDJSON 后运行 `node scripts/analyze-events.mjs`。

## 部署

1. 在 Cloudflare 创建一个 D1 数据库，并把 `wrangler.toml.example` 复制为 `wrangler.toml`，填入真实 `database_id`。
2. 初始化表：

   ```sh
   npx wrangler d1 execute chaoschemy-analytics --remote --file=schema.sql
   ```

3. 部署 Worker，并将正式 URL 写入 GitHub 仓库变量 `VITE_ANALYTICS_ENDPOINT`（值应为 `https://<worker-host>/events`）。Pages 工作流会在下一次构建时把它注入两个游戏。
4. 用 `GET /health` 和一次只含匿名测试事件的 `POST /events` 回读 200/`accepted`，再把测试事件从 D1 清理掉。

导出事件供本地复盘：

```sh
npx wrangler d1 execute chaoschemy-analytics --remote \
  --command='SELECT name, session_id, occurred_at, path, app, utm_source, utm_campaign, payload FROM events ORDER BY occurred_at' \
  --json > events.json
node ../../scripts/analyze-events.mjs events.json --pretty
```

在完成第 3 步前，线上构建仍会把事件保存在浏览器本地，不会假装已经有真实复玩数据。
