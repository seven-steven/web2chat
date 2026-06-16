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

## Milestone: v1.2 — 添加 web 宣传页面

**Shipped:** 2026-06-17
**Phases:** 4 | **Plans:** 14

### What Was Built

仓库内独立静态 marketing app（`apps/marketing`，Preact + Tailwind v4 + 独立 Vite build），en/zh_CN 双语 8-section 宣传页。配套 `verify:claims` 跨源一致性校验器（CI self-enforcing gate）、`MAINTENANCE.md` source-first 维护链、`CHANGELOG [v1.2]` 诚实 Known Issues、WCAG G201 外链可访问性。整个 milestone 不改扩展运行时主链路。

### What Worked

- **独立 workspace app 从第一天就隔离**：Phase 14 先建骨架 + BUILD-03 import 隔离测试，后续 Phase 15 写页面内容时 runtime 边界已被测试锁定，没有出现 marketing 误引扩展模块。
- **TDD 的 verify:claims 闭环**：16-01 用 RED→GREEN 先写校验器测试再实现，最终脚本 5 条规则覆盖了 CLAIMS Matrix 的所有 CLM-* 项，TRUST-03 / OPS-02 一次闭合。
- **Playwright 实测关闭人工 UAT**：G201 可见字形 + responsive 两个维度用 `launchPersistentContext` + computed-style/bounding-rect 断言实测（非裸 DOM 存在性检查），把 human_needed 推到 passed，证据可复核而非口头确认。
- **诚实边界写入 release notes**：TRUST-03 故意把 Telegram UAT / Nyquist partial / Feishu-Lark dropped 留在风险说明而非卖点，`verify:claims` 还禁止 cloud sync / 用户行为分析等过宣传词。

### What Was Inefficient

- **Phase 15 出现 2 个 gap-closure plan（15-05/15-06）**：初版页面 CTA 缺 `target="_blank" rel="noopener noreferrer"`（UAT issue 5「点击没跳转」）+ locale toggle 藏在 footer 不易发现，本应在 15-02/15-03 初次实现时就纳入外链语义与首屏可见性。
- **cosmetic 维度拖到 milestone 尾部**：design tokens「有点丑」(UAT issue 4) 一直作为唯一保留的 human_needed 项，期间反复主观评估；这类纯审美项应更早由维护者拍板，避免反复返工。

### Patterns Established

- **marketing build verification 模式**：`assertBuildOutput(distDir, errors)` 纯函数 + CLI guard + `REQUIRED_PAGE_MARKERS` 在 dist 全文本资产逐一断言，可直接被单测覆盖。
- **跨源 claim 校验模式**：`verify:claims` 把 PROJECT/PRIVACY/STORE-LISTING/生产 manifest 作为单一事实源，宣传页 claim 与之逐项比对，人工 checklist 自动化。
- **source-first → artifact-second → page-last 维护链**：`MAINTENANCE.md` 为每类 claim（平台/隐私/权限/截图/CTA）给出固定更新顺序，避免维护者反向从页面抠内容。
- **CI 单 job 扩展模式**：4 个 marketing/claims gate 并入现有 verify job（8→12 run steps，+10-15s），比并行 jobs 省 checkout+install。

### Key Lessons

- **人工 UAT 维度能用机器实测就别留目视**：G201/responsive 经 Playwright computed-style 断言后可复核，比「我看了没问题」可追溯得多。
- **外链语义与首屏可见性是首版就该定的**：CTA target/rel、locale toggle 位置这类「发布门槛」属性，应在组件初次实现时纳入，而不是等 UAT 报问题再 gap-closure。
- **self-enforcing gate 优于 checklist**：把 claim 一致性、README 锚点、manifest 权限都变成 CI 编译期拦截，人工维护成本显著下降。

### Cost Observations

- Model mix: quality profile 全程；gap-closure（15-05/15-06）与发布验收（Phase 16）占比高
- Sessions: 含 favicon quick task 收尾 + Playwright UAT 实测
- Notable: 宣传页 milestone 成本远低于扩展运行时 milestone（14 plans / 16 days vs v1.1 的 27 plans / 19 days），因为不触碰主链路、无平台 DOM 适配不确定性

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v1.2 |
|--------|------|------|------|
| Phases | 7 | 6 | 4 |
| Plans | 41 | 27 | 14 |
| Plans/Phase | 5.9 avg | 4.5 avg | 3.5 avg |
| Timeline (days) | 11 | 19 | 16 |
| Commits | 313 | 534 total repo commits at close | 665 total / 125 in v1.2 range |
| LOC | 11,399 | 18,837 | 19,287 (repo-wide, +marketing app) |
| Unit tests | 225 | extensive adapter + regression coverage | 518 passed (59 files) at v1.2 close |
| Gap closure plans | 4 (10%) | 3 explicit gap closures + 1 inserted phase | 2 gap-closure plans (15-05/15-06) |
| Avg plan duration | ~6 min | mixed; platform work + audit tail longer | shorter; static-page + CI work |
