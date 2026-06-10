---
phase: 15-promotional-page-content-visual
verified: 2026-06-10T18:50:00Z
status: human_needed
score: 17/17 must-haves verified
overrides_applied: 0
human_verification:
  - test: "浏览器打开 marketing 页面（pnpm site:dev 或 site:build + 静态预览），查看首屏"
    expected: "首屏可同时看到 h1 价值陈述、支持句、主 CTA、平台 chips 与 payload 预览，能在 5 秒内理解产品定位（SC1）"
    why_human: "首屏信息层级与『可理解性』是视觉/认知判断，DOM 测试只能证明元素存在"
  - test: "在 320px / 768px / 桌面宽度下浏览全页，并切换系统 dark mode"
    expected: "单栏布局不溢出、卡片网格正确折叠、背景带交替在 dark mode 下仍有层次（SC4/SC5）"
    why_human: "happy-dom 不做真实布局计算，响应式断点与 dark token 渲染需真实浏览器"
  - test: "纯键盘 Tab 遍历整页：hero CTA → 底部双 CTA → footer locale toggle，并按 Enter 触发 toggle"
    expected: "焦点环可见（2px accent ring）、顺序符合阅读顺序、toggle 切换后整页文案变为中文且再次可切回"
    why_human: "焦点环可见性与真实 tab 顺序无法在 jsdom/happy-dom 中可靠验证（测试已遇到 tabIndex 兼容问题）"
  - test: "对照现有 popup/options UI 视觉，检查 marketing 页的 token 使用（emerald accent、charcoal、radius、阴影）"
    expected: "视觉与现有项目风格一致（SC4『视觉与现有项目风格一致』）"
    why_human: "风格一致性是审美判断，grep 只能确认 token 引用存在"
  - test: "点击 Hero 主 CTA、底部 primary/secondary CTA"
    expected: "分别到达 GitHub 仓库根与 README『## 安装』锚点（中文 README 锚点 #%E5%AE%89%E8%A3%85 正确定位）"
    why_human: "外链可达性与 GitHub 锚点实际跳转行为需真实浏览器验证"
deferred:
  - truth: "隐私文案 'nothing happens in the background / 没有任何后台行为' 与 PRIVACY.md 来源声明逐字一致（REVIEW WR-06、IN-04）"
    addressed_in: "Phase 16"
    evidence: "Phase 16 success criteria 2: 'claims / privacy / permissions checklist 通过，页面内容与 PROJECT.md、PRIVACY.md、STORE-LISTING.md、生产 wxt.config.ts 一致'"
  - truth: "verify:readme / site:build / site:verify 接入 CI 自动执行（REVIEW WR-03）"
    addressed_in: "Phase 16"
    evidence: "Phase 16 goal: '确保 claims、隐私、权限、可访问性、构建隔离和维护流程都有可重复检查方式'；SC1: 'marketing build / preview / smoke test 通过'"
---

# Phase 15: 宣传页内容与视觉实现 Verification Report

**Phase Goal:** 实现可发布的静态宣传页主体验，向访客展示产品定位、当前平台、核心流程、产品证据与安装入口。
**Verified:** 2026-06-10
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths（ROADMAP Success Criteria + 4 份 PLAN must_haves 合并）

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: 访客在首屏能理解核心价值、目标用户与主要 CTA | ✓ VERIFIED* | `app.tsx:72-120` Hero：单 h1 价值陈述 + subtitle + primary CtaButton + 平台 chips + payload 预览；`app-sections.spec.tsx` "hero contains exactly one primary CTA plus an inline payload preview" 通过。*首屏可理解性留人工确认 |
| 2 | SC2: 仅展示 OpenClaw/Discord/Slack/Telegram，不暗示 Feishu/Lark 已支持 | ✓ VERIFIED | `site-content.ts:184-196` 仅 4 平台、Telegram 带 riskLabel；DOM 测试 "excludes Feishu/Lark" + "UAT and Feishu/Lark wording never leaks outside risk/limits copy" 通过；dist 产物 grep 确认飞书字样只出现在 `limits.feishu` 文案中 |
| 3 | SC3: 包含 3-step flow 与 structured-payload 示例，说明与手动复制粘贴的差异 | ✓ VERIFIED | `stepper.tsx` 固定 3 步 tuple 类型 `<ol>` 语义；`popup-mockup.tsx` 字段顺序 title/url/description/create_at/content/prompt 由 `data-field-key` 锁定；payload section 标题 "Structured payload, not copy-paste" / "结构化载荷，而非复制粘贴" 明示差异 |
| 4 | SC4: 包含隐私/权限说明、安装/获取路径、产品证据模块，视觉与项目风格一致 | ✓ VERIFIED* | trust section 双分组（privacy 6 条 / permissions 3 条）；CTA secondary → `INSTALL_URL`（README `## 安装` 锚点，`verify:readme` 守卫通过）；PopupMockup + TargetMockup 均带可见 mockup 徽标 + source/status/version 元数据行；全部样式走 design-tokens CSS 变量。*风格一致性留人工确认 |
| 5 | SC5: 基础响应式、键盘可访问、图片 alt text、无明显首屏性能问题 | ✓ VERIFIED* | 响应式 utility class（`md:grid`、`md:grid-cols-3`、stepper responsive）；locale toggle / CTA 44px + focus ring，键盘可达性有 DOM 测试；页面零 `<img>`（全 CSS mockup + 装饰 SVG `aria-hidden`，alt 要求空集满足）；JS bundle 41.4KB（gzip 14KB），无首屏性能隐患。*真实断点/焦点环留人工确认 |
| 6 | 15-01: 内容源含 hero/use cases/payload/trust/cta 完整双语数据 | ✓ VERIFIED | `site-content.ts` 10 个 getter 全部 `t()` 驱动；en/zh_CN 各 65 keys 完全对齐（spec 测试断言 parity）；`pnpm test:i18n-coverage` 100% |
| 7 | 15-01: 平台数据仅 4 平台且 Telegram 带 known-risk 标签 | ✓ VERIFIED | `site-content.ts:184-196` + `supportedPlatforms.telegramRisk` = "live UAT pending / known risk"，site-content.spec.ts 断言 |
| 8 | 15-01: 安装入口与源码入口 URL 在数据层显式定义并可测试 | ✓ VERIFIED | `REPO_URL` / `INSTALL_URL` 导出常量（site-content.ts:6-9），测试断言 INSTALL_URL 以 REPO_URL 为前缀 |
| 9 | 15-02: 产品证据模块带 mockup 与 source/status/version 元数据 | ✓ VERIFIED | `asset-label.tsx` 渲染 mockup 徽标 + 三项元数据；两个 mockup 均经 figcaption 强制挂载 AssetLabel；proof-labels.spec.tsx 11 测试通过 |
| 10 | 15-02: 固定顺序三步流程组件 | ✓ VERIFIED | `stepper.tsx:15` `readonly [FlowStep, FlowStep, FlowStep]` 编译期锁 3 步；布局切换不改 DOM 顺序（测试断言） |
| 11 | 15-02: Hero 与底部 CTA 复用同一主按钮视觉契约 | ✓ VERIFIED | `cta-button.tsx` 单组件双 variant；app-sections 测试断言底部 primary 与 Hero primary className 全等 |
| 12 | 15-03: 首屏可理解定位、payload 差异与主 CTA | ✓ VERIFIED* | 同 #1；getter-driven，JSX 零自由文案 |
| 13 | 15-03: 8 section 按锁定顺序渲染，仅 shipped 平台与真实 known limits | ✓ VERIFIED | `app.tsx:70-227` Hero→UseCases→Payload→Platforms→Flow→Trust→Limits→CTA；DOM 测试锁顺序；known limits 3 项（Telegram UAT / Feishu dropped / Nyquist partial）真实 |
| 14 | 15-03: 单 h1 + section h2，locale toggle/CTA/proof 可访问顺序 | ✓ VERIFIED | DOM 测试 "exactly one h1 and seven section-level h2"；toggle 为可见文字按钮、无 tabindex 负值、整页重渲染回归测试通过 |
| 15 | 15-04: smoke check 验证关键 section、proof label、CTA 入口而非仅 dist 存在 | ✓ VERIFIED | `verify-build.mjs` 17 项 `REQUIRED_PAGE_MARKERS` + SPA shell 断言；实跑 `pnpm site:verify` → `[verify:build] OK` |
| 16 | 15-04: 安装 CTA 的 README 路径经仓库内锚点校验 | ✓ VERIFIED | README.md:25 `## 安装` 存在；`verify-readme-anchors.ts:58-60` 锚点守卫；实跑 `pnpm verify:readme` OK |
| 17 | 15-04: Phase 15 必跑验证命令均有明确入口 | ✓ VERIFIED | lint/typecheck/test/test:i18n-coverage/site:build/site:verify/verify:readme/verify:manifest 全部存在且本次验证实跑通过 |

**Score:** 17/17 truths verified（* 标记项的视觉/真机维度转人工确认）

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | 隐私文案 "没有任何后台行为" 超出 PRIVACY.md 来源声明范围（REVIEW WR-06/IN-04，扩展实际存在 background SW + alarms） | Phase 16 | SC2: "claims / privacy / permissions checklist 通过，页面内容与 PRIVACY.md…一致" |
| 2 | verify:readme / site:build / site:verify 未接入 CI（REVIEW WR-03） | Phase 16 | Goal: "确保…维护流程都有可重复检查方式"；SC1 覆盖 marketing build/smoke 可重复执行 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/marketing/src/data/site-content.ts` | 8 section typed getter + truth 常量 | ✓ VERIFIED | 285 行，10 getter + 5 常量，含 `getHero`；被 app.tsx 消费（WIRED），数据来自 locale JSON（FLOWING） |
| `apps/marketing/src/i18n/locales/en.json` | marketing 英文 copy，含 `hero.title` | ✓ VERIFIED | 65 keys，无 placeholder，无 nextPhase 残留 |
| `apps/marketing/src/i18n/locales/zh_CN.json` | marketing 中文 copy，含 `hero.title` | ✓ VERIFIED | 65 keys，与 en 完全对齐 |
| `tests/unit/marketing/site-content.spec.ts` | 内容 truth 回归测试 | ✓ VERIFIED | 18 测试，断言平台白名单、payload 顺序、禁止词、CTA URL |
| `apps/marketing/src/components/section-shell.tsx` | banded section 容器 | ✓ VERIFIED | 显式 tone/width props，presentation-only；app.tsx 使用 7 次 |
| `apps/marketing/src/components/cta-button.tsx` | 共享 CTA 视觉契约 | ✓ VERIFIED | primary/secondary、min-h-44px、focus ring；Hero + 底部复用 |
| `apps/marketing/src/components/proof/asset-label.tsx` | mockup 徽标 + 元数据行 | ✓ VERIFIED | 渲染 label + source/status/version |
| `apps/marketing/src/components/proof/popup-mockup.tsx` | payload 证据 mockup，含 "mockup" | ✓ VERIFIED | figure + dl，字段顺序锁定，非 raw pre |
| `apps/marketing/src/components/proof/target-mockup.tsx` | chat 投递证据 mockup，含 "status" | ✓ VERIFIED | 全部文案经 props 注入，含显式投递状态行 |
| `apps/marketing/src/components/flow/stepper.tsx` | 三步 stepper，含 "step" | ✓ VERIFIED | tuple 类型固定 3 步，`<ol>` 语义 |
| `tests/unit/marketing/proof-labels.spec.tsx` | proof 元数据回归测试 | ✓ VERIFIED | 11 测试通过 |
| `apps/marketing/src/app.tsx` | 8-section 页面组装，含 "App" | ✓ VERIFIED | 248 行，全 getter 驱动，nextPhase 彻底移除（grep 0 命中） |
| `tests/unit/marketing/app-sections.spec.tsx` | section 顺序/CTA 回归测试，含 "h1" | ✓ VERIFIED | 12 测试通过 |
| `apps/marketing/scripts/verify-build.mjs` | 最终页面 smoke verifier，含 `assertBuildOutput` | ✓ VERIFIED | 17 markers + SPA shell 断言，对真实 dist 实跑 OK |
| `tests/unit/scripts/marketing-verify-build.spec.ts` | verifier 回归测试 | ✓ VERIFIED | 11 测试（3 文件系统 + 8 smoke）通过 |
| `README.md` | 安装锚点 `## 安装` | ✓ VERIFIED | 第 25 行，verify:readme 守卫存在 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| site-content.ts | locales/en.json | `t('…')` key lookup | ✓ WIRED | 全部 getter 走 t()，缺键由 spec parity 测试阻止 |
| site-content.spec.ts | site-content.ts | getter 断言 | ✓ WIRED | 18 测试直接调用 getter |
| popup-mockup.tsx | site-content.ts | payload/proof props | ✓ WIRED | app.tsx:143 `<PopupMockup payload={payload} meta={proofMeta} />` |
| cta-button.tsx | app.tsx | 共享 CTA 渲染 | ✓ WIRED | Hero（:83）+ 底部双按钮（:219-224）共 3 处 |
| app.tsx | site-content.ts | getter-driven render | ✓ WIRED | 10 getter 全部在 render 中消费 |
| verify-build.mjs | dist/index.html | smoke 断言 | ✓ WIRED | 实跑 site:build + site:verify OK |
| site-content.ts | README.md | INSTALL_URL `#%E5%AE%89%E8%A3%85` | ✓ WIRED | README `## 安装` 存在 + verify:readme 锚点守卫 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| app.tsx | hero/payload/platforms/trust/limits/cta 等 | site-content getter → locale JSON | 是（65 真实双语 keys，无空值/key 回退） | ✓ FLOWING |
| PopupMockup | `payload.fields` | getPayloadExample()（MDN 演示数据，D-11 锁定） | 是（deterministic 演示数据 + 可见 mockup 自我声明） | ✓ FLOWING |
| TargetMockup | `messageLines` | getTargetMockup()（复用 payload 常量 + t()） | 是 | ✓ FLOWING |
| locale toggle | `locale.value` | setLocale 动态 import zh_CN chunk | 是（dist 含独立 zh_CN chunk 4.05KB，整页重渲染回归测试通过） | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 全量单测 | `pnpm test` | 58 files / 499 tests passed | ✓ PASS |
| 类型检查 | `pnpm typecheck` | clean | ✓ PASS |
| Lint（含 no-hardcoded-strings） | `pnpm lint` | clean | ✓ PASS |
| i18n parity | `pnpm test:i18n-coverage` | 100%（107 keys） | ✓ PASS |
| 站点构建 | `pnpm site:build` | 成功（index 41.4KB + zh_CN chunk 4.05KB + css 18.4KB） | ✓ PASS |
| 最终页面 smoke gate | `pnpm site:verify` | `[verify:build] OK`（17 markers + SPA shell 全过） | ✓ PASS |
| README 锚点守卫 | `pnpm verify:readme` | OK（含 `## 安装` 锚点检查） | ✓ PASS |
| manifest 守卫回归 | `pnpm verify:manifest` | OK | ✓ PASS |

### Probe Execution

无 `scripts/*/tests/probe-*.sh` 约定 probe，4 份 PLAN/SUMMARY 均未声明 probe — SKIPPED（不适用）。

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MSG-01 | 15-01, 15-03 | Hero 传达结构化信息 + prompt 投递定位 | ✓ SATISFIED | hero.title/subtitle 双语 copy + DOM 测试 |
| MSG-02 | 15-01, 15-03 | 三大 use case（个人/团队/Agent） | ✓ SATISFIED | getUseCases 恰好 3 项，对应卡片渲染 |
| MSG-03 | 15-01, 15-03 | structured-payload 示例区分手动复制粘贴 | ✓ SATISFIED | PAYLOAD_FIELD_ORDER 6 字段 + "not copy-paste" 标题文案 |
| PROOF-01 | 15-01, 15-03 | 展示 4 个 shipped 平台 | ✓ SATISFIED | 平台 section + hero chips，白名单测试 + dist markers |
| PROOF-02 | 15-02, 15-03 | 三步核心流程 | ✓ SATISFIED | Stepper 固定 capture→target→send |
| PROOF-03 | 15-02, 15-03, 15-04 | 带 source/version 标注的产品证据 | ✓ SATISFIED | 双 mockup + AssetLabel 元数据行 + smoke marker（注：Phase 16 仍负责发布验收维度） |
| CTA-01 | 15-01..04 | 可找到源码仓库入口 | ✓ SATISFIED | REPO_URL 常量 → Hero + 底部 primary CTA，smoke marker 断言 |
| CTA-02 | 15-01..04 | 清晰的安装/获取路径 | ✓ SATISFIED | INSTALL_URL → README `## 安装` 锚点 + verify:readme 守卫 |
| TRUST-01 | 15-01, 15-03 | 隐私模型可理解 | ✓ SATISFIED | trust.privacy 6 条事实（措辞精确度问题 WR-06 由 Phase 16 checklist 收口） |
| TRUST-02 | 15-01, 15-03 | 生产权限模型无误导声明 | ✓ SATISFIED | permissions facts 与生产 wxt.config.ts 逐项一致（activeTab/alarms/scripting/storage/webNavigation + 4 个静态 host），locale 文件中无 `tabs`/`<all_urls>` 声明（grep 0 命中） |

ORPHANED 检查：REQUIREMENTS.md 映射到 Phase 15 的 10 个 ID 全部出现在 PLAN frontmatter 中，无 orphan。TRUST-03 映射 Phase 13/16，不属于本 phase。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/marketing/src/i18n/locales/{en,zh_CN}.json | 40 | 隐私文案全称断言超出 PRIVACY.md 来源（WR-06） | ⚠️ Warning | 字面可证伪的过度声明；Phase 16 claims checklist 收口（已 defer） |
| apps/marketing/src/main.tsx | 10-12 | locale 检测对 `zh-Hans-CN`/`zh` 失配（WR-05） | ⚠️ Warning | 部分简中用户默认落英文，可手动 toggle；不阻塞 phase goal |
| apps/marketing/src/app.tsx | 238-240 | locale 切换 promise 无 `.catch`（WR-07） | ℹ️ Info | chunk 加载失败时静默；核心交互降级路径缺失但非 goal 阻塞 |
| apps/marketing/scripts/verify-build.mjs | 48 | `'mockup'` marker 被 data-testid 恒真命中（WR-01） | ⚠️ Warning | smoke gate 对该 marker 守护力弱；gate 其余 16 项有效 |
| apps/marketing/scripts/verify-build.mjs | 36-59 | smoke markers 无 zh_CN 标记（WR-02） | ⚠️ Warning | 中文 chunk 丢失不会 fail；本次实测 chunk 存在 |
| apps/marketing/scripts/verify-build.mjs | 1 | 整文件 `eslint-disable`（IN-05） | ℹ️ Info | lint 盲区 |

调试标记扫描（TBD/FIXME/XXX/TODO/placeholder）：phase 全部修改文件 0 命中。`getNextPhase`/nextPhase 骨架残留：0 命中。

### Human Verification Required

#### 1. 首屏可理解性
**Test:** 浏览器打开页面查看首屏
**Expected:** 5 秒内理解核心价值、目标用户与主 CTA（SC1）
**Why human:** 信息层级与认知效果是视觉判断

#### 2. 响应式 + dark mode
**Test:** 320px / 768px / 桌面 + 系统 dark mode 浏览全页
**Expected:** 布局不溢出、卡片正确折叠、背景带交替在 dark 下仍清晰（SC4/SC5）
**Why human:** happy-dom 不做真实布局计算

#### 3. 键盘 tab 流与 locale 切换
**Test:** 纯键盘 Tab 遍历 + Enter 触发 locale toggle
**Expected:** 焦点环可见、顺序合理、整页切到中文且可切回
**Why human:** 焦点环渲染与真实 tab 顺序需真实浏览器

#### 4. 视觉风格一致性
**Test:** 对照 popup/options UI 检查 token 应用
**Expected:** 与现有项目风格一致（SC4）
**Why human:** 审美一致性判断

#### 5. CTA 外链落点
**Test:** 点击 Hero / 底部双 CTA
**Expected:** 到达 GitHub 仓库根与 README `## 安装` 锚点
**Why human:** GitHub 锚点实际跳转行为需真实浏览器

### Gaps Summary

无阻塞 gap。17/17 must-haves 在代码层全部验证通过：8-section 页面真实组装（非占位）、双语数据全链路流动、平台 truth 与 known limits 边界由测试与 smoke gate 双重锁定、安装/源码 CTA 经锚点守卫闭环、全部 9 条验证命令实跑通过（499/499 测试）。两项 REVIEW warning（隐私措辞超出来源、验证脚本未接 CI）经 ROADMAP 比对确认属 Phase 16 发布验收范围，列为 deferred。剩余 5 项为视觉/真机维度的人工确认项，故 status 为 human_needed。

---

_Verified: 2026-06-10_
_Verifier: Claude (gsd-verifier)_
