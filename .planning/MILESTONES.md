# Milestones

## v1.2 添加 web 宣传页面 — SHIPPED 2026-06-17

**Phases:** 4 | **Plans:** 14 | **Requirements:** 16/16 satisfied
**Commits:** 665 total repo commits at close | **LOC:** 19,287 TS/TSX/JS/JSX | **Timeline:** 16 days (2026-06-01 → 2026-06-16)

### Key Accomplishments

1. 建立仓库内独立 marketing workspace app（`apps/marketing`），宣传页可独立 build / preview / smoke test，BUILD-03 import 隔离测试证明不引入扩展 runtime 模块。
2. 实现双语（en / zh_CN）8-section 静态宣传页，覆盖 Hero / use cases / payload 示例 / 支持平台 / 三步流程 / 隐私权限 / 已知限制 / CTA，locale key 100% 同构。
3. 交付 `verify:claims` 跨源一致性校验器（5 条规则，禁止过宣传词，引用 `shipped-platforms.json` 单一事实源），作为 CI gate 自动拦截任何 claim 漂移。
4. 完成 WCAG G201 外链可访问性：3 个外链 CTA 可见 ↗ glyph + `.sr-only` 新标签页警告，由 Playwright 实测 zh_CN/en 双 locale 确认。
5. 建立发布验收运营基线：根级 `MAINTENANCE.md` source-first 维护链 + `CHANGELOG [v1.2]` 诚实 Known Issues + CI 单 job 接入 4 个 marketing/claims gate。
6. 关闭全部人工 UAT 维度：G201 可见字形 + responsive 无溢出经 Playwright `launchPersistentContext` 实测（375px/1280px 双断点），Phase 15/16 verification 推到 `passed`。

### Known Gaps

- Telegram live dispatch 仍缺真实登录会话 headed-browser UAT 证据（继承自 v1.1，非 v1.2 范围）
- Phase 11/12 Nyquist closeout 仍 partial（继承自 v1.1）
- Feishu/Lark 仍 dropped，恢复需新技术路径

### Deferred Items at Close

6 个扩展运行时历史 debug item acknowledge 为 deferred（discord-icon-wrong / feishu-* ×4 / github-action / discord-tos-missing），多数与 dropped Feishu 或非 bug 相关，详见 STATE.md Deferred Items。

### Archive

- [v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- [v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md)

---

## v1.1 多渠道适配 — SHIPPED 2026-05-31

**Phases:** 6 | **Plans:** 27 | **Requirements:** 18/23 satisfied in shipped scope review
**Commits:** 534 total repo commits at close | **LOC:** 18,837 TS/TSX/JS/JSX | **Timeline:** 19 days

### Key Accomplishments

1. 完成适配器架构泛化，新增平台无需再改 dispatch pipeline 或 service worker 入口。
2. 完成投递鲁棒性加固，统一覆盖超时分层、登录态检测、可重试 UI 与低置信度确认流。
3. Slack 适配器 shipped，覆盖 URL 匹配、登录检测、富文本注入、发送确认与中英文本地化。
4. Slack logged-out redirect 历史 blocker 已闭环，真实回归确认 `NOT_LOGGED_IN` 语义与 popup 原始 snapshot 保留。
5. Telegram 适配器 shipped，覆盖 Web K URL、contenteditable 注入、4096 字截断、发送确认与 i18n。
6. Feishu/Lark 已完成实现验证，但因共享 URL blocker 被明确移出最终 shipped scope。

### Known Gaps

- Telegram live dispatch 仍缺真实登录会话 headed-browser UAT 证据
- FSL-01..05 dropped，不属于最终 shipped scope
- Phase 11 / 12 Nyquist closeout 仍为 partial

### Archive

- [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0 MVP — SHIPPED 2026-05-09

**Phases:** 7 | **Plans:** 41 | **Requirements:** 47/47
**Commits:** 313 | **LOC:** 11,399 TS/TSX | **Timeline:** 11 days

### Key Accomplishments

1. WXT 0.20.x MV3 扩展骨架：类型化消息 + 版本化存储 + i18n 双语 + CI pipeline
2. Readability + DOMPurify + Turndown 抓取流水线 + 4-state popup UI
3. IMAdapter 接口 + 幂等 dispatch 状态机 + SW 重启韧性 + badge 可视化
4. OpenClaw（property-descriptor setter）+ Discord（ClipboardEvent paste + MAIN world bridge）
5. 运行时 i18n 切换 + ESLint 拦截 + 100% locale 覆盖
6. 225 单元测试 + E2E specs + CWS 就绪分发包

### Known Deferred Items at Close: 2

- Phase 3-5 E2E specs pending human verification
- 3 jsdom module resolution warnings (non-blocking)

### Archive

- [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
