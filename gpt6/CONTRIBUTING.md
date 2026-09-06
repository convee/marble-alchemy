# 参与开发

使用 Node.js 22.12+，安装依赖后运行 `npm run dev`。提交前执行：

```sh
npm run format:check
npm test
npm run build
npm run test:e2e
```

浏览器测试默认使用已安装的 Chrome；Linux/CI 可执行 `npx playwright install --with-deps chromium`，再用 `PLAYWRIGHT_CHANNEL=chromium npm run test:e2e`。

报告问题时请提供浏览器、视口尺寸、复现步骤、预期/实际表现和截图。新增玩法应同时更新规则说明；涉及回合时序、输入、暂停、重新开始的修改应补充实际浏览器回归。

配方和回合逻辑位于 `src/game.ts`，物理与绘制位于 `src/scene.ts`，界面位于 `src/main.ts`。请保留无外部美术资源、无后端、无 AI 接口的运行方式。

`evaluation/baseline/` 是修复前的历史测评快照，请不要将它改写成修复后的结果。展示视频必须来自真实生产构建，测试桥接、强制暴击和改写生命值的用例只能标记为受控边界测试。
