# Retrospective: web2chat

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-09
**Phases:** 7 | **Plans:** 41 | **Timeline:** 11 days

### What Was Built

- Chrome MV3 web-clipper 扩展，抓取页面元数据 + 内容，一键投递到 IM/AI Agent 会话
- OpenClaw Web UI + Discord 两条投递通道
- 225 单元测试 + Playwright E2E specs
- 运行时 i18n (en + zh_CN) + ESLint 硬编码拦截
- CWS Store Listing + 双语隐私政策 + 双语 README 就绪

### What Worked

- **Foundation-first 路线**：Phase 1 从骨架就内建 i18n + storage + messaging，后续 phase 无需回补基础设施
- **IMAdapter 接口**：先做友好目标（OpenClaw）再攻坚（Discord），接口在两个平台间自然精化
- **Mirror function 测试模式**：bumpHello → capture → dispatch pipeline 在实现前用 mirror function 锁定业务路径
- **Wave 并行化**：Wave 内独立 plan 并行执行，Wave 间串行等待依赖，减少总耗时
- **GSD workflow discipline**：7 phase / 41 plan 每个都有 PLAN → execute → SUMMARY，context 可追溯

### What Was Inefficient

- **Gap closure plans**：Phase 4 (2 gap) + Phase 5 (2 gap) 说明 UAT 后才发现的问题——如果在 execute 阶段更仔细验证浏览器行为（popup 关闭、权限对话、SPA 路由），可以减少返工
- **REQUIREMENTS.md 同步**：traceability table 在 Phase 3-7 执行后未及时更新 checkmark，milestone 归档时才发现 23/47 项仍标记为"待办"
- **E2E headed browser 瓶颈**：Playwright launchPersistentContext + --load-extension 需要 headed 模式，CI 无法自动验证，积压了人工验证 debt

### Patterns Established

- **SW ↔ content-script 边界**：复刻类型而非 cross-bundle import（73KB extractor 不进 SW bundle）
- **DOM 注入双路径**：React 受控 input → property-descriptor setter；Slate/Lexical → ClipboardEvent paste
- **权限模型**：静态 host_permissions 仅放已知公共域名；用户自部署走 optional + 运行时 request
- **i18n 三段式拆键**：before / icon / after 避免 HTML 注入 locale 文件
- **Preact 差异**：`<label for>`（非 htmlFor）、SVG 用原生属性名（非 camelCase）

### Key Lessons

1. **WXT 0.20.x + Vitest 3 有 Vite 版本冲突**：WXT 内部用 Vite 8 (rolldown)，Vitest 用 Vite 7 (rollup)，需要 `as any` 绕过类型
2. **SW restart 不能用 chrome.runtime.reload**：在 unpacked dev mode 下会卸载扩展但不自动重新启用；正确做法是 CDP ServiceWorker.stopWorker
3. **popup 多 tab E2E 焦点窃取**：context.newPage() 默认拉到前台，必须用 bringToFront 解决
4. **Discord Slate 编辑器需要 ISOLATED→MAIN world bridge**：content script 的 ClipboardEvent paste 在 ISOLATED world 被 Discord editor 忽略，需要 executeScript 在 MAIN world 执行

### Cost Observations

- Model mix: 100% quality profile (opus-tier)
- Average plan duration: ~6 min
- Cumulative execution: ~2.6 hours
- Notable: Phase 5 Discord adapter 最复杂（2 gap closure plans），但总耗时仍在合理范围

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 7 |
| Plans | 41 |
| Plans/Phase | 5.9 avg |
| Timeline (days) | 11 |
| Commits | 313 |
| LOC | 11,399 |
| Unit tests | 225 |
| Gap closure plans | 4 (10%) |
| Avg plan duration | ~6 min |
