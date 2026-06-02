---
phase: 15-promotional-page-content-visual
verified: 2026-06-02T13:56:36Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "在 320px 和 768px 视口打开 marketing 页面，检查 8 个 section 顺序保持不变、无横向滚动、payload/mockup 可读。"
    expected: "Hero → Use cases → Payload → Platforms → Flow → Trust → Limits → CTA 顺序不变；按钮可堆叠但不溢出；平台卡片与 mockup 在窄屏仍可读。"
    why_human: "响应式布局与真实浏览器渲染效果无法仅靠静态读码完全确认。"
  - test: "仅用键盘 Tab/Shift+Tab 浏览页面。"
    expected: "Hero CTA、locale toggle、底部 primary/secondary CTA 均可达，focus ring 清晰可见，顺序符合页面阅读顺序。"
    why_human: "代码显示存在 focus-visible 样式与 button/link 语义，但真实键盘交互与焦点可见性需要浏览器人工确认。"
  - test: "在 light/dark 模式下查看页面首屏与各交替 section。"
    expected: "文本与背景对比可读，交替 section 不混淆，mockup 元数据与 Telegram 风险标签可见；无明显首屏性能问题。"
    why_human: "色彩对比、视觉层级与“无明显性能问题”属于感知层检查，无法通过当前静态验证充分证明。"
---

# Phase 15: 宣传页内容与视觉实现 Verification Report

**Phase Goal:** 实现可发布的静态宣传页主体验，向访客展示产品定位、当前平台、核心流程、产品证据与安装入口。
**Verified:** 2026-06-02T13:56:36Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | 访客在首屏能理解 web2chat 的核心价值、目标用户与主要 CTA。 | ✓ VERIFIED | `apps/marketing/src/app.tsx` Hero 渲染 `getHero()` 的标题/副标题/primary CTA，并在首屏同时展示 shipped 平台 chip 与 payload preview；`apps/marketing/src/data/site-content.ts` 与 locale 文件提供双语内容；`tests/unit/marketing/app-sections.spec.tsx` 断言 Hero CTA 与 payload preview 存在。 |
| 2 | 页面展示 OpenClaw / Discord / Slack / Telegram 当前 shipped 平台，并避免暗示 Feishu/Lark 或其他 deferred 平台已支持。 | ✓ VERIFIED | `apps/marketing/src/data/site-content.ts#getSupportedPlatforms()` 仅返回四个平台，Telegram 带 `riskLabel`；`app.tsx` 平台 section 只渲染该 getter；`tests/unit/marketing/site-content.spec.ts` 与 `tests/unit/marketing/app-sections.spec.tsx` 均断言平台范围，且 Feishu/Lark / Nyquist 仅出现在 known limits。 |
| 3 | 页面包含 3-step flow 与 structured-payload 示例，说明它相对手动复制粘贴的差异。 | ✓ VERIFIED | `apps/marketing/src/components/flow/stepper.tsx` 固定三步顺序；`apps/marketing/src/components/proof/popup-mockup.tsx` 渲染 payload 六字段；`app.tsx` 组合 flow + payload section；对应测试 `tests/unit/marketing/proof-labels.spec.tsx` 与 `tests/unit/marketing/app-sections.spec.tsx` 验证字段顺序和 section 存在。 |
| 4 | 页面包含隐私 / 权限说明、安装 / 获取路径、产品证据模块，且视觉与现有项目风格一致。 | ✓ VERIFIED | `apps/marketing/src/data/site-content.ts#getTrustGroups()` 分离 privacy/permissions；`getCtaButtons()` 提供 repo root 和 `README#安装`；`AssetLabel`/`PopupMockup`/`TargetMockup` 提供 `mockup` + `source/status/version` 证据模块；`README.md` 存在 `<a id="安装"></a>` 与 `## 安装`；`apps/marketing/scripts/verify-build.mjs` 对 built output 断言 mockup label、CTA URL、trust/platform markers。 |
| 5 | 页面满足基础响应式布局、键盘可访问、图片 alt text、无明显首屏性能问题。 | ? UNCERTAIN (WARNING) | 代码层证据存在：`SectionShell`/`app.tsx`/`Stepper` 使用移动优先布局类；`CTAButton` 与 locale toggle 有 `min-h-11` / focus ring；装饰元素带 `aria-hidden`; 未发现 `<img>`。但真实响应式表现、焦点可见性、暗色对比和“无明显性能问题”需浏览器人工确认。 |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/data/site-content.ts` | 8 个 section 的 typed content getters、平台 truth、proof metadata、CTA links | ✓ VERIFIED | 文件存在且内容实质完整；导出 hero/use cases/payload/platforms/flow/trust/limits/CTA 等 getter；被 `app.tsx` 与 unit tests 消费。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/i18n/locales/en.json` | 英文 marketing copy | ✓ VERIFIED | 含 hero/useCases/payload/platforms/flow/trust/knownLimits/proof/cta/localeToggle keys。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/i18n/locales/zh_CN.json` | 中文 marketing copy | ✓ VERIFIED | 与 `en.json` key parity；`tests/unit/marketing/site-content.spec.ts` 断言无 `nextPhase.*` 且 keys 对齐。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/components/section-shell.tsx` | section band / width / title / intro shell | ✓ VERIFIED | 非 stub；被 `app.tsx` 多处组合使用。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/components/cta-button.tsx` | Hero 与底部 CTA 共享按钮契约 | ✓ VERIFIED | 提供 primary/secondary 视觉契约、focus ring、`min-h-11`；被 `app.tsx` 复用。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/components/proof/asset-label.tsx` | `mockup` 与 source/status/version 元数据标签 | ✓ VERIFIED | 非 stub；被 popup/target mockup 使用。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/components/proof/popup-mockup.tsx` | payload proof mockup | ✓ VERIFIED | 渲染固定六字段顺序与 metadata；被 `app.tsx` payload section 使用。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/components/proof/target-mockup.tsx` | target chat proof mockup | ✓ VERIFIED | 渲染 sent-to-chat proof surface 与 metadata；被 `app.tsx` Hero 右侧使用。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/components/flow/stepper.tsx` | 固定三步流程组件 | ✓ VERIFIED | 非 stub；固定排序 `capture → choose-target → send-to-chat`；被 `app.tsx` 使用。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src/app.tsx` | 最终 8-section 页面组装 | ✓ VERIFIED | 真实渲染 8 个 `data-section`，单 `h1` 与各 `h2`；无 `getNextPhase()` 占位内容。 |
| `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/scripts/verify-build.mjs` | built output smoke gate | ✓ VERIFIED | 纯函数 `assertBuildOutput(distDir, errors)` 校验 hero/use-cases/payload/platforms/flow/trust/limits/cta/mockup/CTA URL 等 marker。 |
| `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/marketing/site-content.spec.ts` | 数据层 truth regression tests | ✓ VERIFIED | 覆盖 payload 顺序、平台范围、trust wording、proof metadata、CTA URL、locale parity。 |
| `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/marketing/proof-labels.spec.tsx` | proof/CTA/stepper regression tests | ✓ VERIFIED | 覆盖 CTA variant、stepper 顺序、mockup label、popup/target metadata 行。 |
| `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/marketing/app-sections.spec.tsx` | section order / heading / CTA regression tests | ✓ VERIFIED | 覆盖 8 section 顺序、单 `h1`、locale toggle、hero CTA 与 limits placement。 |
| `/Users/seven/data/coding/projects/seven/web2chat/tests/unit/scripts/marketing-verify-build.spec.ts` | smoke verifier regression tests | ✓ VERIFIED | 覆盖 dist 缺失、空目录、缺 `index.html`、缺 marker、完整 built output success。 |
| `/Users/seven/data/coding/projects/seven/web2chat/README.md` | 安装锚点供 CTA-02 使用 | ✓ VERIFIED | 存在 `<a id="安装"></a>` 和 `## 安装`，与 `site-content.ts` secondary CTA 一致。 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `apps/marketing/src/data/site-content.ts` | `apps/marketing/src/i18n/locales/en.json` / `zh_CN.json` | `t()` key lookups | WIRED | 所有 getter 通过 `t('...')` 读取 locale key；`i18n/index.ts` 提供 `t()` / `setLocale()`。 |
| `apps/marketing/src/app.tsx` | `apps/marketing/src/data/site-content.ts` | getter-driven section render | WIRED | `app.tsx` 顶部导入并调用 hero/useCases/payload/platforms/flow/trust/limits/CTA getters。 |
| `apps/marketing/src/app.tsx` | `apps/marketing/src/components/cta-button.tsx` | shared CTA render | WIRED | Hero 与底部 CTA 都使用 `CTAButton`。 |
| `apps/marketing/src/components/proof/popup-mockup.tsx` | `apps/marketing/src/components/proof/asset-label.tsx` | proof metadata row | WIRED | `PopupMockup` 渲染 `AssetLabel`。 |
| `apps/marketing/src/components/proof/target-mockup.tsx` | `apps/marketing/src/components/proof/asset-label.tsx` | proof metadata row | WIRED | `TargetMockup` 渲染 `AssetLabel`。 |
| `apps/marketing/src/app.tsx` | `README.md` | CTA install URL | WIRED | `getCtaButtons().secondary.href` 指向 `https://github.com/nicholaschenai/web2chat#安装`；`README.md` 存在对应 anchor。 |
| `apps/marketing/scripts/verify-build.mjs` | `apps/marketing/dist/index.html` + built assets | built HTML/bundle smoke assertions | WIRED | `collectBuildText()` 聚合 `index.html` 与 `assets/*.js`；`assertBuildOutput()` 校验 final-page markers。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `apps/marketing/src/app.tsx` | `hero`, `useCases`, `payload`, `platforms`, `steps`, `trustGroups`, `limits`, `ctas` | `site-content.ts` getters | Yes — getters return locale-backed content objects, not empty/hardcoded placeholder state | ✓ FLOWING |
| `apps/marketing/src/components/proof/popup-mockup.tsx` | `fields`, `metadata` | props from `app.tsx` / `site-content.ts` | Yes — payload fields and proof metadata are populated from getters | ✓ FLOWING |
| `apps/marketing/src/components/proof/target-mockup.tsx` | `platform`, `status`, `message`, `metadata` | props from `app.tsx` / `site-content.ts` | Yes — Hero passes platform, status, joined payload message, labels, metadata | ✓ FLOWING |
| `apps/marketing/scripts/verify-build.mjs` | `buildText` | `dist/index.html` + `dist/assets/*.js` | Yes — verifier reads actual built output rather than static stub array | ✓ FLOWING |

### Behavioral Spot-Checks

Used latest already-run session gate results supplied by the user.

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Marketing content/tests/type integration holds | `pnpm test` | PASS (58 files / 471 tests) | ✓ PASS |
| Locale parity stays complete | `pnpm test:i18n-coverage` | PASS (100%) | ✓ PASS |
| Marketing app builds independently | `pnpm site:build` | PASS | ✓ PASS |
| Final built output smoke gate passes | `pnpm site:verify` | PASS | ✓ PASS |
| Repo-wide static analysis stays clean | `pnpm lint && pnpm typecheck` | PASS | ✓ PASS |
| README anchor and manifest checks still pass | `pnpm verify:readme && pnpm verify:manifest` | PASS | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| --- | --- | --- | --- |
| none declared for Phase 15 | — | No `probe-*.sh` documented in Phase 15 plans/summaries | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MSG-01 | 15-01, 15-03 | Hero 让访客理解结构化网页信息 + prompt 投递到聊天会话 | ✓ SATISFIED | Hero title/subtitle/CTA in `app.tsx`; locale-backed copy in `site-content.ts` + locale JSON; app-section tests cover Hero presence. |
| MSG-02 | 15-01, 15-03 | 访客识别三类 use cases | ✓ SATISFIED | `getUseCases()` returns personal/team/agent 三项；`app.tsx` 渲染 use-case cards。 |
| MSG-03 | 15-01, 15-03 | 访客通过 structured-payload 示例理解区别于手工复制粘贴 | ✓ SATISFIED | `getPayloadExample()` six-field ordered payload + `PopupMockup`; tests assert order. |
| PROOF-01 | 15-01, 15-03 | 访客看到当前 shipped 平台集 OpenClaw/Discord/Slack/Telegram | ✓ SATISFIED | `getSupportedPlatforms()` only returns four shipped platforms; platform section test verifies exact set. |
| PROOF-02 | 15-02, 15-03 | 访客能跟随 capture → choose target → send 的三步流程 | ✓ SATISFIED | `Stepper` fixed order + `getThreeStepFlow()` + app composition + proof-label tests. |
| PROOF-03 | 15-02, 15-04 | 访客看到带 source/version/status 标注的可信产品证据 | ✓ SATISFIED | `AssetLabel`, `PopupMockup`, `TargetMockup`, `getProofMetadata()`, `verify-build.mjs` marker assertions, tests for `mockup` + metadata rows. |
| CTA-01 | 15-01, 15-02, 15-03 | 访客可找到源码仓库/项目入口 | ✓ SATISFIED | Hero primary CTA and bottom primary CTA both point to repo root from `site-content.ts`. |
| CTA-02 | 15-01, 15-04 | 访客可找到安装/可获取路径 | ✓ SATISFIED | Secondary CTA points to README install anchor; README contains `<a id="安装"></a>` and `## 安装`; `verify:readme` passed. |
| TRUST-01 | 15-01, 15-03, 15-04 | 访客理解 local-first/no telemetry/direct browser delivery 隐私模型 | ✓ SATISFIED | `getTrustGroups().privacy` facts rendered in trust section; build verifier checks trust markers. |
| TRUST-02 | 15-01, 15-03, 15-04 | 访客理解真实生产权限模型且无误导声明 | ✓ SATISFIED | `getTrustGroups().permissions` uses production permissions/hosts/optional grant wording; tests explicitly reject tabs/static `<all_urls>` production claims. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No blocking debt markers (`TODO`/`FIXME`/`XXX`/`TBD`) or placeholder implementations found in Phase 15 marketing files reviewed | ℹ️ Info | No anti-pattern blocker discovered in verified artifact set |

### Human Verification Required

### 1. Responsive layout smoke

**Test:** 在 320px 和 768px 视口打开 marketing 页面，检查 8 个 section 顺序保持不变、无横向滚动、payload/mockup 可读。  
**Expected:** Hero → Use cases → Payload → Platforms → Flow → Trust → Limits → CTA 顺序不变；按钮可堆叠但不溢出；平台卡片与 mockup 在窄屏仍可读。  
**Why human:** 响应式布局与真实浏览器渲染效果无法仅靠静态读码完全确认。

### 2. Keyboard navigation and focus visibility

**Test:** 仅用键盘 Tab/Shift+Tab 浏览页面。  
**Expected:** Hero CTA、locale toggle、底部 primary/secondary CTA 均可达，focus ring 清晰可见，顺序符合页面阅读顺序。  
**Why human:** 代码显示存在 focus-visible 样式与 button/link 语义，但真实键盘交互与焦点可见性需要浏览器人工确认。

### 3. Visual contrast and first-screen feel

**Test:** 在 light/dark 模式下查看页面首屏与各交替 section。  
**Expected:** 文本与背景对比可读，交替 section 不混淆，mockup 元数据与 Telegram 风险标签可见；无明显首屏性能问题。  
**Why human:** 色彩对比、视觉层级与“无明显性能问题”属于感知层检查，无法通过当前静态验证充分证明。

### Gaps Summary

未发现阻断性实现缺口：Phase 15 的代码、测试、README 安装锚点、以及 built-output smoke verifier 均已落地并互相连通，10 个指定 requirement IDs 都能在代码库中找到实现证据。  
当前未给出 `passed`，原因仅是 roadmap success criterion 5 包含响应式、键盘可访问、alt text/视觉对比、首屏性能感知等必须由真人在浏览器里完成的 UAT 项。

---

_Verified: 2026-06-02T13:56:36Z_  
_Verifier: Claude (gsd-verifier)_
