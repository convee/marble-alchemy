# 监控与闭环事件

## 已启用

- Cloudflare Web Analytics：覆盖 `chaoschemy.com/`、`/gpt6/`、`/fable5.1/`，统计页面访问、设备/地区和性能指标。
- 入口页、两个游戏页都加载官方 beacon；隐私说明位于 `/privacy.html`。

## 游戏事件协议

两个游戏都调用同一套匿名事件接口。事件默认只保存在浏览器 `localStorage`，只有构建时设置 `VITE_ANALYTICS_ENDPOINT` 才会通过 `sendBeacon` 发给第一方接口；因此不会在没有端点时偷偷把用户行为送到第三方。

| 事件 | 关键属性 | 用途 |
|---|---|---|
| `page_view` | `app` | 入口到游戏的漏斗起点 |
| `game_start` | `app` | 首次进入有效游戏 |
| `shot_attempt` | `app`, `level` | 首次操作和操作深度 |
| `level_complete` | `app`, `level` | 中途完成度 |
| `run_complete` / `run_won` | `app`, `level`, `shots` | 通关率 |
| `run_lost` | `app`, `level`, `shots` | 失败位置 |
| `upgrade_selected` | `app`, `upgrade`, `level` | 玩法偏好 |
| `run_restart` | `app` | 复玩意愿 |

## 仍未闭合

Cloudflare beacon 已能测页面访问，但自定义游戏事件还没有生产端点和后台查询。接入端点前不宣称已有真实开始率、通关率或 D1/D7 留存。
