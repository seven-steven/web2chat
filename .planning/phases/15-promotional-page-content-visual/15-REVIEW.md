---
phase: 15-promotional-page-content-visual
reviewed: 2026-06-12T16:32:53Z
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
  warning: 9
  info: 10
  total: 19
status: issues_found
re_review_scope:
  date: 2026-06-12T16:32:53Z
  trigger: Phase 15-05 gap-closure (commits 346c07f + 6a969e1, 2026-06-13)
  files_focused:
    - apps/marketing/src/app.tsx
    - apps/marketing/src/components/cta-button.tsx
    - tests/unit/marketing/app-sections.spec.tsx
  prior_review_date: 2026-06-11T02:25:00Z
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-11T02:25:00Z（主审查）；2026-06-12T16:32:53Z（15-05 收尾复审，见文末补充章节）
**Depth:** deep
**Files Reviewed:** 17（主审查）；3（15-05 复审聚焦）
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

### WR-08: 声称的无障碍 `lang` 属性契约完全没有测试覆盖（15-05 复审新增）

**File:** `apps/marketing/src/app.tsx:55,69`（实现）；`tests/unit/marketing/app-sections.spec.tsx:131-144`（缺断言）
**Issue:** 15-05 复审确认 `langAttr` 已实现并写入根 `<div lang={...}>`（这是屏幕阅读器依赖的无障碍契约）。但 15-05 新增/改动的 toggle 测试只断言了 `h1`/`h2` 文案切换，**从未断言根节点 `lang` 属性被正确更新**。即"切到 zh_CN 后根元素应为 `lang="zh-CN"`"既无正向测试也无回归保护——误删 `langAttr` 或写错映射时测试全绿但无障碍语义已破。这是 15-05 "locale 切换重渲染整页"声称的覆盖盲点，与 IN-01 互补（IN-01 指文档级 `<html lang>` 没同步，WR-08 指组件级 `lang` 也没有测试守护）。
**Fix:** 在 toggle 测试末尾追加：
```tsx
const root = container.firstElementChild as HTMLElement;
expect(root.getAttribute('lang')).toBe('zh-CN');
```
并在初始 en 渲染下补 `expect(root.getAttribute('lang')).toBe('en')`。

### WR-09: CTA 外链 `target="_blank"` 缺乏视觉/语义外链指示（15-05 复审新增）

**File:** `apps/marketing/src/components/cta-button.tsx:46-52`
**Issue:** 15-05 的 `6a969e1` 给所有 CTA 加了 `target="_blank" rel="noopener noreferrer"`（安全侧正确，防止 reverse tabnabbing）。但链接现在会在新标签页打开，却**没有任何视觉或可访问性指示**告知用户这是外链行为（无外链图标、无 `aria-label`/visually-hidden "opens in new tab" 提示）。WCAG 2.1 SC G201 建议提前告知用户链接会打开新窗口，否则对屏幕阅读器用户是意外上下文切换。当前三个 CTA（hero primary + footer primary/secondary）全部静默新开。
**Fix:** 二选一：
- 视觉：在文案后加一个 `aria-hidden` 外链图标 svg。
- 可访问性最小：加 `aria-label` 或 visually-hidden 提示，例如：
```tsx
<a href={href} target="_blank" rel="noopener noreferrer" ...>
  {children}
  <span class="sr-only"> (opens in a new tab)</span>
</a>
```
（注：测试在 `app-sections.spec.tsx:190` 断言 `link?.textContent).toBe(label)`，加 sr-only 文案需同步更新断言为 `toContain(label)`，否则 RED。）

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

### IN-08: `flowTuple()` 每次渲染重算且错误信息缺少定位上下文（15-05 复审新增）

**File:** `apps/marketing/src/app.tsx:46-50`
**Issue:** `flowTuple()` 每次渲染都调用 `getFlowSteps()` 并做 `[s1,s2,s3]` 解构 + 守卫抛错。逻辑正确（PROOF-02 锁定 3 步），但抛出的 `Error('expected exactly 3 flow steps')` 没有附带实际步数，调试定位成本略高；每次 render 重算的性能影响可忽略（v1 范围非缺陷）。
**Fix:** 可选地把步数写进错误信息：`throw new Error(\`expected exactly 3 flow steps, got ${getFlowSteps().length}\`)`。

### IN-09: `lang="zh-CN"` 使用了 IANA 已弃用的 region 子标签（15-05 复审新增）

**File:** `apps/marketing/src/app.tsx:55`
**Issue:** `const langAttr = locale.value === 'zh_CN' ? 'zh-CN' : 'en';` 中 `zh-CN` 是合法且常见的 BCP-47 标签，但 IANA 已将其标记为 deprecated，推荐使用 script 子标签 `zh-Hans`（简体中文）。不影响功能，纯规范优化项。
**Fix:** 若追求规范可改为 `zh-Hans`；保持现状也可接受。

### IN-10: `main.tsx` 与 `app.tsx` toggle 的"先加载字典再翻 signal"顺序相反（15-05 复审新增）

**File:** `apps/marketing/src/main.tsx:9-16` 对照 `apps/marketing/src/app.tsx:234-241`
**Issue:** `main.tsx` 的 `init()` 先 `locale.value = detected`（同步翻 signal）**再** `await setLocale(detected)`，最后才 `render`；因为 render 在 await 之后，首次渲染读到的是已加载字典，行为正确。而 `app.tsx` 的 toggle 是先 `await setLocale` 再翻 signal（刻意修复 stale-dictionary bug）。两处顺序相反但各自正确（一个是首次同步初始化、一个是运行时切换）。仅作记录，提示后续维护者不要在抽公共函数时搞反顺序。
**Fix:** 无需改动；如抽取公共 `switchLocale(signal, next)`，须采用 toggle 的"先 setLocale 后翻 signal"顺序。

---

## Phase 15-05 Gap-Closure 复审（2026-06-12T16:32:53Z）

> 本节是对 Phase 15-05 收尾改动（commits `346c07f` "test(15-05): add failing CTA external-link regression" + `6a969e1` "fix(15-05): harden marketing CTA links"，均 2026-06-13）的针对性复审，聚焦三件事：CTA 外链语义、可选 `testId` prop、营销视觉柔化、回归测试。主审查（上文）早于这两次提交，故本节为增量。

### 复审范围

聚焦文件（均为本次复审实测）：
- `apps/marketing/src/app.tsx`（CTA 接入 testId、locale toggle、视觉柔化）
- `apps/marketing/src/components/cta-button.tsx`（新增 `testId?` prop、`target="_blank"` + `rel="noopener noreferrer"`）
- `tests/unit/marketing/app-sections.spec.tsx`（新增 CTA 外链语义回归测试）

### 15-05 改动逐项验证结论

1. **CTA 外链语义 — 安全侧正确。** `cta-button.tsx:46-52` 现渲染 `<a target="_blank" rel="noopener noreferrer" data-testid={testId}>`。`rel="noopener noreferrer"` 同时阻断 reverse tabnabbing（`opener`）与 Referer 泄漏（`noreferrer`），对常量 GitHub URL 是恰当且无遗漏的。三个 CTA（hero primary + footer primary/secondary）全部走该组件，无遗漏点（已 `grep <CtaButton` 确认 app.tsx 内仅 3 处使用且全部传 testId）。
2. **可选 `testId` prop — 实现正确，无 DOM 泄漏。** `testId?: string`，未传时 Preact 实测省略 `data-testid` 属性（happy-dom 内联验证：`render(<a data-testid={undefined}>)` 产物 `<a href="#">`，无空属性）。不会污染 QA 选择器。
3. **回归测试 — 实测全绿。** `npx vitest run tests/unit/marketing/app-sections.spec.tsx` 13 例全过（402ms），含 15-05 新增的 "hero and bottom CTAs expose explicit external-link semantics and stable hooks"（spec:174-192），逐 CTA 断言 `href`/`target`/`rel`/`label`，契约锁到位。
4. **INSTALL_URL 锚点编码 — 正确。** `site-content.ts:9` 的 `%E5%AE%89%E8%A3%85` 经 `decodeURIComponent` 解出 "安装"，与 `encodeURIComponent('安装')` 输出一致；锚点在 GitHub README 上有效。
5. **locale key parity — 仍 100%。** en/zh_CN 各 63 键，双向集合一致（node 脚本比对，缺失列表均为空）。

### 15-05 复审新增发现

经 15-05 复审发现 2 个 WARNING（WR-08 无障碍 `lang` 属性无测试、WR-09 CTA 外链缺视觉/语义指示）与 3 个 INFO（IN-08/IN-09/IN-10，均非缺陷），已分别并入上方 Warnings / Info 段。无新增 Critical。

### 额外观察（非评审文件范围，供 orchestrator 参考）

**CLAUDE.md §约定 与 `wxt.config.ts` production manifest 不一致：** CLAUDE.md 写"只声明 `activeTab` + `scripting` + `storage`"，但 `wxt.config.ts` production 分支实际声明 `['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation']`（多了 `alarms`、`webNavigation`，与 CLAUDE.md 架构章节用 `chrome.alarms`/`webNavigation` 的描述一致）。营销页 trust 文案 `trust.permissions.fact1`（`en.json:47`）"Production permissions: activeTab, alarms, scripting, storage, webNavigation" 与**实际 manifest 一致**，因此营销文案诚实——是 CLAUDE.md 规范落后于实现。此项**不计入营销代码缺陷**，建议 orchestrator 同步更新 CLAUDE.md §约定的权限清单。

---

_Reviewed: 2026-06-11T02:25:00Z（主审查）+ 2026-06-12T16:32:53Z（15-05 复审）_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
