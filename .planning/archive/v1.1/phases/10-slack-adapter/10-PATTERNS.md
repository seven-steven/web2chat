# Phase 10: Slack 适配器 - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 16 (7 new + 5 modify + 4 new tests)
**Analogs found:** 15 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/adapters/slack-format.ts` | utility | transform | `shared/adapters/discord-format.ts` | exact |
| `shared/adapters/slack-login-detect.ts` | utility | request-response | `shared/adapters/discord-login-detect.ts` | exact |
| `entrypoints/slack.content.ts` | controller | request-response | `entrypoints/discord.content.ts` | exact |
| `background/injectors/slack-main-world.ts` | utility | request-response | `background/injectors/discord-main-world.ts` | exact |
| `shared/adapters/registry.ts` (MODIFY) | config | request-response | (self) | self |
| `background/main-world-registry.ts` (MODIFY) | config | request-response | (self) | self |
| `wxt.config.ts` (MODIFY) | config | request-response | (self) | self |
| `locales/en.yml` (MODIFY) | config | transform | (self) | self |
| `locales/zh_CN.yml` (MODIFY) | config | transform | (self) | self |
| `scripts/verify-manifest.ts` (MODIFY) | config | request-response | (self) | self |
| `tests/unit/adapters/slack-format.spec.ts` | test | transform | `tests/unit/adapters/discord-format.spec.ts` | exact |
| `tests/unit/adapters/slack-login-detect.spec.ts` | test | request-response | `tests/unit/adapters/discord-login-detect.spec.ts` | exact |
| `tests/unit/adapters/slack-selector.spec.ts` | test | request-response | `tests/unit/adapters/discord-selector.spec.ts` | exact |
| `tests/unit/adapters/slack-match.spec.ts` | test | request-response | `tests/unit/adapters/discord-match.spec.ts` | exact |
| `tests/unit/adapters/slack.fixture.html` | test | file-I/O | `tests/unit/adapters/discord.fixture.html` | exact |
| `tests/unit/adapters/slack-i18n.spec.ts` | test | transform | (no exact analog) | none |

## Pattern Assignments

### `shared/adapters/slack-format.ts` (utility, transform)

**Analog:** `shared/adapters/discord-format.ts`

**Imports pattern** (无 WXT / chrome.* 导入):
```typescript
// discord-format.ts lines 1-5
/**
 * Discord message formatting (D-54, D-55, D-57, D-58).
 * Pure utility — no WXT or chrome.* imports.
 * Imported by both the adapter content script and unit tests.
 */
```

**Snapshot interface** (lines 7-13):
```typescript
export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}
```

**Escape mentions pattern** (lines 23-29):
```typescript
export function escapeMentions(text: string): string {
  // Break @everyone and @here
  let result = text.replace(/(?<!\w)@(everyone|here)\b/g, '@​$1');
  // Break <@id>, <@!id>, <@&id>, <#id>
  result = result.replace(/<(@[!&]?\d+|#\d+)>/g, '<​$1>');
  return result;
}
```

Slack 版本需要替换为 Slack mention 格式：
- `<!everyone>`, `<!here>`, `<!channel>` 替换（ZWS 插入 `!` 之后）
- `<@U123>`, `<@W123>` user mention 替换（ZWS 插入 `<` 之后）
- `<#C123>` channel mention 替换
- `@everyone`, `@here` bare mention 替换

**Compose 函数结构** (lines 39-61) — 字段排列与 Discord 完全一致，只替换 markdown 语法：
```typescript
export function composeDiscordMarkdown(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel?: string;
}): string {
  const { prompt, snapshot, timestampLabel = '采集时间:' } = payload;

  const safePrompt = prompt ? escapeMentions(prompt) : '';
  const safeTitle = snapshot.title ? escapeMentions(snapshot.title) : '';
  const safeDescription = snapshot.description ? escapeMentions(snapshot.description) : '';
  const safeContent = snapshot.content ? escapeMentions(snapshot.content) : '';

  const lines: string[] = [];
  if (safePrompt) lines.push(safePrompt, '');
  if (safeTitle) lines.push(`**${safeTitle}**`, '');  // Slack: `*${safeTitle}*`
  if (snapshot.url) lines.push(snapshot.url, '');
  if (safeDescription) lines.push(`> ${safeDescription}`, '');
  if (snapshot.create_at) lines.push(`> ${timestampLabel} ${snapshot.create_at}`, '');
  if (safeContent) lines.push(safeContent);

  return lines.join('\n').trim();
}
```

**关键差异 (D-128, D-129, D-131):**
- bold: `**text**` -> `*text*` (mrkdwn)
- 不需要 truncation（Slack 40K 字符限制）
- 不需要 `DISCORD_CHAR_LIMIT` / `TRUNCATION_SUFFIX` 常量
- 字段排列顺序不变：prompt -> title -> url -> description -> timestamp -> content

---

### `shared/adapters/slack-login-detect.ts` (utility, request-response)

**Analog:** `shared/adapters/discord-login-detect.ts`

**完整实现** (全文件 30 行):
```typescript
/**
 * Discord login wall DOM detection (debug session
 * discord-login-detection, fix applied 2026-05-07).
 *
 * Lives in `shared/adapters/` so tests (jsdom) and the discord
 * content-script bundle can import the same implementation. No
 * `chrome.*` APIs — pure DOM lookups, safe for popup/SW bundling
 * even though only the content script invokes it at runtime.
 */
export function detectLoginWall(): boolean {
  return Boolean(
    document.querySelector('input[name="email"][type="email"]') ||
    document.querySelector('[class*="authBox"]') ||
    document.querySelector('a[href="/login"]'),
  );
}
```

Slack 版本需要替换 DOM 选择器。研究推荐标记：
- `input[type="email"][name="email"]` (Slack signin 页面的邮箱输入框)
- `button[data-qa="sign_in_button"]` (Slack 登录按钮)
- `[class*="signin"]` (signin 容器 class fragment)
- `[class*="login"]` (login overlay)

**关键注意 (RESEARCH Pitfall 1):** Slack 登录重定向从 `app.slack.com` 跨域到 `slack.com`，URL 层 `loggedOutPathPatterns` 无法捕获。DOM 层检测是 Slack 的必须防护。

---

### `entrypoints/slack.content.ts` (controller, request-response)

**Analog:** `entrypoints/discord.content.ts`

**Imports pattern** (lines 24-27):
```typescript
import { defineContentScript } from '#imports';
import { composeDiscordMarkdown } from '@/shared/adapters/discord-format';
import { detectLoginWall } from '@/shared/adapters/discord-login-detect';
import type { DispatchWarning, SelectorConfirmation } from '@/shared/messaging';
```

Slack 替换：
```typescript
import { composeSlackMrkdwn } from '@/shared/adapters/slack-format';
import { detectLoginWall } from '@/shared/adapters/slack-login-detect';
```

**常量定义** (lines 29-33):
```typescript
const WAIT_TIMEOUT_MS = 5000;
const LOGIN_WALL_PROBE_MS = 1500;
const RATE_LIMIT_MS = 5000;
const PLATFORM_ID = 'discord';
const MAIN_WORLD_PORT = `WEB2CHAT_MAIN_WORLD:${PLATFORM_ID}`;
```

Slack 替换：`PLATFORM_ID = 'slack'`。其余超时值可继承相同默认值。

**三层选择器 fallback** (lines 116-129) — ARIA-first 三层策略，Slack 版本替换为 Quill 编辑器选择器：
```typescript
// Discord 版本 (参考结构)
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]');
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  const tier2 = document.querySelector<HTMLElement>('[data-slate-editor="true"]');
  if (tier2) return { element: tier2, tier: 'tier2-data', lowConfidence: false };

  const tier3 = document.querySelector<HTMLElement>(
    'div[class*="textArea"] [contenteditable="true"]',
  );
  if (tier3) return { element: tier3, tier: 'tier3-class-fragment', lowConfidence: true };

  return null;
}
```

Slack Quill 编辑器三层选择器（来自 RESEARCH）：
- Tier 1: `.ql-editor[role="textbox"][contenteditable="true"]` (ARIA + Quill class)
- Tier 2: `.ql-editor[contenteditable="true"]` (Quill class + contenteditable)
- Tier 3: `#msg_input [contenteditable="true"]` (ID-based, low confidence)

**waitForReady racing pattern** (lines 140-177) — editor vs login wall MutationObserver 竞速，完全复用：

```typescript
function waitForReady(
  timeoutMs: number,
): Promise<{ kind: 'editor'; match: EditorMatch } | { kind: 'login' } | { kind: 'timeout' }> {
  const eagerEditor = findEditor();
  if (eagerEditor) return Promise.resolve({ kind: 'editor', match: eagerEditor });
  if (detectLoginWall()) return Promise.resolve({ kind: 'login' });

  return new Promise((resolve) => {
    let settled = false;
    const observer = new MutationObserver(() => { /* ... */ });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => { /* ... */ }, timeoutMs);
  });
}
```

**Content script 入口** (lines 205-225):
```typescript
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_discord_registered?: boolean;
    };
    if (guarded.__web2chat_discord_registered) return;
    guarded.__web2chat_discord_registered = true;

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});
```

Slack 替换 guard flag: `__web2chat_slack_registered`。

**handleDispatch 主体** (lines 227-374) — 完整流程：
1. URL 层登录检测 (`isLoggedOutPath`)
2. DOM 层登录检测 (`detectLoginWall()`)
3. Channel ID 提取与校验 (`extractChannelId`)
4. Rate limit 检查
5. `waitForReady` racing (editor vs login wall)
6. Selector confidence warning (tier3)
7. `composeSlackMrkdwn()` 格式化
8. MAIN world paste bridge (`injectMainWorldPaste`)
9. Send confirmation (editor textContent clear check)
10. Rate limit timestamp 记录

Slack 的 `extractChannelId` 需要适配 Slack URL 格式：`/client/<workspace>/<channel>` -> parts[3]。

**__testing export** (lines 403-413):
```typescript
export const __testing = {
  findEditor,
  handleDispatch,
  setMainWorldPasteForTest(fn: typeof injectMainWorldPaste): void {
    mainWorldPasteForTest = fn;
  },
  resetTestOverrides(): void {
    mainWorldPasteForTest = null;
    lastSendTime.clear();
  },
};
```

---

### `background/injectors/slack-main-world.ts` (utility, request-response)

**Analog:** `background/injectors/discord-main-world.ts`

**完整实现** (全文件 78 行):
```typescript
/**
 * Discord MAIN world paste injector.
 * Runs in MAIN world context via chrome.scripting.executeScript.
 * Finds Slate editor, dispatches synthetic ClipboardEvent with formatted text.
 */
export async function discordMainWorldPaste(text: string): Promise<boolean> {
  const active = document.activeElement;
  const editor =
    (active instanceof HTMLElement &&
    (active.matches('[role="textbox"][aria-label*="Message"]') ||
      active.matches('[data-slate-editor="true"]') ||
      active.matches('[contenteditable="true"]'))
      ? active
      : null) ??
    document.querySelector<HTMLElement>('[role="textbox"][aria-label*="Message"]') ??
    document.querySelector<HTMLElement>('[data-slate-editor="true"]') ??
    document.querySelector<HTMLElement>('div[class*="textArea"] [contenteditable="true"]');

  if (!editor) return false;

  editor.focus();

  // Pre-paste cleanup
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  editor.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }),
  );
  editor.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  );

  // Post-Enter clear (200ms delay)
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
  }
  return true;
}
```

Slack 版本替换选择器为 Quill `.ql-editor` 系列：
- Active element check: `.ql-editor[role="textbox"]` / `.ql-editor[contenteditable="true"]` / `[contenteditable="true"]`
- Fallback queries: `.ql-editor[role="textbox"]` -> `.ql-editor[contenteditable="true"]` -> `#msg_input [contenteditable="true"]`

**注意 (RESEARCH Pitfall 2):** Quill 的 `beforeinput` 处理与 Slate 不同。planner 应测试 pre-paste cleanup 是否在 Quill 上有效，必要时回退到 `selectAll()` + `deleteContentBackward`。

---

### `shared/adapters/registry.ts` (MODIFY, config)

**当前代码** (lines 32-89) — 追加 slack entry：
```typescript
export const adapterRegistry: readonly AdapterRegistryEntry[] = [
  defineAdapter({ id: 'mock', ... }),
  defineAdapter({ id: 'openclaw', ... }),
  defineAdapter({
    id: 'discord',
    match: (url: string): boolean => { /* ... */ },
    scriptFile: 'content-scripts/discord.js',
    hostMatches: ['https://discord.com/*'],
    iconKey: 'platform_icon_discord',
    spaNavigationHosts: ['discord.com'],
    loggedOutPathPatterns: ['/', '/login*', '/register*'],
  }),
];
```

追加在 discord entry 之后：
```typescript
defineAdapter({
  id: 'slack',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return (
        u.hostname === 'app.slack.com' &&
        u.pathname.startsWith('/client/') &&
        u.pathname.split('/').filter(Boolean).length >= 3
      );
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/slack.js',
  hostMatches: ['https://app.slack.com/*'],
  iconKey: 'platform_icon_slack',
  spaNavigationHosts: ['app.slack.com'],
  loggedOutPathPatterns: ['/check-login*', '/signin*', '/workspace-signin*'],
}),
```

---

### `background/main-world-registry.ts` (MODIFY, config)

**当前代码** (lines 14-18) — 追加 slack injector：
```typescript
import { discordMainWorldPaste } from '@/background/injectors/discord-main-world';

export const mainWorldInjectors = new Map<string, (text: string) => Promise<boolean>>([
  ['discord', discordMainWorldPaste],
]);
```

追加：
```typescript
import { slackMainWorldPaste } from '@/background/injectors/slack-main-world';

export const mainWorldInjectors = new Map<string, (text: string) => Promise<boolean>>([
  ['discord', discordMainWorldPaste],
  ['slack', slackMainWorldPaste],
]);
```

---

### `wxt.config.ts` (MODIFY, config)

**当前 host_permissions** (line 27):
```typescript
host_permissions:
  mode === 'development' ? ['https://discord.com/*', '<all_urls>'] : ['https://discord.com/*'],
```

修改为：
```typescript
host_permissions:
  mode === 'development'
    ? ['https://app.slack.com/*', 'https://discord.com/*', '<all_urls>']
    : ['https://app.slack.com/*', 'https://discord.com/*'],
```

---

### `locales/en.yml` + `locales/zh_CN.yml` (MODIFY, config)

**Discord ToS pattern** (en.yml lines 244-248):
```yaml
# Group J — Discord ToS (D-59, D-61)
discord_tos_warning:
  message: 'Discord dispatch uses DOM injection and may violate Discord Terms of Service.'
discord_tos_details:
  message: 'Details'
```

Slack 追加（Group J 之后或新 Group L）：

en.yml:
```yaml
# Group L — Slack ToS (D-132)
slack_tos_warning:
  message: 'Slack dispatch uses DOM injection and may violate Slack Terms of Service.'
slack_tos_details:
  message: 'Details'
```

zh_CN.yml:
```yaml
# Group L — Slack ToS (D-132)
slack_tos_warning:
  message: 'Slack 投递使用 DOM 注入，可能违反 Slack 服务条款。'
slack_tos_details:
  message: '详情'
```

同时在 Group G (platform icon tooltips) 追加：

en.yml:
```yaml
platform_icon_slack:
  message: 'Slack'
```

zh_CN.yml:
```yaml
platform_icon_slack:
  message: 'Slack'
```

---

### `scripts/verify-manifest.ts` (MODIFY, config)

**当前断言** (line 79):
```typescript
expectSet('host_permissions', manifest.host_permissions, ['https://discord.com/*']);
```

修改为：
```typescript
expectSet('host_permissions', manifest.host_permissions, ['https://app.slack.com/*', 'https://discord.com/*']);
```

---

### `tests/unit/adapters/slack-format.spec.ts` (test, transform)

**Analog:** `tests/unit/adapters/discord-format.spec.ts`

**测试结构** (127 行) — 两个 describe block:
1. `composeSlackMrkdwn` 测试：格式化输出、空字段省略、prompt 省略
2. `escapeSlackMentions` 测试：每种 mention 模式的 escape 验证

Slack 版本关键差异：
- bold 用 `*text*` 而非 `**text**`
- 无 truncation 测试（D-129）
- mention escape 测试覆盖 `<!everyone>`, `<!here>`, `<@U123>`, `<@W123>`, `<#C123>` 格式
- 不需要 `DISCORD_CHAR_LIMIT` 相关断言

**imports pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { composeSlackMrkdwn, escapeSlackMentions } from '@/shared/adapters/slack-format';
```

---

### `tests/unit/adapters/slack-login-detect.spec.ts` (test, request-response)

**Analog:** `tests/unit/adapters/discord-login-detect.spec.ts`

**测试结构** (75 行) — 一个 describe block，覆盖：
- 正常 channel UI（应返回 false）
- 各登录标记的 true 检测
- 空 body（应返回 false）
- 边缘情况（stale contenteditable + login UI 共存）

Slack 版本替换 DOM fixture 为 Slack 登录页标记：
- `input[type="email"][name="email"]` fixture
- `button[data-qa="sign_in_button"]` fixture
- `[class*="signin"]` fixture
- 正常编辑器 + 非 login 标记（应返回 false）

---

### `tests/unit/adapters/slack-selector.spec.ts` (test, request-response)

**Analog:** `tests/unit/adapters/discord-selector.spec.ts`

**测试结构** (273 行) — 四个 describe block:
1. `Discord selector fallback` — 三层 fallback + 全失败
2. `Discord selector confidence warnings` — tier1/tier2/tier3 置信度 + timeout budget
3. `Discord paste injection` — ClipboardEvent paste + bubble
4. `Discord message list container` — data-list-id 查找

Slack 版本替换：
1. 三层 Quill 选择器 fallback（tier1: `.ql-editor[role="textbox"]` -> tier2: `.ql-editor[contenteditable]` -> tier3: `#msg_input [contenteditable]`）
2. Selector confidence + timeout budget（复用 `__testing` export 模式）
3. ClipboardEvent paste 注入验证（与 Discord 结构一致）
4. 可选：Slack 消息列表容器检测

**fixture 加载 pattern** (lines 7-9):
```typescript
const fixtureHtml = readFileSync(resolve(__dirname, 'discord.fixture.html'), 'utf-8');
const bodyMatch = fixtureHtml.match(/<body>([\s\S]*)<\/body>/);
const fixtureBody = bodyMatch?.[1]?.trim() ?? '';
```

---

### `tests/unit/adapters/slack-match.spec.ts` (test, request-response)

**Analog:** `tests/unit/adapters/discord-match.spec.ts`

**测试结构** (41 行) — valid/invalid URL 两组：
```typescript
import { findAdapter, detectPlatformId } from '@/shared/adapters/registry';

describe('adapters/slack — match (SLK-01)', () => {
  const validUrls = [
    'https://app.slack.com/client/worksapce123/channel456',
    'https://app.slack.com/client/w/c?foo=bar',
  ];

  const invalidUrls = [
    { url: 'https://app.slack.com/client/', label: 'missing workspace + channel' },
    { url: 'https://app.slack.com/client/w/', label: 'missing channel' },
    { url: 'https://slack.com/check-login', label: 'wrong host (slack.com vs app.slack.com)' },
    { url: 'https://discord.com/channels/1/2', label: 'discord URL' },
    { url: 'not-a-url', label: 'malformed' },
    { url: '', label: 'empty' },
  ];
});
```

---

### `tests/unit/adapters/slack.fixture.html` (test, file-I/O)

**Analog:** `tests/unit/adapters/discord.fixture.html`

**Discord fixture 结构** (35 行):
```html
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>Discord Fixture</title></head>
<body>
  <div id="app-mount">
    <div class="chat-xyz123">
      <div data-list-id="chat-messages-12345" role="list">...</div>
      <div class="textArea-def456">
        <div role="textbox" aria-label="Message #general"
             contenteditable="true" data-slate-editor="true">
          <div data-slate-node="element">...</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

Slack fixture 替换为 Quill 编辑器 DOM：
```html
<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><title>Slack Fixture</title></head>
<body>
  <div id="client_XXXX">
    <div class="p-workspace">
      <div class="p-message_pane" role="main">
        <div class="c-message_list" role="list">...</div>
      </div>
      <div id="msg_input">
        <div class="ql-editor" role="textbox" contenteditable="true" aria-label="Message #general">
          <p><br></p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Shared Patterns

### Adapter Registry Entry
**Source:** `shared/adapters/registry.ts` lines 69-88
**Apply to:** `registry.ts` 修改
```typescript
defineAdapter({
  id: '<platform>',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.hostname === '<host>' && u.pathname.startsWith('/<path>/');
    } catch { return false; }
  },
  scriptFile: 'content-scripts/<platform>.js',
  hostMatches: ['https://<host>/*'],
  iconKey: 'platform_icon_<platform>',
  spaNavigationHosts: ['<host>'],
  loggedOutPathPatterns: ['/', '/login*'],
}),
```

### MAIN World Injector Registry
**Source:** `background/main-world-registry.ts` lines 14-18
**Apply to:** `main-world-registry.ts` 修改
```typescript
import { <platform>MainWorldPaste } from '@/background/injectors/<platform>-main-world';

export const mainWorldInjectors = new Map<string, (text: string) => Promise<boolean>>([
  ['discord', discordMainWorldPaste],
  ['<platform>', <platform>MainWorldPaste],
]);
```

### Content Script Injection Guard
**Source:** `entrypoints/discord.content.ts` lines 205-224
**Apply to:** `entrypoints/slack.content.ts`
```typescript
export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    const guarded = globalThis as typeof globalThis & {
      __web2chat_<platform>_registered?: boolean;
    };
    if (guarded.__web2chat_<platform>_registered) return;
    guarded.__web2chat_<platform>_registered = true;

    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!isAdapterDispatch(msg)) return false;
      void handleDispatch(msg.payload).then(sendResponse);
      return true;
    });
  },
});
```

### AdapterDispatchMessage / Response Types
**Source:** `entrypoints/discord.content.ts` lines 43-66
**Apply to:** `entrypoints/slack.content.ts`
```typescript
interface AdapterDispatchMessage {
  type: 'ADAPTER_DISPATCH';
  payload: {
    dispatchId: string;
    send_to: string;
    prompt: string;
    snapshot: { title: string; url: string; description: string; create_at: string; content: string; };
    selectorConfirmation?: SelectorConfirmation;
  };
}

interface AdapterDispatchResponse {
  ok: boolean;
  code?: 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED' | 'NOT_LOGGED_IN' | 'INTERNAL';
  message?: string;
  retriable?: boolean;
  warnings?: DispatchWarning[];
}
```

### Test __testing Export Pattern
**Source:** `entrypoints/discord.content.ts` lines 403-413
**Apply to:** `entrypoints/slack.content.ts`
```typescript
export const __testing = {
  findEditor,
  handleDispatch,
  setMainWorldPasteForTest(fn: typeof injectMainWorldPaste): void { mainWorldPasteForTest = fn; },
  resetTestOverrides(): void { mainWorldPasteForTest = null; lastSendTime.clear(); },
};
```

### i18n Key Addition Pattern
**Source:** `locales/en.yml` Group G + Group J
**Apply to:** `locales/en.yml` + `locales/zh_CN.yml`
- 在 Group G 追加 `platform_icon_slack`
- 在 Group J 之后追加 Group L `slack_tos_warning` + `slack_tos_details`
- en + zh_CN 必须 100% key 覆盖

### Verify Manifest Assertion Pattern
**Source:** `scripts/verify-manifest.ts` line 79
**Apply to:** `scripts/verify-manifest.ts`
```typescript
expectSet('host_permissions', manifest.host_permissions, [
  'https://app.slack.com/*',
  'https://discord.com/*',
]);
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/unit/adapters/slack-i18n.spec.ts` | test | transform | 无现有 adapter i18n 测试；需要验证 `platform_icon_slack` / `slack_tos_warning` / `slack_tos_details` 在 en + zh_CN 中存在。planner 可参考 `discord-match.spec.ts` 的 registry import 模式 + 直接读取 yml 文件验证 key 存在 |

## Metadata

**Analog search scope:** `shared/adapters/`, `entrypoints/`, `background/injectors/`, `background/`, `locales/`, `scripts/`, `tests/unit/adapters/`, `wxt.config.ts`
**Files scanned:** 19
**Pattern extraction date:** 2026-05-12
