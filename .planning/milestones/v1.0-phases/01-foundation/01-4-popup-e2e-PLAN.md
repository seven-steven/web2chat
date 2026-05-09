---
id: 01-4-popup-e2e
phase: 01-foundation
plan: 4
title: Popup（Preact + Tailwind v4）+ Playwright e2e + 端到端验证
wave: 4
type: execute
depends_on: [01-3-messaging-sw]
requirements: [FND-01, FND-06]
files_modified:
  - entrypoints/popup/index.html
  - entrypoints/popup/main.tsx
  - entrypoints/popup/App.tsx
  - entrypoints/popup/style.css
  - playwright.config.ts
  - tests/e2e/fixtures.ts
  - tests/e2e/popup-rpc.spec.ts
  - README.md
autonomous: true
user_setup: []
must_haves:
  truths:
    - "点击工具栏 action 图标会打开 popup（FND-01 的端到端证据 — 由 Playwright 验证）"
    - "popup mount 时**自动**触发 `await sendMessage('meta.bumpHello')`（D-09 — 不是按钮点击）"
    - "popup 渲染 `t('popup_hello', helloCount)` 的结果；en 浏览器下显示 `Hello, world (×N)`，zh_CN 浏览器下显示 `你好，世界 ×N`（FND-06 + ROADMAP 成功标准 #2）"
    - "重复打开 popup（每次重新 mount）后，`helloCount` 严格单调递增（证明 chrome.storage.local 持久化 + RPC 链路；ROADMAP 成功标准 #3）"
    - "通过 chrome.runtime.reload 模拟 SW 重启后再触发 bumpHello，仍返回比上一次大 1 的 helloCount（FND-02 端到端证据 + ROADMAP 成功标准 #4 — 由 Playwright e2e 验证）"
    - "popup TSX 中**无任何裸字符串字面量** JSX 文本节点（grep + ESLint 双重验证；ROADMAP 成功标准 #5 末尾条件）"
    - "Tailwind v4 通过 @tailwindcss/vite 集成生效（`pnpm build` 后 popup CSS 含编译产物）；如 D-10 锁定，集成失败按 deviation 处理而非 fallback CSS modules"
    - "`tests/e2e/` 目录下 Playwright e2e 至少包含 1 条断言验证 SW-restart 仍可触发 bumpHello（与 D-11 保留本地 e2e 可跑性的承诺一致）"
  artifacts:
    - path: "entrypoints/popup/index.html"
      provides: "popup HTML shell；引用 main.tsx + style.css"
      contains: "main.tsx"
    - path: "entrypoints/popup/main.tsx"
      provides: "Preact mount entry — render(<App />, ...)"
      contains: "preact"
    - path: "entrypoints/popup/App.tsx"
      provides: "Preact 组件；mount 时通过 @preact/signals + useEffect 自动触发 sendMessage('meta.bumpHello')；渲染 t('popup_hello', count)；error 状态走 t('popup_hello') fallback 文案"
      contains: "sendMessage"
    - path: "entrypoints/popup/style.css"
      provides: "Tailwind v4 入口（@import 'tailwindcss'）+ popup 局部样式"
      contains: "tailwindcss"
    - path: "playwright.config.ts"
      provides: "Playwright 配置 — chromium.launchPersistentContext + --load-extension；headed 模式；指向 .output/chrome-mv3"
      contains: "launchPersistentContext"
    - path: "tests/e2e/fixtures.ts"
      provides: "Playwright fixture：解析 extensionId、打开 popup、提供 reload-extension helper"
      contains: "launchPersistentContext"
    - path: "tests/e2e/popup-rpc.spec.ts"
      provides: "至少 2 条 e2e：(1) popup 第一次打开显示 helloCount=1；(2) chrome.runtime.reload 模拟 SW 重启后第二次打开显示 helloCount=2"
      contains: "helloCount"
    - path: "README.md"
      provides: "项目顶层 README — 含 Phase 1 dev 段落（pnpm install / dev / build / 加载 unpacked / 手测脚本：杀 SW 后再点击 action 图标 helloCount 仍 +1）"
      contains: "Load unpacked"
  key_links:
    - from: "entrypoints/popup/App.tsx"
      to: "shared/messaging/protocol.ts"
      via: "import { sendMessage }"
      pattern: "sendMessage\\('meta\\.bumpHello'"
    - from: "entrypoints/popup/App.tsx"
      to: "shared/i18n/index.ts"
      via: "import { t }"
      pattern: "t\\('popup_hello'"
    - from: "tests/e2e/popup-rpc.spec.ts"
      to: ".output/chrome-mv3"
      via: "Playwright launchPersistentContext --load-extension"
      pattern: "load-extension|--load-extension"
---

<objective>
落地 popup UI + 端到端验证：popup 用 Preact + Tailwind v4 渲染，mount 时自动 RPC 到 SW、读 helloCount、按 i18n 渲染 hello-world 字符串（FND-01 + FND-06）；Playwright e2e 验证 popup ↔ SW ↔ storage 全链路 + SW 重启韧性（FND-02 + ROADMAP §"Phase 1" 成功标准 #2/#3/#4）；README 给出 dev / load-unpacked / 手测脚本。

Purpose: 这是 Phase 1 的"封面页" — 把 Plan 01-03 的所有结构性约束（manifest 形态、storage、messaging、SW 顶层 listener）拼成用户可点击、评审者可加载的最终扩展。Tailwind v4（D-10）也在这里第一次接入实际页面。Playwright 不进 CI（D-11，留 Phase 4），但本 plan 必须保证本地 `pnpm test:e2e` 跑得起来 + 至少一条 e2e 覆盖 SW 重启路径（成功标准 #4）。

Output: 可加载、可点击、双语生效、SW 重启可恢复的 MV3 扩展，附带本地可跑的 Playwright e2e 与 README。
</objective>

<execution_context>
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/workflows/execute-plan.md
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@CLAUDE.md
@.planning/phases/01-foundation/01-1-scaffold-PLAN.md
@.planning/phases/01-foundation/01-2-storage-i18n-PLAN.md
@.planning/phases/01-foundation/01-3-messaging-sw-PLAN.md

<interfaces>
<!-- Plan 02 + 03 已落地；Plan 04 直接 import。 -->

来自 shared/messaging（Plan 03）：
```typescript
export const sendMessage: <K extends keyof ProtocolMap>(
  key: K, ...args: Parameters<ProtocolMap[K]>
) => ReturnType<ProtocolMap[K]>;
// 调用形态：const result = await sendMessage('meta.bumpHello'); → Result<MetaSchema>
```

来自 shared/i18n（Plan 02）：
```typescript
export const t: <K extends MessageKey>(key: K, ...params: any[]) => string;
// 调用形态：t('popup_hello', helloCount) → 'Hello, world (×N)' (en) / '你好，世界 ×N' (zh_CN)
```

来自 shared/storage（Plan 02）：
```typescript
export type MetaSchema = { schemaVersion: 1; helloCount: number };
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Popup entrypoint（Preact + Tailwind v4 + signals + 自动 RPC）</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-08（popup 演示 = 读写 helloCount）+ D-09（mount 自动触发 bumpHello）+ D-10（Tailwind v4 from day 1，无 CSS modules fallback）
    - .planning/research/STACK.md §"核心技术"（Preact + @preact/signals）+ §"配套库"（tailwindcss v4 + @tailwindcss/vite）
    - .planning/research/PITFALLS.md §陷阱 11（chrome.i18n 没有运行时 locale 切换 — Phase 1 不实现，跟随浏览器 UI）
    - .planning/REQUIREMENTS.md FND-06（popup hello 走 i18n）
    - CLAUDE.md §"i18n"（用户可见字符串只能走 t(...)；ESLint 拦截 JSX/TSX 裸字符串）
    - 当前 wxt.config.ts（Plan 01 落地的 entrypoints 形态期望 entrypoints/popup/index.html + main.tsx）+ shared/messaging/index.ts + shared/i18n/index.ts
  </read_first>
  <files>
    entrypoints/popup/index.html
    entrypoints/popup/main.tsx
    entrypoints/popup/App.tsx
    entrypoints/popup/style.css
  </files>
  <action>
1. **entrypoints/popup/index.html**：

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Web2Chat</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body class="m-0 min-w-[280px] min-h-[120px] bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <div id="app"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

注意：HTML body 的文案绝不出现在这里（陷阱 11 — `__MSG_*__` 在 HTML body 不工作）。所有可见文本由 App.tsx 通过 `t(...)` 注入。

2. **entrypoints/popup/style.css**：

```css
@import 'tailwindcss';

/* popup-local overrides — keep minimal in Phase 1 */
:root {
  color-scheme: light dark;
}
```

3. **entrypoints/popup/main.tsx**：

```tsx
import { render } from 'preact';
import { App } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('[popup] #app root missing');
render(<App />, root);
```

4. **entrypoints/popup/App.tsx**：

```tsx
import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { sendMessage } from '@/shared/messaging';
import { t } from '@/shared/i18n';

/**
 * Phase 1 popup demo (D-08 + D-09):
 *   - On mount, RPC to SW: meta.bumpHello → Result<MetaSchema>
 *   - Render t('popup_hello', helloCount) on success
 *   - Render t('popup_hello', 0) + error overlay on failure
 *
 * No buttons, no manual triggers — popup re-mounting on each toolbar click
 * IS the increment event (matches ROADMAP success criterion #4 semantics).
 *
 * Future phases will add SendForm, HistoryDropdown, PromptPicker — keep this
 * file minimal so the i18n + RPC + signals patterns are obvious to readers.
 */

const helloCount = signal<number | null>(null);
const errorMessage = signal<string | null>(null);

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await sendMessage('meta.bumpHello');
      if (cancelled) return;
      if (result.ok) {
        helloCount.value = result.data.helloCount;
        errorMessage.value = null;
      } else {
        helloCount.value = 0;
        errorMessage.value = result.message;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = helloCount.value;
  return (
    <main class="flex flex-col items-center justify-center gap-2 p-6 font-sans text-base">
      <h1 class="m-0 text-lg font-semibold" data-testid="popup-hello">
        {count === null ? t('popup_hello', 0) : t('popup_hello', count)}
      </h1>
      {errorMessage.value !== null && (
        <p class="m-0 text-xs text-red-600" data-testid="popup-error">
          {errorMessage.value}
        </p>
      )}
    </main>
  );
}
```

**关键纪律：**
- 所有文本节点都通过 `{t(...)}` 或 `{errorMessage.value}`（变量插值）注入 — JSX 中**没有**裸字符串字面量文本节点（满足 ESLint `no-restricted-syntax` + ROADMAP 成功标准 #5）
- `errorMessage.value` 在 Phase 1 是直接显示原始 message — 这是开发期 UX，由 Phase 6 的 I18N + 错误信息人性化覆盖；**不要**为 Phase 1 引入 `t('error_internal')` 之类，避免越位
- `count === null` 时显示 `t('popup_hello', 0)`（loading 占位）— 不显示 spinner / Loading... 文案，避免新增未走 i18n 的字符串
- 不要 import `chrome.*` 直接 — popup 通过 sendMessage 与 SW 间接通信（ARCHITECTURE.md §模式 1）

5. **跑 `pnpm build`**：
   - 验证 `.output/chrome-mv3/popup.html`（或 wxt 的等价路径）存在
   - 验证编译产物中包含 Tailwind 生成的 CSS（grep `flex` 或 `padding` 等 utility 类）
   - 如 Tailwind v4 + Vite 7 + WXT 0.20.x 集成出现具体错误，**按 D-10 处理为 deviation**：在 SUMMARY.md 详细记录错误与解决方案，不切换到 CSS modules

6. **手测**：`pnpm dev` 启动开发服务器，浏览器加载 unpacked 扩展，点击 action 图标，目检：
   - popup 弹出
   - 显示 hello 字符串（视浏览器 UI 语言显示 en 或 zh_CN 文案）
   - 关闭再点击：count 应递增

（手测**不在**自动 verify 中跑 — Task 2 的 Playwright 替代它做自动断言）
  </action>
  <verify>
    <automated>pnpm build &amp;&amp; pnpm verify:manifest &amp;&amp; pnpm typecheck &amp;&amp; pnpm lint &amp;&amp; (ls .output/chrome-mv3/popup.html 2&gt;/dev/null || ls .output/chrome-mv3/popup/index.html 2&gt;/dev/null) &amp;&amp; grep -rE '(JSXText|>[A-Za-z一-龥][^<>{]*<)' entrypoints/popup/App.tsx | grep -v '{t(' | grep -v 'errorMessage.value' | grep -v 'data-testid' | grep -v '//' | (! grep -E '>[A-Za-z一-龥]')</automated>
  </verify>
  <done>
    - `entrypoints/popup/index.html` + `main.tsx` + `App.tsx` + `style.css` 存在
    - `style.css` 含 `@import 'tailwindcss'`
    - `App.tsx` 通过 `t('popup_hello', count)` 渲染所有可见文案；JSX 文本节点不含任何裸字符串字面量
    - `App.tsx` 通过 `sendMessage('meta.bumpHello')` 发起 RPC（一次，在 useEffect mount 内）
    - `pnpm build` 成功，`.output/chrome-mv3/` 含 popup HTML + CSS
    - `pnpm lint` 干净（特别是 `no-restricted-syntax` 不报错）
    - `pnpm typecheck` 干净
    - `pnpm verify:manifest` 仍 OK（manifest 形态未被破坏）
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Playwright e2e — popup RPC happy path + SW-restart 韧性</name>
  <read_first>
    - .planning/research/STACK.md §"开发工具"（@playwright/test 1.58 + chromium.launchPersistentContext + --load-extension）
    - .planning/research/PITFALLS.md §陷阱 3（SW 中途死亡 — 测试必须 kill SW 后验证 dispatch 路径恢复；本 plan 是 Phase 1，等价路径是 chrome.runtime.reload 后重新触发 bumpHello）
    - .planning/REQUIREMENTS.md FND-02（top-level listener — 杀 SW 后 RPC 仍工作）
    - .planning/phases/01-foundation/01-CONTEXT.md §decisions D-11（Playwright **不**进 CI；本地 `pnpm test:e2e` 必须可跑）
    - ROADMAP §"Phase 1" 成功标准 #4（chrome://extensions → Service worker → Stop 后再点击图标仍 RPC 工作 — Playwright 用 chrome.runtime.reload 等价模拟）
    - 当前 entrypoints/popup/App.tsx（Task 1 落地）+ .output/chrome-mv3/（Plan 01-04 build 产物）
    - Playwright Chrome extensions docs（用 Context7 拉取 1.58.x 最新 fixture 模式）
  </read_first>
  <files>
    playwright.config.ts
    tests/e2e/fixtures.ts
    tests/e2e/popup-rpc.spec.ts
  </files>
  <action>
1. **playwright.config.ts**：

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false, // launchPersistentContext shares browser profile; serial is safer
  workers: 1,
  reporter: [['list']],
  use: {
    headless: false, // launchPersistentContext + --load-extension requires headed Chromium
    actionTimeout: 5_000,
  },
});
```

2. **tests/e2e/fixtures.ts** — 自定义 fixture 加载 unpacked 扩展并暴露 `extensionId`：

```ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

/**
 * Custom fixture (PITFALLS §陷阱 3 + ROADMAP success criterion #4):
 *   - launchPersistentContext with --load-extension
 *   - resolve extensionId from the SW URL (chrome-extension://<id>/...)
 *   - expose `reloadExtension` helper to simulate SW restart via chrome.runtime.reload()
 *
 * D-11: Playwright is NOT in CI yet; this fixture exists so the developer can run
 * `pnpm test:e2e` locally and the test still serves as the canonical SW-restart proof.
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  reloadExtension: () => Promise<void>;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionPath = resolve(process.cwd(), '.output/chrome-mv3');
    const userDataDir = mkdtempSync(join(tmpdir(), 'web2chat-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // Wait for the service worker to register, then parse its URL.
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    const id = serviceWorker.url().split('/')[2];
    if (!id) throw new Error('[e2e] could not parse extensionId from SW URL');
    await use(id);
  },
  reloadExtension: async ({ context }, use) => {
    await use(async () => {
      // Use a SW page to call chrome.runtime.reload(); equivalent to chrome://extensions Stop+restart.
      const [sw] = context.serviceWorkers();
      if (!sw) throw new Error('[e2e] no service worker to reload');
      await sw.evaluate(() => chrome.runtime.reload());
      // wait for the new SW to come up
      await context.waitForEvent('serviceworker', { timeout: 10_000 });
    });
  },
});

export { expect } from '@playwright/test';
```

3. **tests/e2e/popup-rpc.spec.ts**：

```ts
import { test, expect } from './fixtures';

/**
 * Phase 1 e2e — proves popup ↔ SW ↔ chrome.storage.local round-trip
 * AND the top-level-listener / SW-restart-resilience contract (FND-02).
 *
 * Notes on robustness:
 *   - We assert numeric helloCount via a data-testid + regex match on the
 *     rendered text, so this passes regardless of browser UI language
 *     (en: "Hello, world (×1)", zh_CN: "你好，世界 ×1").
 */

const HELLO_COUNT_RE = /[×x](\d+)/i;

test('popup RPC: first mount renders helloCount=1', async ({ context, extensionId }) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const page = await context.newPage();
  await page.goto(popupUrl);
  const text = await page.locator('[data-testid="popup-hello"]').innerText();
  const match = text.match(HELLO_COUNT_RE);
  expect(match, `expected hello count in "${text}"`).not.toBeNull();
  expect(Number(match![1])).toBe(1);
  await page.close();
});

test('popup RPC: subsequent re-mounts increment helloCount monotonically', async ({ context, extensionId }) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const counts: number[] = [];
  for (let i = 0; i < 3; i++) {
    const page = await context.newPage();
    await page.goto(popupUrl);
    const text = await page.locator('[data-testid="popup-hello"]').innerText();
    const m = text.match(HELLO_COUNT_RE);
    expect(m).not.toBeNull();
    counts.push(Number(m![1]));
    await page.close();
  }
  // strictly monotonically increasing by 1
  expect(counts).toEqual([counts[0], counts[0] + 1, counts[0] + 2]);
});

test('popup RPC survives SW restart (FND-02 + ROADMAP success criterion #4)', async ({ context, extensionId, reloadExtension }) => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  // Capture baseline
  const page1 = await context.newPage();
  await page1.goto(popupUrl);
  const before = Number((await page1.locator('[data-testid="popup-hello"]').innerText()).match(HELLO_COUNT_RE)![1]);
  await page1.close();

  // Simulate SW kill + restart
  await reloadExtension();

  // After SW restart, opening popup again must STILL successfully RPC and increment
  const page2 = await context.newPage();
  await page2.goto(popupUrl);
  const after = Number((await page2.locator('[data-testid="popup-hello"]').innerText()).match(HELLO_COUNT_RE)![1]);
  expect(after).toBeGreaterThan(before);
  await page2.close();
});
```

4. **package.json scripts** — 验证 Plan 01 已存在 `"test:e2e": "playwright test"`；如未存在则补上。运行 `pnpm exec playwright install chromium` 一次以拉取 browser binary（开发机本地操作，CI 不需要 — D-11）。
5. **手测**：`pnpm build && pnpm test:e2e` 应 3 个 e2e 全绿。
  </action>
  <verify>
    <automated>test -f playwright.config.ts &amp;&amp; test -f tests/e2e/fixtures.ts &amp;&amp; test -f tests/e2e/popup-rpc.spec.ts &amp;&amp; grep -q 'launchPersistentContext' tests/e2e/fixtures.ts &amp;&amp; grep -q 'load-extension' tests/e2e/fixtures.ts &amp;&amp; grep -q 'chrome.runtime.reload' tests/e2e/fixtures.ts &amp;&amp; grep -q 'data-testid="popup-hello"' tests/e2e/popup-rpc.spec.ts &amp;&amp; grep -cE '^test\(' tests/e2e/popup-rpc.spec.ts | grep -qE '^[3-9]' &amp;&amp; pnpm typecheck</automated>
  </verify>
  <done>
    - `playwright.config.ts` 存在；testDir = ./tests/e2e；headless: false
    - `tests/e2e/fixtures.ts` 实现 launchPersistentContext + extensionId 解析 + reloadExtension helper
    - `tests/e2e/popup-rpc.spec.ts` 至少 3 条 test：(1) 首次 mount helloCount=1；(2) 连续 3 次 mount 严格递增 +1；(3) SW reload 后 helloCount 仍递增（这条直接覆盖 ROADMAP 成功标准 #4）
    - `pnpm test:e2e` 在本地全绿（执行者跑一次确认）
    - `.github/workflows/ci.yml` **未**追加 Playwright 步骤（D-11）— grep 验证
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: README + 手测脚本 + 端到端 dev 闭环</name>
  <read_first>
    - .planning/phases/01-foundation/01-CONTEXT.md §specifics（杀 SW 验证手测路径 — Phase 1 README dev section 写入这条）
    - .planning/REQUIREMENTS.md DST-04（README 双语 — 但完整 zh_CN + en 章节是 Phase 7 的目标；Phase 1 README 仅含 dev / build / load-unpacked 与 manual smoke test）
    - 当前 package.json scripts、wxt.config.ts、.output/chrome-mv3 的实际产出
    - ROADMAP §"Phase 1" 成功标准 #1 / #2 / #4（README 必须包含每条手测路径的精确步骤）
  </read_first>
  <files>
    README.md
  </files>
  <action>
1. **README.md** — Phase 1 阶段精简版，**zh_CN 优先**（与 CLAUDE.md 顶部说明一致；Phase 7 再补全 en 章节并接入 DST-04 完整版）：

```markdown
# Web2Chat

> Chrome MV3 扩展骨架 — 抓取页面结构化元数据 + 用户预设 prompt，一键投递到 IM / AI Agent 聊天会话。

当前状态：**Phase 1 (Foundation) — 扩展骨架。** 投递与抓取逻辑由后续 phase 落地。

## 开发环境

- Node.js >= 20.19
- pnpm 9.x（`corepack enable`）
- Chrome / Chromium 稳定版（用于本地 unpacked 加载与 Playwright e2e）

## 快速开始

\`\`\`bash
pnpm install         # 安装依赖；postinstall 跑 wxt prepare + husky
pnpm dev             # 启动 WXT dev server，自动 HMR
pnpm build           # 生产构建到 .output/chrome-mv3/
pnpm verify:manifest # 校验 manifest 形态（CI 同款检查）
pnpm test            # Vitest 单元测试
pnpm test:e2e        # Playwright e2e（本地，需要 headed Chromium；CI 不跑此步）
pnpm typecheck       # tsc --noEmit
pnpm lint            # ESLint flat config
\`\`\`

## 加载 unpacked 扩展

1. 跑 \`pnpm build\`
2. 打开 \`chrome://extensions\`
3. 右上角打开 **开发者模式**
4. 点击 **Load unpacked**，选择本仓库的 \`.output/chrome-mv3/\` 目录
5. 工具栏出现 Web2Chat action 图标

## Phase 1 手测脚本

### #1 — manifest 形态（FND-05）

加载 unpacked 后，从 \`chrome://extensions\` 卡片右侧 "Inspect views" → service worker，
或直接打开 \`.output/chrome-mv3/manifest.json\`，确认：

- \`permissions\` === \`["activeTab", "scripting", "storage"]\`（顺序无关）
- \`host_permissions\` === \`["https://discord.com/*"]\`（**绝不**含 \`<all_urls>\`）
- \`optional_host_permissions\` === \`["<all_urls>"]\`
- \`default_locale\` === \`"en"\`
- \`name\` / \`description\` / \`action.default_title\` 全部以 \`__MSG_\` 起头

或一行执行：\`pnpm verify:manifest\`

### #2 — i18n hello-world（FND-06 + ROADMAP 成功标准 #2）

1. 浏览器 UI 语言设为英文，重启浏览器，打开 \`chrome://extensions\`，**Reload** 扩展
2. 点击工具栏 Web2Chat 图标 → popup 显示 \`Hello, world (×N)\`
3. 把 Chrome UI 语言切换为简体中文，重启，重新 Reload 扩展
4. 再次点击图标 → popup 显示 \`你好，世界 ×N\`

### #3 — popup ↔ SW ↔ storage 链路（FND-03 + ROADMAP 成功标准 #3）

1. 加载 unpacked 后点击 action 图标 → popup 显示 \`(×1)\`（或 \`×1\`）
2. 关闭 popup，再点击 action 图标 → 显示 \`(×2)\`
3. 关闭浏览器进程，重新启动，加载扩展，再点击 → 显示 \`(×3)\`（证明 chrome.storage.local 跨进程持久化）

### #4 — SW 重启韧性（FND-02 + ROADMAP 成功标准 #4）

1. 加载 unpacked 后点击图标 → 记下当前 helloCount（设为 N）
2. 在 \`chrome://extensions\` 卡片上展开 **Inspect views** → 点击 \`service worker\` → 在 DevTools 顶部点击 **Stop**（红色方块按钮）
3. 立即点击 action 图标 → popup 显示 \`(×{N+1})\`，证明：
   - SW 监听器在模块顶层同步注册（FND-02）
   - chrome.scripting / chrome.runtime listener 在 SW 唤醒时正确恢复
   - 没有依赖任何模块作用域状态（陷阱 3）

或一行执行：\`pnpm test:e2e\`（Playwright 自动用 \`chrome.runtime.reload\` 模拟同等路径）

### #5 — 校验 CI 步骤本地复现（D-11 + ROADMAP 成功标准 #5）

\`\`\`bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:manifest
\`\`\`

以上 5 步都通过即满足 GitHub Actions \`ci.yml\` 的全部 job。Playwright e2e **不**在 CI 跑（D-11，留 Phase 4），本地仍可 \`pnpm test:e2e\`。

## 项目结构

\`\`\`
.
├── entrypoints/
│   ├── background.ts          # service worker — 顶层 listener 注册
│   └── popup/                 # popup（Preact + Tailwind v4）
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       └── style.css
├── shared/
│   ├── messaging/             # zod 校验的 RPC 协议（@webext-core/messaging）
│   ├── storage/               # 类型化 chrome.storage.local 包装 + migration 框架
│   └── i18n/                  # @wxt-dev/i18n facade
├── assets/locales/            # en.yml / zh_CN.yml — 真值来源（YAML，按 STACK.md §i18n 边界）
├── tests/
│   ├── unit/                  # Vitest + happy-dom + WXT fakeBrowser
│   └── e2e/                   # Playwright + launchPersistentContext
├── scripts/
│   └── verify-manifest.ts     # CI 也调用同一脚本
├── .github/workflows/ci.yml   # install + typecheck + lint + vitest + verify:manifest（无 Playwright）
├── wxt.config.ts
└── .planning/                 # GSD 工作流产物（roadmap / phases / research）
\`\`\`

## Phase 1 之后

见 \`.planning/ROADMAP.md\`：
- Phase 2 — 抓取流水线（Readability + DOMPurify + Turndown）
- Phase 3 — 投递核心 + popup UI（send_to / prompt 历史 / 草稿 / 幂等性）
- Phase 4 — OpenClaw 适配器（首个端到端投递目标）
- Phase 5 — Discord 适配器（Slate 编辑器 + ClipboardEvent 注入）
- Phase 6 — i18n 加固 + 打磨（运行时切换 + 完整版硬编码字符串 lint）
- Phase 7 — 分发（Web Store zip + PRIVACY.md + 双语 README）
```

2. 跑 `pnpm verify:manifest`、`pnpm test`、`pnpm typecheck`、`pnpm lint` 全部通过 — 这就是 Phase 1 完成的最后闭环。
3. 跑 `pnpm test:e2e` 至少一次（开发机本地）确认 3 条 e2e 全绿（D-11 不进 CI；本地必须可跑）。
  </action>
  <verify>
    <automated>test -f README.md &amp;&amp; grep -q 'Load unpacked' README.md &amp;&amp; grep -q 'Service worker' README.md &amp;&amp; grep -q 'pnpm verify:manifest' README.md &amp;&amp; grep -q 'pnpm test:e2e' README.md &amp;&amp; pnpm verify:manifest &amp;&amp; pnpm test &amp;&amp; pnpm typecheck &amp;&amp; pnpm lint &amp;&amp; echo 'Phase 1 final loop OK'</automated>
  </verify>
  <done>
    - `README.md` 含：开发环境、快速开始（脚本表）、加载 unpacked 步骤、Phase 1 手测脚本（#1-#5）、项目结构、Phase 2-7 路线图引用
    - 4 条 CI-equivalent 命令（typecheck / lint / test / verify:manifest）全绿
    - `pnpm test:e2e` 本地至少跑一次全绿（在 SUMMARY.md 中贴日志）
    - 满足 ROADMAP §"Phase 1" 全部 5 条成功标准的可观察证据
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 用户点击工具栏图标 ↔ popup HTML | 用户手势触发；popup 是 chrome-extension:// origin（受默认 CSP 保护，无 unsafe-eval / unsafe-inline） |
| popup ↔ SW （chrome.runtime.sendMessage） | 由 Plan 03 zod schema 校验 |
| Playwright e2e ↔ unpacked extension | 仅本地开发机环境；--load-extension 不进 CI（D-11） |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-4-01 | Cross-Site Scripting (V14.5 — Browser security headers) | entrypoints/popup/App.tsx 渲染 errorMessage.value | mitigate | Preact 默认对 `{children}` 做转义；errorMessage.value 是 Result.message 字符串（在 SW 内由 wrapHandler 限制为 err.message — 已剔除 stack）；不存在 dangerouslySetInnerHTML 调用；popup CSP 不放宽（继承 extension_pages 默认） |
| T-01-4-02 | Information Disclosure (V8.1 — Data classification at rest) | popup hello 文案 | accept | 仅渲染数值 helloCount，无 PII；chrome.storage.local 在用户机器本地，未跨设备 |
| T-01-4-03 | Tampering (V13.1 — Cross-context message integrity) | popup → SW RPC payload | mitigate | sendMessage 由 Plan 03 zod schema 在 SW handler 入口验证；popup 即便被注入恶意脚本也无法越过 schema（INPUT 是 z.void()，任何参数都被拒） |
| T-01-4-04 | Denial of Service | popup mount 时无限循环触发 bumpHello | mitigate | useEffect dep array 是 `[]` — 仅 mount 时触发一次；cancelled flag 防止 unmount 后 setState；chrome.storage.local 写入是单 increment，配额安全 |
| T-01-4-05 | Spoofing | Playwright fixture 加载错误 extension 路径 | accept | 仅本地开发；fixture 用 cwd-relative 解析 `.output/chrome-mv3`，不存在远程路径 |
</threat_model>

<verification>
- `pnpm install && pnpm build && pnpm verify:manifest && pnpm typecheck && pnpm lint && pnpm test` 全绿
- `.output/chrome-mv3` 可通过 `chrome://extensions → Load unpacked` 加载并显示工具栏图标（Plan 04 Task 3 README #1 + 手测）
- 点击图标后 popup 渲染 `Hello, world (×N)` 或 `你好，世界 ×N`（视浏览器 UI 语言 — Plan 04 Task 3 手测 #2）
- 重复打开 popup helloCount 严格 +1（Playwright Task 2 + 手测 #3）
- chrome://extensions → Stop service worker 后再点击图标 popup 仍 +1（Playwright Task 2 第三个 spec + 手测 #4）
- `tests/e2e/popup-rpc.spec.ts` 至少 3 条 test
- `.github/workflows/ci.yml` 不含 Playwright（D-11）
- `entrypoints/popup/App.tsx` 中 JSX 文本节点无任何裸字符串字面量（grep + ESLint）
- README 包含 5 条手测脚本（#1-#5）
</verification>

<success_criteria>
- ROADMAP §"Phase 1" 5 条成功标准全部可观察、全部由本 plan 的产物覆盖
- FND-01（MV3 骨架可加载、有图标）+ FND-06（i18n + en/zh_CN + popup hello）端到端验证
- Phase 1 milestone 整体可交付：克隆仓库 → pnpm install → pnpm build → 加载 unpacked → 双语 hello-world 工作 → 杀 SW 仍工作 → CI 全绿
- 后续 Phase 2 可直接在本扩展骨架上叠加 capture 流水线（CAP-01..05），不需要重写任何 Phase 1 代码
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-4-SUMMARY.md` capturing:
- Tailwind v4 + Vite 7 + WXT 0.20.x 集成在执行机器上的实际表现（D-10 — 如有 deviation 详细记录）
- Playwright launchPersistentContext + --load-extension 在本机 Chromium 上是否一次跑通
- 3 条 e2e test 的实际通过日志（特别是 SW reload 那条）
- README 中 5 条手测路径执行者本人的目检结果
- 任何与 STACK.md 锁版本的偏差（如 @webext-core/messaging 的实际版本 — Plan 01 落地时已记录，本 plan 引用时再次确认）
</output>
</content>
