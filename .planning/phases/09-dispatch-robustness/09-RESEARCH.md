# Phase 9: 投递鲁棒性 - Research

**Researched:** 2026-05-10  
**Domain:** Chrome MV3 dispatch pipeline robustness, adapter registry contracts, popup retry/confirmation UX  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

## Implementation Decisions

### 超时策略

- **D-111:** Registry entry 支持 per-platform timeout override，但现有 `mock` / `openclaw` / `discord` 先继承统一默认值：`dispatchTimeoutMs = 30_000`，`adapterResponseTimeoutMs = 20_000`。
- **D-112:** `dispatchTimeoutMs` 必须满足 Chrome alarms 生产约束：小于 `30_000` 的配置应通过构建或单元测试失败暴露，而不是运行时静默取整。
- **D-113:** `adapterResponseTimeoutMs` 继续用 `Promise.race` + `setTimeout` 包裹单次 `chrome.tabs.sendMessage` 等待；它不承担跨 MV3 service worker 生命周期恢复，只有配置值迁入 registry。
- **D-114:** dispatch 总超时和 adapter response 超时对用户统一表现为 `TIMEOUT` + `retriable: true`。内部 diagnostic message 可以区分 timeout 来源；不要为 adapter response 新增用户可见错误码。

### 登录识别

- **D-115:** `loggedOutPathPatterns` 使用简单路径模式（`string[]`），只在 adapter host 内匹配 `URL.pathname`；不要在 Phase 9 引入 RegExp / URLPattern 风格的复杂表达式。
- **D-116:** Phase 9 后，pipeline 不再把“同 host 但 `!adapter.match(actualUrl)`”泛化解释为登录跳转。只有 `actualUrl` 命中 `loggedOutPathPatterns` 才 remap 为 `NOT_LOGGED_IN`。
- **D-117:** 未配置 `loggedOutPathPatterns` 的平台不做 URL 层登录 remap，只保留 adapter 自己返回的错误。OpenClaw / 自部署 URL 不应被 host/path 形态误判为 logged out。
- **D-118:** tabs complete、SPA history update、adapter timeout / `sendMessage` failure、`INPUT_NOT_FOUND` remap 都调用同一个登录 URL 检测 helper，避免多处判断漂移。

### 重试语义

- **D-119:** Retry 使用当前 SendForm 中的 `send_to`、`prompt`、以及用户当前编辑后的 snapshot fields 生成新的 `dispatchId` 并调用 `dispatch.start`。这允许用户修正内容后直接重试。
- **D-120:** Retry 按钮显示条件以 dispatch error 的 `retriable` 为准；ErrorCode 只决定 i18n 文案。不要继续让 hard-coded `RETRIABLE_CODES` 成为最终语义来源。
- **D-121:** 用户点击 Retry 后立即清除当前错误，创建新 active dispatch，显示 `InProgressView`。成功沿用现有关闭 popup 行为；失败回到 SendForm + ErrorBanner。
- **D-122:** Retry 前清掉旧 active/error，再写入新的 active dispatchId。旧失败 record 可留在 `chrome.storage.session` 供诊断，但不得继续驱动 popup UI。

### 低置信度提示

- **D-123:** 低置信度 selector 命中时必须在发送前确认；确认前 adapter 不能执行 send，避免误发到第三方 IM。
- **D-124:** 协议采用“两次 dispatch”模型：adapter 第一次返回 `SELECTOR_LOW_CONFIDENCE` warning 且不发送；popup 展示确认；用户确认后以新 `dispatchId` 和一次性 confirmed flag 重走 `dispatch.start`。
- **D-125:** tier1 ARIA/role 和 tier2 `data-*` selector 正常发送；tier3 class fragment selector 触发 `SELECTOR_LOW_CONFIDENCE`。
- **D-126:** 用户确认低置信度 selector 只对当前一次 dispatch 生效，不保存到历史、binding 或后续 popup session。
- **D-127:** `SELECTOR_LOW_CONFIDENCE` 是 warning，不是 ErrorCode。Dispatch result 需要支持可选 `warnings` 数组或等价 warning channel；ErrorCode 仍用于失败语义。

### Claude's Discretion

- Timeout helper / registry 默认值的具体命名、文件位置、测试拆分交给 planner；但必须保持 D-111..D-114 的行为。
- `loggedOutPathPatterns` 的精确路径匹配语义（精确 vs prefix 标记方式）交给 planner，只要保持简单、可读、可测且仅匹配 pathname。
- Low-confidence confirmation UI 的具体视觉样式、focus 管理和 i18n key 命名交给 UI planner；但必须是发送前确认。

### Deferred Ideas (OUT OF SCOPE)

## Deferred Ideas

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSPT-01 | 投递超时参数移入 `AdapterRegistryEntry`（`dispatchTimeoutMs` / `adapterResponseTimeoutMs`），`dispatch-pipeline.ts` 从 registry 读取而非使用硬编码常量 | Registry extension point exists in `shared/adapters/types.ts` and current hard-coded alarm timeout exists in `background/dispatch-pipeline.ts`; Chrome alarms official docs require respecting a 30s minimum for sub-minute alarms. [VERIFIED: codebase Read `shared/adapters/types.ts`, `background/dispatch-pipeline.ts`; CITED: developer.chrome.com/docs/extensions/reference/api/alarms] |
| DSPT-02 | 登录检测从 Discord 硬编码泛化为 `AdapterRegistryEntry` 的 `loggedOutPathPatterns` 可选字段，pipeline 层 URL 对比检测使用此配置 | Current pipeline remaps same-host non-match URLs to `NOT_LOGGED_IN` in multiple places; registry has adapter-owned metadata pattern suitable for adding logged-out paths. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`, `shared/adapters/registry.ts`] |
| DSPT-03 | Popup 投递失败时对 `retriable: true` 的错误显示“重试”按钮，重试复用 `dispatch.start` 路径（新 `dispatchId`，同 payload） | `Result` and `DispatchRecord.error` already carry `retriable`; current `ErrorBanner` uses hard-coded `RETRIABLE_CODES`, and `SendForm.handleConfirm` already constructs fresh payload from current form values. [VERIFIED: codebase Read `shared/messaging/result.ts`, `shared/storage/repos/dispatch.ts`, `entrypoints/popup/components/ErrorBanner.tsx`, `SendForm.tsx`] |
| DSPT-04 | 适配器选择器使用分层置信度（tier1 ARIA / tier2 data-attr / tier3 class fragment），低置信度时在响应中附加 `SELECTOR_LOW_CONFIDENCE` 警告并显示给用户 | Discord adapter and selector fixture already model the three selector tiers; `Result` currently lacks a warning channel, so Phase 9 must add a protocol-compatible warning path. [VERIFIED: codebase Read `entrypoints/discord.content.ts`, `tests/unit/adapters/discord-selector.spec.ts`, `shared/messaging/result.ts`] |
</phase_requirements>

## Summary

Phase 9 should be planned as a contract-hardening refactor around the existing Phase 8 registry architecture, not as a rewrite of dispatch. [VERIFIED: codebase Read `shared/adapters/types.ts`, `shared/adapters/registry.ts`, `background/dispatch-pipeline.ts`] The central move is to promote platform-specific operational policy—timeouts, logged-out path detection, and selector warning behavior—into registry/type contracts, while keeping the service worker as a stateless coordinator that reads state from `chrome.storage.session`. [VERIFIED: codebase Read `CLAUDE.md`, `shared/storage/repos/dispatch.ts`; CITED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle]

The highest-risk design tension is D-113: project context locks in `Promise.race` + `setTimeout` for single `chrome.tabs.sendMessage` response timeout, while existing `tests/unit/dispatch/dispatch-timeout.spec.ts` currently asserts the opposite (“no setTimeout” and no `ADAPTER_RESPONSE_TIMEOUT_MS`). [VERIFIED: codebase Read `09-CONTEXT.md`, `tests/unit/dispatch/dispatch-timeout.spec.ts`] Planner must schedule that test rewrite deliberately and constrain `setTimeout` to the immediate `sendMessage` promise wrapper only, not any cross-event service-worker delay. [CITED: developer.chrome.com/docs/extensions/develop/migrate/to-service-workers]

**Primary recommendation:** Add small typed helpers (`resolveAdapterTimeouts`, `assertValidDispatchTimeout`, `isLoggedOutUrlForAdapter`, `hasSelectorLowConfidenceWarning`) and route all Phase 9 behavior through them; avoid scattering conditionals in popup or pipeline. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`, `entrypoints/popup/components/SendForm.tsx`]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Per-platform timeout policy | API / Backend equivalent: Extension service worker | Shared registry | The SW owns dispatch orchestration/alarm creation; registry owns platform policy metadata consumed by SW and tests. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`, `shared/adapters/registry.ts`] |
| Adapter response timeout | Extension service worker | Content adapter | The SW waits for `chrome.tabs.sendMessage`; adapter only responds or hangs/fails. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`, `entrypoints/discord.content.ts`] |
| Logged-out URL remap | Extension service worker | Adapter registry | Only SW can reliably compare target URL, actual tab URL, registry host/path metadata, and adapter response remap. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`] |
| DOM login wall detection | Content adapter | Shared adapter helpers | DOM-only login markers live in page context; existing Discord `detectLoginWall()` already runs inside content adapter. [VERIFIED: codebase Read `entrypoints/discord.content.ts`, `shared/adapters/discord-login-detect.ts`] |
| Retry UX | Browser / Popup client | Extension service worker | Popup owns user action and current edited form values; SW receives a fresh `dispatch.start` with new `dispatchId`. [VERIFIED: codebase Read `SendForm.tsx`, `App.tsx`, `dispatch-pipeline.ts`] |
| Selector confidence | Content adapter | Popup client | Adapter is the only tier that knows which DOM selector tier matched; popup owns pre-send confirmation UI. [VERIFIED: codebase Read `entrypoints/discord.content.ts`, `tests/unit/adapters/discord-selector.spec.ts`] |
| Warning protocol | Shared messaging/storage contract | Popup + SW + adapter | Warning must cross content script → SW → storage/popup boundaries without becoming an `ErrorCode`. [VERIFIED: codebase Read `shared/messaging/result.ts`, `shared/messaging/routes/dispatch.ts`, `shared/storage/repos/dispatch.ts`] |

## Project Constraints (from CLAUDE.md)

- Use WXT 0.20.x, Preact 10.29, TypeScript, `@wxt-dev/i18n`, zod, typed WXT storage, Vitest fake-browser, and Playwright E2E. [VERIFIED: codebase Read `CLAUDE.md`; VERIFIED: npm registry]
- Do not use Plasmo, `webextension-polyfill`, `i18next`, static `<all_urls>` host permissions, `localStorage`, or `innerText=` / `document.execCommand` for editor injection. [VERIFIED: codebase Read `CLAUDE.md`]
- Service worker event listeners must be registered synchronously at module top level; service-worker state must be persisted/read inside handlers rather than kept in module globals; cross-event scheduling uses `chrome.alarms`, not service-worker timers. [VERIFIED: codebase Read `CLAUDE.md`; CITED: developer.chrome.com/docs/extensions/develop/migrate/to-service-workers]
- Adapter pattern is mandatory: each platform has `entrypoints/<platform>.content.ts` implementing shared adapter behavior; dispatch core must not hard-code platform DOM logic. [VERIFIED: codebase Read `CLAUDE.md`, `shared/adapters/types.ts`]
- User-visible strings must use `t(...)`; `en` and `zh_CN` locale files must keep 100% key coverage. [VERIFIED: codebase Read `CLAUDE.md`, `package.json` script `test:i18n-coverage`]
- Adapter selectors must be validated on committed DOM fixtures under `tests/unit/adapters/<platform>.fixture.html`, not live sites. [VERIFIED: codebase Read `CLAUDE.md`, `tests/unit/adapters/discord-selector.spec.ts`]
- Privacy constraint: captured URL/title/description/content/prompt stay local and are sent only by user-initiated browser navigation/injection; no telemetry or third-party upload. [VERIFIED: codebase Read `CLAUDE.md`]
- GSD workflow is active; Phase 9 planning must produce atomic TDD tasks and run available tests automatically. [VERIFIED: codebase Read `CLAUDE.md`, `.planning/config.json`]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.25; npm modified 2026-04-18 | Chrome MV3 extension framework, entrypoints, WXT testing plugin | Project standard and current installed dependency. [VERIFIED: npm registry; VERIFIED: codebase Read `package.json`] |
| TypeScript | ^5.6.0 installed; latest npm package not rechecked because phase changes are code-contract focused | Typed registry, zod schemas, popup/SW contracts | Existing codebase uses strict TypeScript patterns for shared contracts. [VERIFIED: codebase Read `package.json`, `shared/adapters/types.ts`] |
| Preact | 10.29.1; npm modified 2026-04-03 | Popup retry and confirmation UI | Existing popup is Preact and signal-based. [VERIFIED: npm registry; VERIFIED: codebase Read `App.tsx`, `SendForm.tsx`] |
| zod | Installed ^3.24.0; latest npm is 4.4.3 as of 2026-05-04 | Runtime schema for messaging routes | Existing route schemas use zod v3-style APIs; do not upgrade in this phase. [VERIFIED: npm registry; VERIFIED: codebase Read `shared/messaging/routes/dispatch.ts`, `package.json`] |
| Vitest | Installed 3.2.4; latest npm is 4.1.5 as of 2026-05-05 | Unit tests for registry/pipeline/popup behavior | Project has extensive Vitest unit coverage and `vitest.config.ts` includes unit specs. [VERIFIED: npm registry; VERIFIED: codebase Read `vitest.config.ts`] |
| Playwright | 1.59.1; npm modified 2026-05-10 | Existing headed extension E2E | E2E exists but requires headed Chromium for unpacked extension tests. [VERIFIED: npm registry; VERIFIED: codebase Read `playwright.config.ts`] |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| Chrome `alarms` API | Chrome 120+ supports 30s minimum interval/delay | Dispatch total timeout backstop that can wake extension service worker | Use for cross-event dispatch timeout only; validate `dispatchTimeoutMs >= 30_000`. [CITED: developer.chrome.com/docs/extensions/reference/api/alarms] |
| Chrome `tabs` / `scripting` / `webNavigation` APIs | Browser-provided | Open/activate target tab, inject adapter bundle, observe SPA navigation | Keep existing pipeline pattern; do not introduce platform-specific DOM code in SW. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`, `entrypoints/background.ts`] |
| `chrome.storage.session` via typed repos | Browser-provided + project wrapper | Active dispatch/error/warning state | Store warning-confirmation records where popup can resume after close/reopen. [VERIFIED: codebase Read `shared/storage/repos/dispatch.ts`, `App.tsx`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Registry-owned timeout fields | Constants in `dispatch-pipeline.ts` | Constants are the current state and fail DSPT-01 because new platforms cannot override timeouts without pipeline edits. [VERIFIED: codebase Read `dispatch-pipeline.ts`; VERIFIED: requirements `DSPT-01`] |
| `loggedOutPathPatterns: string[]` | RegExp / URLPattern | Context locks simple `string[]`; regex would exceed D-115 and increase planner/test complexity. [VERIFIED: codebase Read `09-CONTEXT.md`] |
| Warning channel | New `ErrorCode` | Context locks `SELECTOR_LOW_CONFIDENCE` as warning, not failure; new error code would violate D-127. [VERIFIED: codebase Read `09-CONTEXT.md`] |
| SW auto-retry queue | Popup-driven retry | Project state locks popup-driven retry to avoid MV3 lifecycle problems. [VERIFIED: codebase Read `.planning/STATE.md`] |

**Installation:** No new packages should be installed for Phase 9. [VERIFIED: codebase dependency audit]

```bash
# no npm install / pnpm add needed
```

**Version verification:** `npm view` confirmed: `wxt@0.20.25`, `preact@10.29.1`, `@wxt-dev/i18n@0.2.5`, `@playwright/test@1.59.1`; npm latest for `vitest` is 4.1.5 and `zod` is 4.4.3, but installed project versions remain the planning target. [VERIFIED: npm registry; VERIFIED: codebase Read `package.json`]

## Architecture Patterns

### System Architecture Diagram

```text
Popup SendForm
  ├─ Confirm / Retry / Confirm low-confidence
  │     └─ builds current payload + new dispatchId (+ optional selectorConfirmation)
  │           ↓ dispatch.start
  ↓
Service Worker dispatch-pipeline
  ├─ findAdapter(send_to) from registry
  ├─ resolve registry timeout policy
  ├─ persist dispatch:<id> + dispatchActive in chrome.storage.session
  ├─ open/activate target tab
  ├─ chrome.alarms total timeout backstop
  ├─ tabs.onUpdated / webNavigation SPA complete
  │     └─ isLoggedOutUrlForAdapter(actualUrl, adapter)
  ├─ executeScript(adapter.scriptFile)
  └─ Promise.race(sendMessage(ADAPTER_DISPATCH), adapterResponseTimeout)
          ↓
Content adapter
  ├─ URL / DOM login guard
  ├─ selector tier detection
  │     ├─ tier1/tier2: compose + send
  │     └─ tier3 without confirmed flag: return warning, do not send
  └─ response { ok | error | warnings }
          ↓
Service Worker
  ├─ success: history/binding + clear active
  ├─ retriable error: store error.retriable
  └─ low-confidence warning: store warning state + clear/keep active according to UI contract
          ↓
Popup
  ├─ error.retriable: Retry button
  └─ SELECTOR_LOW_CONFIDENCE: confirmation prompt before second dispatch
```

### Recommended Project Structure

```text
shared/
├── adapters/
│   ├── types.ts                 # extend AdapterRegistryEntry and adapter warning types
│   ├── registry.ts              # default timeouts + loggedOutPathPatterns per entry
│   └── selector-confidence.ts   # pure selector tier/warning type helpers if shared
├── messaging/
│   ├── result.ts                # optional warning channel type or dispatch-specific warning type
│   └── routes/dispatch.ts       # optional one-shot selector confirmation flag schema
└── storage/repos/dispatch.ts    # optional warnings on DispatchRecord

background/
└── dispatch-pipeline.ts         # use timeout + logged-out helpers; no platform DOM logic

entrypoints/
├── discord.content.ts           # report selector tier; do not send on tier3 unless confirmed
└── popup/
    ├── App.tsx                  # carry retriable + warning state from dispatch records
    └── components/
        ├── SendForm.tsx         # retry/confirm reuse current form payload
        ├── ErrorBanner.tsx      # retry visible from retriable prop
        └── SelectorWarning*.tsx # optional focused confirmation component

tests/unit/
├── dispatch/timeout-config.spec.ts
├── dispatch/logged-out-paths.spec.ts
├── dispatch/adapter-response-timeout.spec.ts
├── popup/retry-retriable.spec.tsx
└── adapters/discord-selector.spec.ts
```

### Pattern 1: Registry-owned operational policy

**What:** Extend `AdapterRegistryEntry` with optional policy fields plus default resolver so all current platforms inherit D-111 values. [VERIFIED: codebase Read `shared/adapters/types.ts`, `09-CONTEXT.md`]  
**When to use:** Any dispatch behavior that differs by platform but is not DOM implementation detail. [VERIFIED: codebase Read `shared/adapters/registry.ts`]  
**Example:**

```typescript
// Source: codebase-verified pattern from shared/adapters/types.ts + D-111/D-115
type AdapterTimeouts = {
  dispatchTimeoutMs?: number;
  adapterResponseTimeoutMs?: number;
};

type AdapterRegistryEntry = ExistingEntry & AdapterTimeouts & {
  loggedOutPathPatterns?: readonly string[];
};
```

### Pattern 2: One helper for logged-out URL detection

**What:** Replace every `same host && !adapter.match(actualUrl)` remap with `isLoggedOutUrlForAdapter(adapter, actualUrl)`. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`; VERIFIED: context D-116..D-118]  
**When to use:** `tabs.onUpdated`, SPA history update, `sendMessage` receiving-end failure, adapter response timeout diagnostics, and `INPUT_NOT_FOUND` remap. [VERIFIED: codebase Read `background/dispatch-pipeline.ts`; VERIFIED: context D-118]  
**Example:**

```typescript
// Source: D-115..D-118 + current isOnAdapterHost helper in dispatch-pipeline.ts
function isLoggedOutUrlForAdapter(adapter: AdapterRegistryEntry, actualUrl: string): boolean {
  if (!adapter.loggedOutPathPatterns?.length) return false;
  if (!isOnAdapterHost(adapter, actualUrl)) return false;
  const { pathname } = new URL(actualUrl);
  return adapter.loggedOutPathPatterns.some((pattern) => pathMatches(pattern, pathname));
}
```

### Pattern 3: Retriable controls UI, code controls copy

**What:** Preserve error i18n switch by `ErrorCode`, but pass `retriable` into `ErrorBanner` and make it the only retry visibility condition. [VERIFIED: codebase Read `ErrorBanner.tsx`, `shared/messaging/result.ts`; VERIFIED: context D-120]  
**When to use:** Popup dispatch error rendering from both immediate `dispatch.start` errors and stored dispatch records. [VERIFIED: codebase Read `App.tsx`, `SendForm.tsx`]  
**Example:**

```typescript
// Source: codebase Result/ErrorBanner contract + D-120
<ErrorBanner
  code={dispatchError.code}
  retriable={dispatchError.retriable}
  onRetry={dispatchError.retriable ? retryCurrentForm : undefined}
  onDismiss={clearDispatchError}
/>
```

### Pattern 4: Warning-driven two-dispatch selector confirmation

**What:** Adapter returns `SELECTOR_LOW_CONFIDENCE` warning and does not send on tier3 unless the dispatch input carries a one-shot confirmation flag. [VERIFIED: context D-123..D-127; VERIFIED: codebase Read `discord.content.ts`]  
**When to use:** Discord tier3 class-fragment fallback in Phase 9; future Slack/Telegram/Feishu adapters can reuse the same contract. [VERIFIED: requirements DSPT-04, SLK/TG/FSL requirements]

```typescript
// Source: D-124/D-127; existing dispatch.start zod schema in shared/messaging/routes/dispatch.ts
const DispatchStartInputSchema = z.object({
  dispatchId: z.string().uuid(),
  send_to: z.string().url().max(2048),
  prompt: z.string().max(10_000),
  snapshot: ArticleSnapshotSchema,
  selectorConfirmation: z.object({ warning: z.literal('SELECTOR_LOW_CONFIDENCE') }).optional(),
});
```

### Anti-Patterns to Avoid

- **Silent timeout coercion:** Do not round `dispatchTimeoutMs < 30_000` up to 30s; fail tests/build instead. [VERIFIED: context D-112; CITED: developer.chrome.com/docs/extensions/reference/api/alarms]
- **Global login remap by adapter non-match:** Do not treat every host/path mismatch as logged out; OpenClaw/self-hosted URLs can be valid but non-standard. [VERIFIED: context D-116/D-117]
- **Warning as ErrorCode:** Do not add `SELECTOR_LOW_CONFIDENCE` to `ErrorCode`; it is not failure semantics. [VERIFIED: context D-127]
- **Adapter pause waiting for popup confirmation:** Do not hold a content-script promise open while popup asks the user; use the locked two-dispatch model. [VERIFIED: context D-124]
- **Permission broadening:** Do not change static host permissions or add `<all_urls>` to static `host_permissions`. [VERIFIED: codebase Read `CLAUDE.md`]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-event dispatch timeout | Service-worker `setTimeout` / polling loop | `chrome.alarms` with registry-derived `delayInMinutes` | Extension service-worker timers can be canceled on termination; alarms are the documented migration path. [CITED: developer.chrome.com/docs/extensions/develop/migrate/to-service-workers] |
| Adapter response timeout | New background queue or SW keepalive | Local `Promise.race` wrapper around `chrome.tabs.sendMessage` | D-113 explicitly scopes this timeout to the single response wait and excludes lifecycle recovery. [VERIFIED: context D-113] |
| URL login parsing | Regex across full URL | `new URL(actualUrl).pathname` + simple path pattern helper | D-115 locks pathname-only string patterns; URL parsing avoids open-redirect/string-prefix mistakes. [VERIFIED: context D-115; CITED: owasp.org/www-community/attacks/open_redirect] |
| Selector robustness scoring | ML/heuristic scoring system | Three explicit tiers: ARIA/role, data-attr, class fragment | Official selector guidance favors accessible/user-facing or explicit data selectors and treats class selectors as brittle. [CITED: webdriver.io/docs/bestpractices; CITED: grafana.com/docs/k6/latest/using-k6-browser/recommended-practices/select-elements/] |
| Retry orchestration | Automatic retry scheduler | Popup button that starts a fresh dispatch | Project decision uses popup-driven retry to avoid MV3 lifecycle complexity. [VERIFIED: codebase Read `.planning/STATE.md`] |

**Key insight:** Phase 9 robustness comes from moving policy into typed contracts and making failures/warnings explicit; custom background retry/keepalive logic would fight MV3 lifecycle constraints. [VERIFIED: codebase Read `CLAUDE.md`; CITED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `chrome.storage.session` contains ephemeral `dispatch:<id>` records and `dispatchActive`; records currently store `error` but no `warnings`/confirmation state. [VERIFIED: codebase Read `shared/storage/repos/dispatch.ts`] | Code edit only. Add optional fields backward-compatibly; no durable migration because storage is session-scoped. [VERIFIED: codebase Read `shared/storage/repos/dispatch.ts`] |
| Live service config | None — no external service dashboard/config is used for dispatch policy; platform policy lives in git registry. [VERIFIED: codebase Read `shared/adapters/registry.ts`, `CLAUDE.md`] | None. |
| OS-registered state | None — no launchd/systemd/Task Scheduler/pm2 state participates in extension dispatch. [VERIFIED: codebase/project audit via package scripts and planning docs] | None. |
| Secrets/env vars | None — Phase 9 does not introduce credentials or env vars; current permission model is browser permissions only. [VERIFIED: codebase Read `CLAUDE.md`, `package.json`] | None. |
| Build artifacts | WXT output under `.output/` and `.wxt/` may contain stale bundles after registry/type edits, but build regenerates them. [VERIFIED: codebase file listing and package scripts] | Run `pnpm build` or targeted test commands after implementation; do not edit artifacts manually. |

**Nothing found in category:** Live service config, OS-registered state, and secrets/env vars are none as verified above. [VERIFIED: codebase audit]

## Common Pitfalls

### Pitfall 1: D-113 conflicts with existing timeout discipline test

**What goes wrong:** Planner leaves `dispatch-timeout.spec.ts` expecting no `setTimeout`, then implementation of `adapterResponseTimeoutMs` fails tests despite matching context decisions. [VERIFIED: codebase Read `tests/unit/dispatch/dispatch-timeout.spec.ts`; VERIFIED: context D-113]  
**Why it happens:** Phase 8/earlier test encoded a stricter “alarms only” interpretation than Phase 9’s locked adapter-response timeout decision. [VERIFIED: codebase Read test header]  
**How to avoid:** Replace that test with narrower assertions: no cross-event SW timers; `setTimeout` allowed only inside `withAdapterResponseTimeout` or equivalent helper. [CITED: developer.chrome.com/docs/extensions/develop/migrate/to-service-workers]  
**Warning signs:** Tests grep the entire `dispatch-pipeline.ts` for `setTimeout`. [VERIFIED: codebase Read `dispatch-timeout.spec.ts`]

### Pitfall 2: Current popup loses `retriable` before rendering

**What goes wrong:** `ErrorBanner` cannot use `retriable` because `App.tsx` and `SendForm.tsx` store only `{ code, message }`. [VERIFIED: codebase Read `App.tsx`, `SendForm.tsx`]  
**Why it happens:** Current retry visibility is hard-coded by code set inside `ErrorBanner`. [VERIFIED: codebase Read `ErrorBanner.tsx`]  
**How to avoid:** Change popup dispatch-error signal/props to `{ code, message, retriable }`, including both immediate `dispatch.start` errors and stored `DispatchRecord.error`. [VERIFIED: codebase Read `shared/messaging/result.ts`, `dispatchRepo`]
**Warning signs:** Any remaining `RETRIABLE_CODES` set decides button visibility. [VERIFIED: codebase Read `ErrorBanner.tsx`]

### Pitfall 3: Low-confidence warning can accidentally send before confirmation

**What goes wrong:** Adapter finds tier3 selector, composes/sends, and then returns warning; this violates D-123. [VERIFIED: context D-123]  
**Why it happens:** Existing Discord `findEditor()` returns only an element, not the tier used. [VERIFIED: codebase Read `entrypoints/discord.content.ts`]  
**How to avoid:** Refactor selector helper to return `{ element, confidence/tier }`; branch before compose/send if tier3 and no confirmed flag. [VERIFIED: codebase Read `discord.content.ts`, `tests/unit/adapters/discord-selector.spec.ts`]  
**Warning signs:** Tests assert warning exists but do not assert MAIN world paste/send was not called. [VERIFIED: codebase Read `discord-selector.spec.ts`]

### Pitfall 4: Login helper drift

**What goes wrong:** `tabs.onUpdated`, SPA history, sendMessage failure, and `INPUT_NOT_FOUND` remap use subtly different logged-out conditions. [VERIFIED: current code has separate checks in `dispatch-pipeline.ts`]  
**Why it happens:** Current code evolved from Discord-specific fixes in multiple branches. [VERIFIED: code comments in `dispatch-pipeline.ts`, `discord.content.ts`]  
**How to avoid:** Planner should create a first task that extracts and unit-tests `isLoggedOutUrlForAdapter`, then integrate it into all branches. [VERIFIED: context D-118]
**Warning signs:** `!adapter.match(actualUrl)` remains in login remap branches after Phase 9. [VERIFIED: codebase Read `dispatch-pipeline.ts`]

### Pitfall 5: Warning state and active dispatch pointer semantics

**What goes wrong:** Popup reopens and sees an active dispatch forever, or clears a low-confidence warning before user can confirm. [VERIFIED: codebase Read `App.tsx`, `dispatchRepo`]  
**Why it happens:** Current terminal states are only `done`, `error`, `cancelled`; there is no warning/confirmation-needed state. [VERIFIED: codebase Read `DispatchStateEnum`, `DispatchRecord`]  
**How to avoid:** Add an explicit terminal or popup-actionable state (e.g. `needs_confirmation`) or a stored warning record with clear active-pointer semantics; plan tests for popup mount behavior. [VERIFIED: codebase Read `routes/dispatch.ts`, `App.tsx`]

## Code Examples

### Registry timeout resolver

```typescript
// Source: D-111/D-112 + Chrome alarms 30s minimum docs
const DEFAULT_DISPATCH_TIMEOUT_MS = 30_000;
const DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS = 20_000;

function resolveAdapterTimeouts(adapter: AdapterRegistryEntry) {
  const dispatchTimeoutMs = adapter.dispatchTimeoutMs ?? DEFAULT_DISPATCH_TIMEOUT_MS;
  const adapterResponseTimeoutMs =
    adapter.adapterResponseTimeoutMs ?? DEFAULT_ADAPTER_RESPONSE_TIMEOUT_MS;
  if (dispatchTimeoutMs < 30_000) {
    throw new Error(`dispatchTimeoutMs must be >= 30000 for ${adapter.id}`);
  }
  return { dispatchTimeoutMs, adapterResponseTimeoutMs };
}
```

### Adapter response timeout wrapper

```typescript
// Source: D-113/D-114; use only around a single chrome.tabs.sendMessage await
async function withAdapterResponseTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = globalThis.setTimeout(() => reject(new Error('adapter response timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) globalThis.clearTimeout(timer);
  }
}
```

### Selector confidence result

```typescript
// Source: existing Discord selector tiers + D-125
const SELECTOR_LOW_CONFIDENCE = 'SELECTOR_LOW_CONFIDENCE' as const;

type SelectorTier = 'tier1-aria' | 'tier2-data' | 'tier3-class-fragment';

type EditorMatch = {
  element: HTMLElement;
  tier: SelectorTier;
  lowConfidence: boolean;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 persistent background timers | MV3 extension service worker + persisted state + alarms | Manifest V3 architecture; Chrome docs warn service workers terminate after idle/request limits | Use `chrome.alarms` for cross-event dispatch timeout and session storage for state. [CITED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle; CITED: developer.chrome.com/docs/extensions/develop/migrate/to-service-workers] |
| Broad host non-match login inference | Explicit adapter-owned logged-out pathname patterns | Phase 9 locked decision D-116 | Reduces false positives for self-hosted or path-flexible platforms. [VERIFIED: context D-116/D-117] |
| Retry by fixed error-code list | Retry by `Result.retriable` / stored `error.retriable` | Phase 9 locked decision D-120 | Platform-specific error codes can opt into retry without popup hard-code edits. [VERIFIED: context D-120; VERIFIED: codebase Read `result.ts`] |
| CSS class selectors as normal fallback | CSS class fragment is low-confidence and requires user confirmation | Phase 9 locked decision D-125 | Avoids silent mis-send when SPA class names drift. [VERIFIED: context D-125; CITED: webdriver.io/docs/bestpractices] |

**Deprecated/outdated:**
- `RETRIABLE_CODES` as retry authority: replace with `retriable` prop/state. [VERIFIED: codebase Read `ErrorBanner.tsx`; VERIFIED: context D-120]
- `!adapter.match(actualUrl)` as login remap: replace with `loggedOutPathPatterns`. [VERIFIED: codebase Read `dispatch-pipeline.ts`; VERIFIED: context D-116]
- Whole-file “no setTimeout in dispatch-pipeline” grep test: replace with scoped SW discipline test plus adapter-response timeout tests. [VERIFIED: codebase Read `dispatch-timeout.spec.ts`; VERIFIED: context D-113]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A warning/confirmation-needed state can be added either as a new `DispatchStateEnum` member or as optional `warnings` on an existing terminal record; this research recommends explicit state but does not lock the representation. [ASSUMED] | Common Pitfalls / Recommended Structure | Planner may choose a representation that makes popup reopen behavior harder to test. |
| A2 | Popup unit test tooling can render `SendForm`/`App` similarly to existing `.tsx` unit tests. [ASSUMED] | Validation Architecture | If current test helpers are insufficient, planner needs a Wave 0 helper task. |

## Open Questions

1. **Warning record shape**
   - What we know: Context requires warning channel and two-dispatch confirmation; current `Result`, `DispatchStartOutput`, and `DispatchRecord` have no warning field. [VERIFIED: context D-124/D-127; VERIFIED: codebase Read `result.ts`, `routes/dispatch.ts`, `dispatch.ts`]
   - What's unclear: Whether to add warnings to generic `Result<T>` or keep warnings dispatch-specific. [ASSUMED]
   - Recommendation: Prefer dispatch-specific warning/confirmation fields to avoid changing every RPC route. [ASSUMED]

2. **Path pattern exact syntax**
   - What we know: Context locks `string[]`, pathname-only, simple/readable/testable matching. [VERIFIED: context D-115 and Claude discretion]
   - What's unclear: Exact vs prefix marker style is delegated to planner. [VERIFIED: context Claude's Discretion]
   - Recommendation: Use explicit strings with trailing `*` prefix semantics (e.g. `'/'`, `'/login*'`, `'/register*'`) and unit-test invalid/edge cases. [ASSUMED]

3. **Adapter timeout `setTimeout` location**
   - What we know: D-113 allows `Promise.race` + `setTimeout` for a single `sendMessage` wait; Chrome docs caution against timers for service-worker long delays. [VERIFIED: context D-113; CITED: developer.chrome.com/docs/extensions/develop/migrate/to-service-workers]
   - What's unclear: Whether project reviewers will accept `setTimeout` inside `background/dispatch-pipeline.ts` or prefer a separately named helper file to make the exception auditable. [ASSUMED]
   - Recommendation: Isolate it in a small helper with tests and comments referencing D-113. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Typecheck/tests/build | ✓ | v26.0.0 | Project engine requires >=20.19, so available version satisfies engine. [VERIFIED: Bash `node --version`; VERIFIED: codebase Read `package.json`] |
| pnpm | Package scripts | ✓ | 10.33.4 | npm can inspect registry, but project scripts should use pnpm. [VERIFIED: Bash `pnpm --version`; VERIFIED: codebase Read `packageManager`] |
| npm/npx | Version verification / Context7 fallback | ✓ | 11.12.1 | pnpm dlx for project scripts. [VERIFIED: Bash `npm --version`, `npx --version`] |
| Chrome extension APIs | Runtime behavior | Browser-provided | — | Unit tests use `wxt/testing/fake-browser`; headed E2E requires local browser. [VERIFIED: codebase Read tests and Playwright config] |
| Playwright headed browser | Optional E2E validation | Configured | 1.59.1 package | If no headed display, rely on unit/type/lint and request human E2E only when necessary. [VERIFIED: npm registry; VERIFIED: codebase Read `playwright.config.ts`; VERIFIED: project constraints] |

**Missing dependencies with no fallback:** None found for planning/unit validation. [VERIFIED: environment audit]

**Missing dependencies with fallback:** Headed E2E may be unavailable in non-GUI environments; fallback is unit/type/lint/build plus human-headed E2E when needed. [VERIFIED: codebase Read `playwright.config.ts`, CLAUDE.md]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest configured through `wxt/testing/vitest-plugin`; installed `vitest` is 3.2.4 while npm latest is 4.1.5. [VERIFIED: codebase Read `vitest.config.ts`, `package.json`; VERIFIED: npm registry] |
| Config file | `/Users/seven/data/coding/projects/seven/web2chat/vitest.config.ts` [VERIFIED: codebase Read] |
| Quick run command | `pnpm test -- tests/unit/dispatch/timeout-config.spec.ts tests/unit/dispatch/logged-out-paths.spec.ts tests/unit/popup/retry-retriable.spec.tsx tests/unit/adapters/discord-selector.spec.ts` [ASSUMED] |
| Full suite command | `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage` [VERIFIED: codebase Read `package.json`] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DSPT-01 | Registry defaults/overrides drive alarm delay and adapter response timeout; invalid dispatch timeout <30s fails test | unit | `pnpm test -- tests/unit/dispatch/timeout-config.spec.ts tests/unit/dispatch/adapter-response-timeout.spec.ts` | ❌ Wave 0 |
| DSPT-02 | `loggedOutPathPatterns` helper remaps only configured pathname matches and only on adapter host | unit | `pnpm test -- tests/unit/dispatch/logged-out-paths.spec.ts` | ❌ Wave 0 / existing `login-detection.spec.ts` to revise |
| DSPT-03 | Popup retry appears from `retriable: true`, clears old error/active pointer, starts new dispatch with current form values/new ID | unit + existing E2E adjustment | `pnpm test -- tests/unit/popup/retry-retriable.spec.tsx` | ❌ Wave 0 |
| DSPT-04 | Tier3 selector returns `SELECTOR_LOW_CONFIDENCE` warning and no send; confirmed second dispatch sends | unit | `pnpm test -- tests/unit/adapters/discord-selector.spec.ts tests/unit/dispatch/selector-warning.spec.ts` | ⚠️ selector file exists but warning tests missing |

### Sampling Rate

- **Per task commit:** targeted Vitest command for changed subsystem plus `pnpm typecheck`. [VERIFIED: project TDD constraints; VERIFIED: package scripts]
- **Per wave merge:** `pnpm test && pnpm typecheck && pnpm lint && pnpm test:i18n-coverage`. [VERIFIED: package scripts]
- **Phase gate:** Full suite green before `/gsd-verify-work`; run headed `pnpm test:e2e` only when environment supports it or request human execution if not. [VERIFIED: CLAUDE.md, `playwright.config.ts`]

### Wave 0 Gaps

- [ ] `tests/unit/dispatch/timeout-config.spec.ts` — covers DSPT-01 defaults/overrides/minimum guard. [VERIFIED: test file absent via file listing]
- [ ] `tests/unit/dispatch/adapter-response-timeout.spec.ts` — covers DSPT-01/D-113 `Promise.race` path and `TIMEOUT retriable=true`. [VERIFIED: test file absent; context D-113]
- [ ] Revise `tests/unit/dispatch/dispatch-timeout.spec.ts` — stop forbidding all `setTimeout`; assert scoped usage instead. [VERIFIED: codebase Read existing test]
- [ ] Revise or replace `tests/unit/dispatch/login-detection.spec.ts` — covers DSPT-02 helper and no remap for unconfigured platforms. [VERIFIED: codebase Read existing test]
- [ ] `tests/unit/popup/retry-retriable.spec.tsx` — covers DSPT-03. [VERIFIED: test file absent via file listing]
- [ ] `tests/unit/dispatch/selector-warning.spec.ts` or extend `tests/unit/adapters/discord-selector.spec.ts` — covers DSPT-04 warning channel and no-send-before-confirm. [VERIFIED: codebase Read existing selector test]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Detect logged-out states via explicit adapter URL patterns and adapter DOM login probes; do not treat extension as authenticated to target services. [VERIFIED: requirements DSPT-02; codebase `discord.content.ts`] |
| V3 Session Management | yes | Dispatch state is session-scoped in `chrome.storage.session`; no module-scope SW session state. [VERIFIED: codebase Read `dispatchRepo`, `CLAUDE.md`] |
| V4 Access Control | yes | Preserve activeTab/scripting/storage/static Discord + dynamic OpenClaw permission model; no broad static permissions. [VERIFIED: codebase Read `CLAUDE.md`] |
| V5 Input Validation | yes | `dispatch.start` input remains zod-validated; URL parsing uses `new URL`; path patterns are simple registry-owned strings. [VERIFIED: codebase Read `routes/dispatch.ts`, `registry.ts`] |
| V6 Cryptography | no | Phase 9 introduces no cryptography. [VERIFIED: phase scope/context] |
| V10 Malicious Code | yes | Adapter injection remains registry-script-file based; no remote code execution or live-site selector scraping in tests. [VERIFIED: codebase Read `dispatch-pipeline.ts`, `CLAUDE.md`] |

### Known Threat Patterns for MV3 Dispatch Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mis-send due to brittle selector matching | Tampering / Information Disclosure | Tier3 class-fragment match returns warning and requires user confirmation before send. [VERIFIED: context D-123..D-125] |
| Logged-out redirect misclassified as generic input failure | Spoofing / Reliability | Registry-owned `loggedOutPathPatterns` helper remaps only explicit logged-out paths to `NOT_LOGGED_IN`. [VERIFIED: context D-115..D-118] |
| Overbroad host permission | Elevation of Privilege | Do not modify permission model; static `<all_urls>` remains forbidden. [VERIFIED: CLAUDE.md] |
| Rendering raw adapter/SW error messages in popup | XSS / Information Disclosure | `ErrorBanner` renders only i18n copy by error code and does not render `error.message`. [VERIFIED: codebase Read `ErrorBanner.tsx`] |
| Infinite/automatic retry spam | Denial of Service | Retry is user-clicked and uses fresh dispatch ID; no SW auto-retry queue. [VERIFIED: context D-119..D-122; STATE.md] |

## Sources

### Primary (HIGH confidence)

- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/CLAUDE.md` — project constraints, stack, SW discipline, adapter pattern. [VERIFIED]
- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/.planning/phases/09-dispatch-robustness/09-CONTEXT.md` — locked decisions D-111..D-127. [VERIFIED]
- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/.planning/REQUIREMENTS.md` — DSPT-01..DSPT-04. [VERIFIED]
- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/background/dispatch-pipeline.ts` — current timeout/login/dispatch flow. [VERIFIED]
- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/shared/adapters/types.ts` and `registry.ts` — adapter registry contract. [VERIFIED]
- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/App.tsx`, `SendForm.tsx`, `ErrorBanner.tsx` — popup retry/error behavior. [VERIFIED]
- Codebase: `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/discord.content.ts` and `tests/unit/adapters/discord-selector.spec.ts` — selector tiers and Discord adapter behavior. [VERIFIED]
- npm registry via `npm view` — versions for WXT, Preact, Vitest, zod, @wxt-dev/i18n, Playwright. [VERIFIED]
- Chrome Extensions official docs: `https://developer.chrome.com/docs/extensions/reference/api/alarms` — Chrome 120 30s alarms minimum. [CITED]
- Chrome Extensions official docs: `https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle` — extension SW idle/request timeout behavior. [CITED]
- Chrome Extensions official docs: `https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#convert-timers-to-alarms` — replace service-worker timers with alarms. [CITED]

### Secondary (MEDIUM confidence)

- WebdriverIO best practices: `https://webdriver.io/docs/bestpractices` — resilient selectors/ARIA guidance surfaced through WebSearch. [CITED]
- Grafana k6 browser selector practices: `https://grafana.com/docs/k6/latest/using-k6-browser/recommended-practices/select-elements/` — ARIA/data selectors preferred, class selectors brittle; surfaced through WebSearch. [CITED]
- Playwright best practices: `https://playwright.dev/docs/best-practices` — role/test-id selector preference; surfaced through WebSearch. [CITED]
- OWASP Open Redirect: `https://owasp.org/www-community/attacks/open_redirect` — URL allowlist/parsing mindset. [CITED]

### Tertiary (LOW confidence)

- None used as authoritative; WebFetch to several official docs failed due domain safety verification, so official-doc claims are based on WebSearch snippets for those URLs plus project-provided canonical references. [VERIFIED: tool behavior]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified against npm registry and project `package.json`. [VERIFIED]
- Architecture: HIGH — current code touchpoints read directly and Phase 9 decisions are locked in context. [VERIFIED]
- Pitfalls: HIGH — most pitfalls derive from direct code/test conflicts and locked decisions. [VERIFIED]
- External browser API details: MEDIUM-HIGH — official docs identified via WebSearch, but WebFetch full-page extraction failed. [CITED]

**Research date:** 2026-05-10  
**Valid until:** 2026-06-09 for project-internal findings; re-check Chrome API docs/package versions after 30 days. [ASSUMED]
