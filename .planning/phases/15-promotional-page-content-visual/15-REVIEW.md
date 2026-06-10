---
phase: 15-promotional-page-content-visual
reviewed: 2026-06-11T02:25:00Z
depth: deep
files_reviewed: 17
files_reviewed_list:
  - apps/marketing/scripts/verify-build.mjs
  - apps/marketing/src/app.tsx
  - apps/marketing/src/components/cta-button.tsx
  - apps/marketing/src/components/flow/stepper.tsx
  - apps/marketing/src/components/proof/asset-label.tsx
  - apps/marketing/src/components/proof/popup-mockup.tsx
  - apps/marketing/src/components/proof/target-mockup.tsx
  - apps/marketing/src/components/section-shell.tsx
  - apps/marketing/src/data/site-content.ts
  - apps/marketing/src/i18n/index.ts
  - apps/marketing/src/i18n/locales/en.json
  - apps/marketing/src/i18n/locales/zh_CN.json
  - scripts/verify-readme-anchors.ts
  - tests/unit/marketing/app-sections.spec.tsx
  - tests/unit/marketing/proof-labels.spec.tsx
  - tests/unit/marketing/site-content.spec.ts
  - tests/unit/scripts/marketing-verify-build.spec.ts
findings:
  critical: 0
  warning: 7
  info: 7
  total: 14
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-11T02:25:00Z
**Depth:** deep
**Files Reviewed:** 17
**Status:** issues_found

## Summary

对 Phase 15 营销落地页（Preact + Tailwind v4，apps/marketing 隔离 workspace）做了对抗性深度审查，含跨文件追踪：入口 `main.tsx` 的 locale 检测链、`wxt.config.ts` 生产 manifest 与 trust 文案的逐项比对、CI workflow 接线、真实 `dist/` 产物对 smoke gate 的实际覆盖验证。

实际执行验证：`pnpm typecheck` 干净、`pnpm lint` 干净、4 个相关测试文件 52 例全过、`verify-build.mjs` 与 `verify-readme-anchors.ts` 均 exit 0。

**核心结论：**
- 无 Critical 级缺陷。无 XSS / 注入 / 密钥泄露向量（页面只渲染静态 locale 字符串，Preact 自动转义；CTA 为常量 URL 同页跳转）。
- 隔离约束确认成立：marketing 源码零引用扩展运行时模块（`shared/`、`background/`、`entrypoints/` 均无交叉 import）。
- en/zh_CN key parity 确认成立（双向 key 集合一致，测试也锁定了该不变量）。
- 禁止性声明大体合规（无飞书支持声明、Telegram 带风险标注、权限事实与生产 manifest 逐项一致、无 `<all_urls>`/`tabs` 声明），但发现一处隐私文案**超出 PRIVACY.md 来源声明范围**（WR-06）。
- 主要问题集中在**验证门禁的实效性**：smoke gate 的 `mockup` 标记在真实产物上是恒真检查（WR-01）、门禁完全没有中文标记（WR-02）、且新增的两个验证脚本均未接入 CI（WR-03）。

## Warnings

### WR-01: smoke gate 的 `mockup` 标记在真实构建产物上恒真，无法检测证明标签被移除

**File:** `apps/marketing/scripts/verify-build.mjs:48`
**Issue:** `REQUIRED_PAGE_MARKERS` 中的 `'mockup'` 是子串匹配。真实 bundle 里 `data-testid="popup-mockup"`、`data-testid="target-mockup"`（popup-mockup.tsx:33 / target-mockup.tsx:29）永远包含 `mockup` 子串——即使 `proof.label` 文案被删、AssetLabel 整个被移除，该 marker 仍然命中。注释声称它守护 PROOF-03 / D-05（"self-declared mockup labeling"），实际守护不了任何东西。单元测试用合成 fixture 验证了"缺 marker 会报错"，但没有验证 marker 在真实产物上**可能失败**。同理，`'OpenClaw'`/`'Discord'` 等平台 marker 仅靠 hero chips（site-content.ts:133 硬编码）就能命中，平台 section 整体丢失也不会触发失败。
**Fix:** 用真实产物中唯一来源的字符串做 marker，例如用 `proof.status` 的完整文案 `'marketing demo aligned to current UI contract'` 和 `'source: code-generated'`（asset-label.tsx 模板字符串产物）替代裸 `'mockup'`：

```js
// Proof label (PROOF-03 / D-05) — full proof-meta copy, not the bare
// 'mockup' substring (which data-testid="popup-mockup" always satisfies)
'marketing demo aligned to current UI contract',
'code-generated',
```

### WR-02: smoke gate 不含任何 zh_CN 标记 — 中文 locale chunk 整体丢失时门禁照样通过

**File:** `apps/marketing/scripts/verify-build.mjs:36-59`
**Issue:** `REQUIRED_PAGE_MARKERS` 全部是英文文案 + URL。双语是本 phase 的硬性要求（en/zh_CN parity mandatory），但若打包回归导致 `zh_CN.json` 动态 chunk 没有进入产物（locale toggle 点了没反应），所有 marker 仍全部命中，`verify:build` 输出 OK。测试文件甚至专门写了 "locale chunk case"（markers split across chunks），却没有任何 marker 真正来自 zh_CN chunk。
**Fix:** 加入至少一条只存在于 zh_CN.json 的标记：

```js
// zh_CN locale chunk presence (bilingual parity is a hard requirement)
'抓取任意网页，一键投递到聊天。',
```

### WR-03: 两个新增验证门禁均未接入 CI — 守护的不变量实际无人执行

**File:** `.github/workflows/ci.yml:22`（关联 `package.json:29,34`）
**Issue:** `ci.yml` 与 `release.yml` 都只跑 `typecheck` / `lint` / `test` / `verify:manifest`（release 另有 zip 相关）。本 phase 新增的 `verify:readme`（守护 `## 安装` 锚点，防止 `INSTALL_URL` 死链——脚本注释自己写明 "If this heading is renamed or removed, the marketing install CTA dead-links"）与 `site:build` + `site:verify`（smoke gate）没有任何自动化入口执行。门禁存在但不在路径上：README 改个标题、营销构建坏掉，CI 全绿。
**Fix:** 在 `ci.yml` 的 verify job 末尾追加：

```yaml
      - run: pnpm verify:readme
      - run: pnpm site:build
      - run: pnpm site:verify
```

（若部署 phase 另有归属计划，至少先接 `verify:readme`——它零构建成本且守护已上线的 CTA 锚点。）

### WR-04: verify-build.mjs 直接调用守卫 fail-open — 路径比对失配时静默 exit 0

**File:** `apps/marketing/scripts/verify-build.mjs:133-134`
**Issue:** `fileURLToPath(import.meta.url) === resolve(process.argv[1])` 的字符串比对在符号链接路径、大小写不敏感文件系统（macOS 默认）下可能失配。失配时 `isDirectInvocation` 为 false，CLI 分支整体跳过，脚本**什么都不检查、不输出、exit 0**——验证门禁以"通过"的姿态静默失效。验证脚本的失败方向必须是 fail-closed（误报喧哗可接受，漏报静默不可接受）。
**Fix:** 用 `realpathSync` 归一化两侧，或比较 basename 兜底：

```js
import { realpathSync } from 'node:fs';
const self = realpathSync(fileURLToPath(import.meta.url));
const invoked = process.argv[1] ? realpathSync(resolve(process.argv[1])) : '';
const isDirectInvocation = invoked === self;
```

### WR-05: locale 检测对 `zh-Hans-CN` / `zh` 等中文标签失配，相当一部分中文用户默认落到英文

**File:** `apps/marketing/src/main.tsx:10-12`（跨文件追踪自 `i18n/index.ts` 的 `setLocale` 契约；main.tsx 不在显式审查清单中，但缺陷由 i18n 模块的 locale 命名契约直接导致）
**Issue:** `navigator.language.replace('-', '_')` 只替换第一个连字符，且与 `['en', 'zh_CN']` 做精确匹配。macOS Safari 的简体中文报 `zh-Hans-CN`（→ `zh_Hans-CN`，失配）；部分环境报 `zh` 或 `zh-SG`，同样失配。结果是这部分简体中文用户首屏看到英文，必须手动点 toggle——对一个以中文 README 为主仓库的项目，这是首要受众的默认体验回归。
**Fix:**

```ts
const lang = navigator.language.toLowerCase();
const detected = lang === 'zh' || lang.startsWith('zh-') ? 'zh_CN' : 'en';
```

（若需排除繁体可再判 `zh-tw`/`zh-hant`；当前只有简中文案，统一落 zh_CN 是合理默认。）

### WR-06: 隐私文案 "nothing happens in the background / 没有任何后台行为" 超出 PRIVACY.md 来源声明

**File:** `apps/marketing/src/i18n/locales/en.json:40`、`apps/marketing/src/i18n/locales/zh_CN.json:40`
**Issue:** site-content.ts:209 注明 "CLM-PRIVACY-01: facts sourced from PRIVACY.md only"。PRIVACY.md 的原始声明是 "We do not collect any data passively or in the background"（限定**数据收集**）。营销文案写成 "Capture runs only when you click the extension icon — nothing happens in the background." / "没有任何后台行为"——破折号后半句是无限定的全称断言，而扩展实际有 background service worker，投递期间会运行 `chrome.alarms` 超时调度（`background/dispatch-pipeline.ts:202`）。本 phase 的核心约束就是文案不得超出可证实事实，这条在字面上是可证伪的过度声明。
**Fix:** 把断言限定回数据收集范围，与 PRIVACY.md 对齐：

- en: `"Capture runs only when you click the extension icon — no passive or background data collection."`
- zh: `"仅在你主动点击扩展图标时抓取——没有任何被动或后台数据收集。"`

### WR-07: locale toggle 吞掉动态 import 失败 — 中文 chunk 加载失败时按钮静默无效

**File:** `apps/marketing/src/app.tsx:238-240`
**Issue:** `void setLocale(next).then(() => { locale.value = next; })` 没有 `.catch`。`setLocale('zh_CN')` 内部是 `await import('./locales/zh_CN.json')`（i18n/index.ts:13）——静态站点部署后 chunk 404 / 网络抖动都会让该 promise reject。当前实现下 rejection 被 `void` 吞掉：无 console 输出、无用户反馈、toggle 点了毫无反应且不可恢复（dictionaries 缓存未写入，下次点击重复同样的静默失败路径，但用户不知道发生了什么）。双语切换是页面核心交互，失败模式不应是完全静默。
**Fix:**

```ts
void setLocale(next)
  .then(() => { locale.value = next; })
  .catch((err) => { console.error('[web2chat] locale load failed:', err); });
```

## Info

### IN-01: 切换 locale 后文档级 `<html lang>` 与 `<title>` 仍是英文

**File:** `apps/marketing/src/app.tsx:69`（关联 `apps/marketing/index.html:2`）
**Issue:** `lang` 设在 App 根 `div` 上，能覆盖全部内容节点，但 `<html lang="en">` 与 `document.title`（"web2chat"）在切到 zh_CN 后保持英文——屏幕阅读器读 tab 标题、浏览器翻译提示均按 en 处理。
**Fix:** toggle 回调里同步 `document.documentElement.lang = next === 'zh_CN' ? 'zh-CN' : 'en'`。

### IN-02: `t()` 的 key 是裸 `string`，拼错 key 在运行时渲染原始 key 字符串且无编译期报错

**File:** `apps/marketing/src/i18n/index.ts:3,25-29`
**Issue:** `type LocaleKey = string` 不提供任何 key 安全；`dict[key] ?? key` 把 typo 直接渲染到页面。主仓库扩展侧用的是类型化 i18n（`@wxt-dev/i18n`），营销侧退化为无类型。现有测试覆盖了主要 getter，但新增 key 时无保护。
**Fix:** `type LocaleKey = keyof typeof en`（`resolveJsonModule` 已开启，零成本获得编译期校验）。

### IN-03: `extractH2Headings` 会把 fenced code block 内的 `## ` 行计入标题

**File:** `scripts/verify-readme-anchors.ts:36-42`
**Issue:** 按行前缀 `## ` 过滤，不跳过 ``` 围栏内容。当前两个 README 的代码块内恰好没有 `## ` 行（已验证），但任何一侧未来在示例代码/注释里出现 `## ` 都会造成 parity 误判（可能误报也可能掩盖真实失配）。另外第 83 行对 README.md 重复解析了一次。
**Fix:** 解析时维护 fence 状态位跳过围栏内行；复用第 45 行已计算的 `zhHeadings`。

### IN-04: zh_CN 隐私 fact4 译文比 PRIVACY 原文更强

**File:** `apps/marketing/src/i18n/locales/zh_CN.json:43`
**Issue:** "扩展不连接任何服务器" 强于 PRIVACY.zh_CN.md 的 "不会运营或与任何远程服务器通信"（en 版 fact4 与 PRIVACY 措辞一致）。扩展确实会让浏览器导航到 discord.com 等站点，"不连接任何服务器" 字面上更易被挑战。
**Fix:** 改为 "不运营任何远程服务器——扩展也不与任何远程服务器通信。"

### IN-05: verify-build.mjs 顶部整文件 `/* eslint-disable */`

**File:** `apps/marketing/scripts/verify-build.mjs:1`
**Issue:** 无限定的全量 lint 禁用会掩盖该文件未来的全部 lint 问题。仓库其他验证脚本（如 `scripts/verify-readme-anchors.ts`）没有此豁免。
**Fix:** 删除该行；若有特定规则冲突（如 console），按规则名局部禁用。

### IN-06: 含撇号的 marker 依赖 minifier 的引号选择

**File:** `apps/marketing/scripts/verify-build.mjs:40`
**Issue:** `"What it's for"` 在产物中若被 minifier 输出为单引号字符串会变成 `What it\'s for`，子串匹配失败。当前 Vite/esbuild 输出双引号（已对真实 dist 验证通过），失败方向是 fail-closed（误报），可接受但脆弱——构建链升级后可能出现伪失败。
**Fix:** 可在 marker 缺失报错信息中提示检查引号转义，或避免选用含撇号的文案做 marker。

### IN-07: zh_CN getter 测试在断言失败时泄漏 locale 状态

**File:** `tests/unit/marketing/site-content.spec.ts:222-227`
**Issue:** `await setLocale('en')` 写在测试体末尾，前面的断言一旦失败就不会执行——模块级 `currentLocale` 残留 zh_CN，可能让同文件后续（或同进程其他文件）测试出现连锁误报，干扰失败诊断。`app-sections.spec.tsx` 用 `afterEach` 处理了同样的问题，本文件没有。
**Fix:** 改用 `afterEach(async () => { await setLocale('en'); })`。

---

_Reviewed: 2026-06-11T02:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
