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

## Milestone: v1.1 — 多渠道适配

**Shipped:** 2026-05-31
**Phases:** 6 | **Plans:** 27 | **Timeline:** 19 days

### What Was Built

- 适配器架构泛化，新增平台无需改 dispatch pipeline / service worker 主干
- 投递鲁棒性加固：超时分层、登录检测泛化、重试 UI、低置信度确认流
- Slack 适配器与后续 10.1 gap closure，闭合 logged-out redirect 历史 blocker
- Telegram 适配器：Web K URL、contenteditable 注入、发送确认与 4096 字截断
- Feishu/Lark 适配器完整实现与验证，但最终因共享 URL blocker 未纳入 shipped scope

### What Worked

- **Registry-driven 扩展模式**：Phase 8 先改架构，再落 Slack / Telegram / Feishu，证明“先抽象后扩平台”是对的
- **Gap closure 可控**：Slack 的 Phase 10 → 10.1 形成了先自动化回归、再真实会话补证据的闭环
- **结构克隆策略**：Telegram 与 Feishu 内容脚本大量复用 Slack 模式，显著降低新增平台成本
- **Milestone 审计驱动收尾**：审计先暴露 shipped scope 与 requirements baseline 的偏差，避免带着错误基线直接归档

### What Was Inefficient

- **REQUIREMENTS 基线漂移再次出现**：Phase 完成后没有及时把 DSPT / SLK / dropped FSL 写回 REQUIREMENTS，导致 closeout 时仍是旧状态
- **Telegram 人工验证缺位**：自动化充分但 live UAT 缺失，使 milestone audit 只能停在 partial
- **Feishu/Lark 过晚暴露根本 blocker**：直到 UAT 才确认共享 URL 让 targeting 模型失效，前面 5 个 plan 的产出最终未进入 shipped scope

### Patterns Established

- **Adapter metadata 驱动登录检测**：`loggedOutPathPatterns` / `loggedOutHostMatches` 让跨平台登录跳转进入统一策略层
- **低置信度选择器必须显式用户确认**：把“可能误投递”的风险转成 UI contract，而不是平台内静默猜测
- **平台可行性必须尽早验证 identity 模型**：仅能注入还不够，必须先证明“能稳定定位目标会话”

### Key Lessons

1. **先验证 chat identity，再投入完整适配实现**：Feishu/Lark 说明 URL / route 是否唯一比 DOM 注入本身更早决定项目成败
2. **Closeout 文档不能滞后于 shipped reality**：requirements / roadmap / audit 基线如果不一起更新，milestone 结束时清算成本会很高
3. **Slack 类登录跳转问题需要从 transport 和 tab URL 层建模**：不能只靠 content script waitForReady
4. **自动化充分不等于 closeout 完整**：涉及真实平台登录态时，仍需要真实会话证据来完成最后一公里

### Cost Observations

- Model mix: 以 quality profile 为主，gap closure 与文档同步占比明显高于 v1.0
- Sessions: milestone 内含 inserted Phase 10.1 与多次 closeout / audit / quick task 收尾
- Notable: Slack 与 Telegram 的平台扩展成本可控，但 Feishu/Lark 的 wasted execution 暴露了“先做可行性门禁”的必要性

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 |
|--------|------|------|
| Phases | 7 | 6 |
| Plans | 41 | 27 |
| Plans/Phase | 5.9 avg | 4.5 avg |
| Timeline (days) | 11 | 19 |
| Commits | 313 | 534 total repo commits at close |
| LOC | 11,399 | 18,837 |
| Unit tests | 225 | extensive adapter + regression coverage |
| Gap closure plans | 4 (10%) | 3 explicit gap closures + 1 inserted phase |
| Avg plan duration | ~6 min | mixed; platform work + audit tail longer |
