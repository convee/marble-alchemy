# 可复核测评材料

这个目录把“修复前发现了什么”“修复后验证了什么”和“正常一局实际发生了什么”分开保存，避免用受控测试冒充完整游玩。

## 对比协议

用于 Codex 与 Claude Code · fable 5.1 的对比时，两边应使用相同的 [`PROMPT.zh-CN.md`](PROMPT.zh-CN.md)、运行环境、视口和验收项。建议分别公布：

- 能否构建和本地启动；
- 是否完成五关、六种升级和真实 Matter 碰撞；
- 规则测试、浏览器测试、正常 UI 完整游玩各自结果；
- 发现和修复过的缺陷；
- 仍未验证的浏览器、设备或行为；
- 未剪辑原始录屏与其 SHA-256。

当前仓库只包含 **Codex 版**的可验证结果。Claude Code · fable 5.1 的结果尚未提供，因此不会预填结论或分数。

## 材料索引

- [`baseline/`](baseline/)：第一次独立验收时的四个失败用例、日志和截图；Git 标签 `audit-baseline` 对应当时的源码。
- [`current/RESULTS.md`](current/RESULTS.md)：修复后的验证范围与结果。
- [`current/recording-manifest.json`](current/recording-manifest.json)：完整录屏事件时间线、源码提交、请求列表和原始视频校验值。
- [`current/e2e-results.json`](current/e2e-results.json)：Playwright 机器可读报告。
- [`X_POST_DRAFT.zh-CN.md`](X_POST_DRAFT.zh-CN.md)：不预设另一方结果的 X Thread 草稿。

录屏为普通生产页面的真实 UI 操作。它没有测试桥、固定随机数、生命/伤害改写、加速物理或生成式补帧。README 动图为了控制大小，从完整录屏选取两段并加速；发布 Release 的 MP4 保留完整时间线。
