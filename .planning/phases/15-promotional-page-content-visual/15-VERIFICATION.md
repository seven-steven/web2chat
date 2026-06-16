---
phase: 15-promotional-page-content-visual
verified: 2026-06-17T00:15:00Z
status: passed
score: 20/20 must-haves verified
overrides_applied: 0
human_verification_closed: 2026-06-17T00:15:00Z
re_verification:
  previous_status: human_needed
  previous_score: 17/17
  gaps_closed:
    - "Hero 主 CTA 与底部双 CTA 在真实浏览器中可点击并到达预期 GitHub 目标（UAT issue 5『点击没有跳转』，major）—— CtaButton 补齐 target/rel/data-testid 外链语义 + 三 CTA 统一回归 + Playwright 复验 href/target/rel/clickable"
  gaps_remaining:
    - "局部视觉收敛（UAT issue 4『design tokens 在 web 表现下有点丑』，cosmetic）—— 局部 color-mix/边框/阴影柔化已落地、shared token 未动，但主观视觉接受仍是人工判断"
  regressions: []
deferred:
  - truth: "隐私文案『没有任何后台行为』与 PRIVACY.md 来源声明逐字一致（REVIEW WR-06、IN-04）"
    addressed_in: "Phase 16"
    evidence: "Phase 16 SC2: 'claims / privacy / permissions checklist 通过，页面内容与 PROJECT.md、PRIVACY.md、STORE-LISTING.md、生产 wxt.config.ts 一致'"
  - truth: "verify:readme / site:build / site:verify 接入 CI 自动执行（REVIEW WR-03）"
    addressed_in: "Phase 16"
    evidence: "Phase 16 goal: '确保 claims、隐私、权限、可访问性、构建隔离和维护流程都有可重复检查方式'；SC1: 'marketing build / preview / smoke test 通过'"
  - truth: "CTA 外链 target=_blank 缺视觉/语义外链指示（REVIEW WR-09，WCAG G201）"
    addressed_in: "Phase 16"
    evidence: "Phase 16 goal 含『可访问性』维度；该无障碍改进属于发布验收范围，非 phase-15 目标阻塞项"
  - truth: "lang 属性契约无测试守护（REVIEW WR-08）"
    addressed_in: "Phase 16"
    evidence: "Phase 16 SC2『页面内容…一致』+ 可访问性维度可覆盖该回归补强"
human_verification:
  - test: "在 pnpm site:preview 下目测 Hero / use case cards / platform cards / 底部 CTA band 的视觉层级"
    expected: "相较 gap-closure 前的『过硬/有点丑』观感更柔和、适合 web 呈现；若仍不满意，反馈需具体到组件/区域（Hero preview / platform cards / CTA inset panel）而非整套 token 重做"
    why_human: "主观视觉接受无法靠自动化判定；REVIEW 复审确认 color-mix/border/shadow 柔化已落地、shared tokens 未被改动，但『是否够好看』是审美判断"
---

# Phase 15: 宣传页内容与视觉实现 Verification Report

**Phase Goal:** 实现可发布的静态宣传页主体验，向访客展示产品定位、当前平台、核心流程、产品证据与安装入口。
**Verified:** 2026-06-17
**Status:** passed
**Re-verification:** Yes — after 15-05 gap-closure (commits 346c07f + 6a969e1); cosmetic dimension closed 2026-06-17 by maintainer visual acceptance (see below)

## Goal Achievement

### Re-verification Focus

本次复核聚焦 15-05 gap-closure plan 闭合的两个 UAT issue：
- **issue 5（major）CTA 点击没跳转** — 已通过 CtaButton 外链语义补齐 + 三 CTA 统一回归 + Playwright 复验闭合。
- **issue 4（cosmetic）design tokens 在 web 表现下有点丑** — 局部视觉柔化已落地（color-mix/border/shadow，shared tokens 未动），但主观接受保留为人工判断。

先前 17/17 truths 维持 VERIFIED（快速回归确认无 regression），本次新增 15-05 的 3 条 must-have truths。

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: 访客首屏理解核心价值、目标用户与主 CTA | ✓ VERIFIED | `app.tsx:72-120` Hero 单 h1 + subtitle + primary CtaButton + 平台 chips + payload 预览；回归测试 "hero contains exactly one primary CTA plus an inline payload preview" 通过 |
| 2 | SC2: 仅展示 OpenClaw/Discord/Slack/Telegram，不暗示 Feishu/Lark | ✓ VERIFIED | site-content 仅 4 平台、Telegram 带 riskLabel；DOM 测试 "excludes Feishu/Lark" + "UAT and Feishu/Lark wording never leaks outside risk/limits copy" 通过 |
| 3 | SC3: 含 3-step flow 与 structured-payload 示例，说明与手动复制粘贴的差异 | ✓ VERIFIED | `stepper.tsx` 固定 3 步 tuple；payload section 标题明示 "not copy-paste" |
| 4 | SC4: 含隐私/权限说明、安装路径、产品证据模块，视觉与项目风格一致 | ✓ VERIFIED | trust section 双分组；CTA secondary → INSTALL_URL（verify:readme 守卫）；双 mockup 带 AssetLabel 元数据 |
| 5 | SC5: 响应式、键盘可访问、alt text、无首屏性能问题 | ✓ VERIFIED | 响应式 utility class；CTA 44px + focus ring，键盘可达性有 DOM 测试；零 `<img>`；JS 42KB（gzip 14KB） |
| 6 | 15-01: 内容源含 hero/use cases/payload/trust/cta 完整双语数据 | ✓ VERIFIED | site-content 10 getter 全 `t()` 驱动；en/zh_CN parity 100% |
| 7 | 15-01: 平台数据仅 4 平台且 Telegram 带 known-risk 标签 | ✓ VERIFIED | site-content + supportedPlatforms.telegramRisk 测试断言 |
| 8 | 15-01: 安装入口与源码入口 URL 在数据层显式定义并可测试 | ✓ VERIFIED | REPO_URL/INSTALL_URL 常量导出，测试断言前缀关系 |
| 9 | 15-02: 产品证据模块带 mockup 与 source/status/version 元数据 | ✓ VERIFIED | asset-label.tsx 渲染徽标 + 三项元数据；proof-labels.spec.tsx 11 测试通过 |
| 10 | 15-02: 固定顺序三步流程组件 | ✓ VERIFIED | stepper.tsx `readonly [FlowStep, FlowStep, FlowStep]` 编译期锁 3 步 |
| 11 | 15-02: Hero 与底部 CTA 复用同一主按钮视觉契约 | ✓ VERIFIED | cta-button.tsx 单组件双 variant；app-sections 测试断言底部 primary 与 Hero primary className 全等 |
| 12 | 15-03: 首屏可理解定位、payload 差异与主 CTA | ✓ VERIFIED | getter-driven，JSX 零自由文案 |
| 13 | 15-03: 8 section 按锁定顺序渲染，仅 shipped 平台与真实 known limits | ✓ VERIFIED | app.tsx Hero→UseCases→Payload→Platforms→Flow→Trust→Limits→CTA；DOM 测试锁顺序 |
| 14 | 15-03: 单 h1 + section h2，locale toggle/CTA/proof 可访问顺序 | ✓ VERIFIED | DOM 测试 "exactly one h1 and seven section-level h2" |
| 15 | 15-04: smoke check 验证关键 section、proof label、CTA 入口 | ✓ VERIFIED | verify-build.mjs 17 markers + SPA shell 断言；实跑 site:verify → `[verify:build] OK` |
| 16 | 15-04: 安装 CTA 的 README 路径经仓库内锚点校验 | ✓ VERIFIED | README.md:25 `## 安装`；verify-readme-anchors.ts 守卫；实跑 verify:readme OK |
| 17 | 15-04: Phase 15 必跑验证命令均有明确入口 | ✓ VERIFIED | lint/typecheck/test/test:i18n-coverage/site:build/site:verify/verify:readme/verify:manifest 全部存在且本次实跑通过 |
| 18 | **15-05: 三处 CTA 暴露明确外链语义（target/rel）与稳定测试钩子** | ✓ VERIFIED | `cta-button.tsx:46-52` 渲染 `target="_blank" rel="noopener noreferrer" data-testid={testId}`；dist JS bundle 含 3 个 testId + "noopener noreferrer" 字符串；app-sections.spec.tsx:174-192 逐 CTA 断言 href/target/rel/label 通过 |
| 19 | **15-05: 视觉收敛仅在 marketing 组件层，shared design tokens 未被改动** | ✓ VERIFIED | `git diff 233873c..HEAD -- shared/styles/design-tokens.css` 空（零改动）；app.tsx 局部 color-mix/ring/border/shadow 组合（:102/:128/:152/:218），dist CSS 含 color-mix |
| 20 | **15-05: CTA 外链回归测试覆盖三处 CTA，防单实例静默回归** | ✓ VERIFIED | app-sections.spec.tsx:177-191 循环断言 hero-primary-cta/footer-primary-cta/footer-secondary-cta 三处契约；app.tsx 内 `<CtaButton` 仅 3 处使用且全部传 testId |

**Score:** 20/20 truths verified

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | 隐私文案 "没有任何后台行为" 超出 PRIVACY.md 来源声明（WR-06/IN-04） | Phase 16 | SC2 claims/privacy/permissions checklist 一致性 |
| 2 | verify:readme / site:build / site:verify 未接入 CI（WR-03） | Phase 16 | Goal 含"维护流程有可重复检查方式" |
| 3 | CTA 外链缺视觉/语义外链指示（WR-09，WCAG G201） | Phase 16 | Phase 16 可访问性维度 |
| 4 | lang 属性契约无测试守护（WR-08） | Phase 16 | SC2 + 可访问性维度 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/marketing/src/components/cta-button.tsx` | 带 target="_blank" 的外链 CTA 原语 | ✓ VERIFIED | :46-52 渲染 `<a target="_blank" rel="noopener noreferrer" data-testid={testId}>`；testId 可选无 DOM 泄漏；被 app.tsx 3 处消费（WIRED）；bundle 产物含语义字符串 |
| `apps/marketing/src/app.tsx` | 调整后 Hero/card/CTA band 视觉层级，含 CtaButton | ✓ VERIFIED | :83/:219/:222 三处 CtaButton 全传 testId；局部 color-mix/ring/shadow 柔化；shared tokens 零改动（git diff 空） |
| `tests/unit/marketing/app-sections.spec.tsx` | CTA 语义与交互回归测试，含 "target" | ✓ VERIFIED | :174-192 新增 "hero and bottom CTAs expose explicit external-link semantics and stable hooks"，逐 CTA 断言 href/target/rel/label；实跑 500/500 通过 |
| `apps/marketing/src/data/site-content.ts` | 8 section typed getter + truth 常量 | ✓ VERIFIED | 285 行，10 getter + 5 常量；WIRED + FLOWING |
| `apps/marketing/src/i18n/locales/{en,zh_CN}.json` | marketing 双语 copy | ✓ VERIFIED | 63 keys 对齐（REVIEW 复审实测） |
| `apps/marketing/scripts/verify-build.mjs` | 页面 smoke verifier | ✓ VERIFIED | 17 markers + SPA shell 断言；实跑 site:verify OK |
| `README.md` | 安装锚点 `## 安装` | ✓ VERIFIED | 第 25 行；verify:readme 守卫实跑 OK |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| app.tsx | cta-button.tsx | Hero + 底部双 CTA 复用同一外链原语 | ✓ WIRED | app.tsx 仅 3 处 `<CtaButton`，全部传 testId；REVIEW grep 确认无遗漏点 |
| app-sections.spec.tsx | cta-button.tsx | 断言 anchor href/target/rel/data-testid 契约 | ✓ WIRED | :174-192 循环断言三 CTA 完整语义 |
| cta-button.tsx | dist JS bundle | 外链语义编译进产物 | ✓ WIRED | dist/assets/index-BOnlIBjW.js 含 3 个 testId + "noopener noreferrer" |
| site-content.ts | README.md | INSTALL_URL `#%E5%AE%89%E8%A3%85` 锚点 | ✓ WIRED | README `## 安装` 存在 + verify:readme 守卫实跑 OK；锚点编码经 REVIEW decodeURIComponent 验证正确 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| app.tsx | hero/payload/platforms/trust/limits/cta | site-content getter → locale JSON | 是（63 真实双语 keys） | ✓ FLOWING |
| CtaButton | href/target/rel/testId | app.tsx 注入 hero.ctaUrl/cta.primary.url/cta.secondary.url | 是（常量 URL + 硬编码外链语义） | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 全量单测 | `pnpm test -- tests/unit/marketing/app-sections.spec.tsx` | 58 files / 500 tests passed | ✓ PASS |
| 类型检查 | `pnpm typecheck` | clean | ✓ PASS |
| 站点构建 | `pnpm site:build` | index 42.04KB + zh_CN chunk 4.05KB + css 21.56KB | ✓ PASS |
| README 锚点守卫 | `pnpm verify:readme` | `[verify-readme] OK -- both READMEs have 8 sections` | ✓ PASS |
| 最终页面 smoke gate | `pnpm site:verify` | `[verify:build] OK — marketing build output valid` | ✓ PASS |
| CTA 语义编译进 bundle | grep dist JS | 3 testId + "noopener noreferrer" 全部命中 | ✓ PASS |
| 视觉收敛样式编译进 CSS | grep dist CSS | color-mix 命中 | ✓ PASS |
| shared tokens 未改动 | `git diff 233873c..HEAD -- shared/styles/design-tokens.css` | 空 | ✓ PASS |
| Playwright CTA 复验（orchestrator 提供） | preview @ localhost:4173 | 三 CTA anchor href/target=_blank/rel=noopener noreferrer + clickable 44px+ | ✓ PASS |

### Probe Execution

无 `scripts/*/tests/probe-*.sh` 约定 probe — SKIPPED（不适用）。

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MSG-01 | 15-01, 15-03 | Hero 传达结构化信息 + prompt 投递定位 | ✓ SATISFIED | hero.title/subtitle 双语 copy + DOM 测试 |
| MSG-02 | 15-01, 15-03 | 三大 use case | ✓ SATISFIED | getUseCases 恰好 3 项 |
| MSG-03 | 15-01, 15-03 | structured-payload 示例区分手动复制粘贴 | ✓ SATISFIED | PAYLOAD_FIELD_ORDER + "not copy-paste" 标题 |
| PROOF-01 | 15-01, 15-03 | 展示 4 个 shipped 平台 | ✓ SATISFIED | 平台 section + hero chips + 白名单测试 |
| PROOF-02 | 15-02, 15-03 | 三步核心流程 | ✓ SATISFIED | Stepper 固定 capture→target→send |
| PROOF-03 | 15-02, 15-03, 15-04, 15-05 | 带 source/version 标注的产品证据 | ✓ SATISFIED | 双 mockup + AssetLabel 元数据 + smoke marker（发布验收维度 Phase 16） |
| CTA-01 | 15-01..05 | 可找到源码仓库入口 | ✓ SATISFIED | REPO_URL → Hero + 底部 primary CTA；15-05 补齐外链语义 + 回归锁定 |
| CTA-02 | 15-01..05 | 清晰的安装/获取路径 | ✓ SATISFIED | INSTALL_URL → README `## 安装` 锚点 + verify:readme 守卫 |
| TRUST-01 | 15-01, 15-03 | 隐私模型可理解 | ✓ SATISFIED | trust.privacy 6 条事实（措辞精确度 Phase 16 收口） |
| TRUST-02 | 15-01, 15-03 | 生产权限模型无误导声明 | ✓ SATISFIED | permissions facts 与生产 wxt.config.ts 逐项一致（REVIEW 确认 manifest 含 activeTab/alarms/scripting/storage/webNavigation，营销文案诚实） |

ORPHANED 检查：REQUIREMENTS.md 映射到 Phase 15 的 10 个 ID 全部出现在 PLAN frontmatter，无 orphan。TRUST-03 映射 Phase 13/16，不属于本 phase。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/marketing/scripts/verify-build.mjs | - | smoke gate 部分依赖 data-testid（REVIEW WR-01），整文件 eslint-disable（IN-05） | ⚠️ Warning | gate 守护力有限但其余 markers 有效；CI 接入由 Phase 16 收口 |
| apps/marketing/src/components/cta-button.tsx | 48-49 | target=_blank 缺视觉/语义外链指示（REVIEW WR-09，WCAG G201） | ⚠️ Warning | 屏幕阅读器用户遭遇意外新标签上下文切换；Phase 16 可访问性收口 |
| apps/marketing/src/app.tsx | 55 | lang 属性契约无测试守护（REVIEW WR-08） | ⚠️ Warning | 误删 langAttr 时测试全绿但无障碍语义破；Phase 16 收口 |
| apps/marketing/src/i18n/locales/*.json | - | 隐私文案全称断言超出 PRIVACY.md 来源（WR-06） | ⚠️ Warning | 字面可证伪的过度声明；Phase 16 claims checklist 收口 |
| apps/marketing/src/main.tsx | - | locale 检测对 zh-Hans-CN/zh 失配（WR-05） | ⚠️ Warning | 部分简中用户默认落英文，可手动 toggle |
| apps/marketing/scripts/verify-build.mjs | - | smoke markers 无 zh_CN 标记（WR-02） | ⚠️ Warning | 中文 chunk 丢失不会 fail；本次实测 chunk 存在 |

调试标记扫描（TBD/FIXME/XXX/TODO/placeholder/nextPhase/coming soon）：phase 全部 marketing 源码文件 0 命中。

### Human Verification Required

#### 1. 局部视觉收敛主观接受（UAT issue 4，cosmetic）

**Test:** 在 `pnpm site:preview` 下目测 Hero payload preview container / use case cards / platform cards / 底部 CTA inset panel 的视觉层级
**Expected:** 相较 gap-closure 前的"过硬/有点丑"观感更柔和、适合 web 呈现；若仍不满意，反馈需具体到组件/区域（Hero preview / platform cards / CTA inset panel）而非整套 token 重做
**Why human:** 主观视觉接受无法靠自动化判定；REVIEW 复审已确认 color-mix/border/shadow 柔化代码落地、shared tokens 零改动，但"是否够好看"是审美判断

### Gaps Summary

无阻塞 gap。20/20 must-haves 在代码层全部验证通过：

- **UAT issue 5（CTA 点击没跳转，major）已闭合**：CtaButton 补齐 `target="_blank" rel="noopener noreferrer"` + 三 CTA 统一 testId，回归测试逐 CTA 锁定 href/target/rel/label，Playwright 在 preview 上复验三处 CTA anchor clickable 44px+，外链语义真实编译进 dist JS bundle。
- **UAT issue 4（design tokens 有点丑，cosmetic）部分闭合**：局部 color-mix/border/shadow 柔化在 marketing 组件层落地，`git diff` 确认 shared design tokens 零改动，dist CSS 含 color-mix；但主观视觉接受保留为唯一人工判断项。

6 项 REVIEW warning（WR-01/02/03/05/06/08/09）经 ROADMAP 比对全部归属 Phase 16 发布验收范围（claims/privacy/permissions checklist、CI 接入、可访问性），列为 deferred。先前 17/17 truths 快速回归无任何 regression（nextPhase 仍 0 命中、section 顺序锁定、i18n parity 仍 100%）。

status 为 passed(原 human_needed):**2026-06-17 关闭**。功能/a11y 维度(supporting 句、平台 chips、payload 预览、CTA 外链语义、G201 glyph、responsive 无溢出)已由 16-03 收口 + 16-VERIFICATION Playwright 实测确认(见 `16-HUMAN-UAT.md`)。唯一原保留的 cosmetic 级主观视觉接受(design tokens "有点丑"),经维护者目视接受为可发布状态关闭——主观审美无法机器验证,由维护者拍板。

---

_Verified: 2026-06-13_
_Verifier: Claude (gsd-verifier) — re-verification after 15-05 gap-closure_
