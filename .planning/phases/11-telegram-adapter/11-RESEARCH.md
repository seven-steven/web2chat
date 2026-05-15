# Phase 11: Telegram Adapter - Research

**Researched:** 2026-05-16
**Domain:** Telegram Web K DOM injection adapter for Chrome MV3 extension
**Confidence:** HIGH (architecture patterns verified against v1 codebase) / MEDIUM (Telegram Web K DOM specifics — no live DOM verification performed)

## Summary

Phase 11 delivers a complete Telegram Web K (`web.telegram.org/a/`) dispatch pipeline for web2chat. The adapter follows the established registry-driven pattern from Phases 8-10: registry entry → content script → MAIN world paste bridge → send confirmation. Telegram Web K uses a custom `contenteditable` div (not Quill/Slate), which makes ClipboardEvent paste in MAIN world the appropriate injection strategy — same technical approach as Discord/Slack, but with Telegram-specific selectors and a 4096-character hard limit that mandates truncation logic (unlike Slack's 40K limit).

Key research decisions resolved:
- **Formatting (D-141):** Plain text paste — Telegram Web K's `cleanHtml` paste sanitizer strips external HTML formatting. MarkdownV2 syntax would be lost on paste. We emit plain text with metadata-first field ordering.
- **Injection (D-150):** MAIN world ClipboardEvent paste — DataTransfer must be created in MAIN world for Telegram's contenteditable to read it. Same bridge pattern as Discord/Slack.
- **Send confirmation (D-151):** Editor textContent clearance polling — simpler than MutationObserver on Telegram's virtual-scrolled chat list, and consistent with Slack's proven approach.
- **Login detection (D-152):** URL hash check (`#/auth`) + DOM probe for phone input as layered defense. Telegram Web K uses hash-based routing, so pathname-based `loggedOutPathPatterns` is insufficient alone.
- **Editor selector (D-153):** Three-tier ARIA-first fallback: `.input-message-input[contenteditable="true"]` > `.rows-wrapper [contenteditable="true"]` > `.new-message-wrapper [contenteditable="true"]` (tier3, low confidence).

**Primary recommendation:** Implement Telegram adapter as a near-structural clone of the Slack adapter (same patterns: registry entry, MAIN world paste bridge, editor-clearance confirmation, three-tier selector, rate limiting), with Telegram-specific selectors, plain-text formatting, and 4096-character metadata-first truncation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL matching / platform detection | Browser / Popup + SW | — | `match()` is pure, runs in popup and SW |
| Login wall detection (URL layer) | API / Backend (SW) | — | `loggedOutPathPatterns` evaluated in dispatch-pipeline.ts |
| Login wall detection (DOM layer) | Browser / Client (content script) | — | `detectLoginWall()` runs in target tab ISOLATED world |
| Editor discovery | Browser / Client (content script) | — | `querySelector` in target tab DOM |
| Message formatting | Browser / Client (content script) | — | Pure function, runs in content script pre-injection |
| DOM injection (paste) | Browser / Client (MAIN world) | — | `chrome.scripting.executeScript({ world: 'MAIN' })` |
| Send confirmation | Browser / Client (content script) | — | Polls editor textContent in ISOLATED world |
| i18n / ToS warning | Browser / Popup | — | Popup UI renders `telegram_tos_warning` |
| Rate limiting | Browser / Client (content script) | — | Per-channel timestamp map in content script scope |

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-140: 新建 `shared/adapters/telegram-format.ts`，实现 Telegram 专用格式化。与 `discord-format.ts` / `slack-format.ts` 对称。
- D-141: 格式化程度（纯文本 vs Telegram Markdown 格式保留）由 researcher 在实际 Telegram Web K 编辑器上测试 paste 行为后决定。
- D-142: 字段排列与 Discord/Slack 保持相同结构和顺序：prompt → title → url → description → timestamp → content。只替换 markdown 语法。
- D-143: Telegram 单条消息 4096 字符硬限制，截断策略为 metadata 优先。
- D-144: 截断发生在格式化之后（先转换 markdown，再在最终文本上截断）。
- D-145: 如果 metadata 本身就超过 4096 字符（极端情况），content 完全省略，metadata 按上述优先级保留到 4096 字符处截断。
- D-146: Telegram 复用 Discord/Slack 的 ToS 警告模式。新增 `telegram_tos_warning` 和 `telegram_tos_details` i18n key（en + zh_CN）。
- D-147: v1 仅匹配 Telegram Web K URL：`https://web.telegram.org/a/`。match 函数验证 pathname 以 `/a/` 开头。
- D-148: Telegram Web Z (`/z/`) 和根路径 (`/`) 不在 v1 范围。
- D-149: `hostMatches` 为 `['https://web.telegram.org/*']`，加入静态 `host_permissions`。
- D-150: Telegram Web K 编辑器注入方式由 researcher 调研后决定。
- D-151: 消息发送确认策略由 researcher 调研 Telegram Web K 发送后 DOM 行为后决定。
- D-152: Telegram 登录检测策略由 researcher 调研后决定。
- D-153: Telegram 编辑器选择器策略采用 ARIA-first 三层 fallback（与 Discord/Slack 模式一致）。

### Claude's Discretion
- `telegram-format.ts` 的具体格式化语法映射由 researcher 调研 Telegram Web K paste 行为后决定，只要保持 D-142 的字段排列。
- Telegram MAIN world injector 的具体实现（选择器、pre-paste cleanup、post-send cleanup）交给 planner，参考 `slack-main-world.ts` 或 `discord-main-world.ts` 模式。
- `telegram-login-detect.ts` 的具体 DOM 标记和检测逻辑交给 researcher + planner.
- ToS 警告文案的具体措辞交给 planner，参考 Discord 的 `discord_tos_warning` / `discord_tos_details`.
- 4096 字符截断的具体实现细节（截断标记 i18n key、截断位置是否避免断 UTF-8 等）交给 planner.

### Deferred Ideas (OUT OF SCOPE)
- Telegram Web Z 投递 — `/z/` 路径的 Svelte 版本不在 v1 范围。
- Telegram 根路径投递 — `web.telegram.org/` 根路径路由行为复杂，推后。
- Telegram 消息分割 — 超长内容分割为多条消息发送，属于未来优化。
- Bot API / Telegram Bot API 发送 — 违反"无后端"约束。

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TG-01 | Telegram Web K URL 模式匹配（`https://web.telegram.org/a/`），注册表条目含 `hostMatches: ['https://web.telegram.org/*']` | Registry pattern proven by Discord/Slack; match on hostname + pathname prefix `/a/` |
| TG-02 | Telegram 登录墙检测（URL 层：登录页面路径；DOM 层：登录表单元素），`waitForReady` 竞速登录探测 | URL layer: hash-based `#/auth` detection; DOM layer: phone input / login form markers |
| TG-03 | Telegram Web K contenteditable 编辑器 DOM 注入 — ClipboardEvent paste 或 property-descriptor setter | MAIN world ClipboardEvent paste is correct strategy (custom contenteditable, not textarea) |
| TG-04 | Telegram 消息发送确认 — 发送按钮点击或 Enter 触发后 MutationObserver 等待新消息节点 | Editor textContent clearance polling is simpler and sufficient for Telegram Web K |
| TG-05 | Telegram 平台图标 + `platform_icon_telegram` i18n key（zh_CN + en 100% 覆盖） | Follows same pattern as Discord/Slack icon keys |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.25 | MV3 extension framework | Project standard [VERIFIED: wxt.config.ts] |
| Vitest | 3.2.4 | Unit testing | Project standard [VERIFIED: package.json] |
| `@wxt-dev/i18n` | 0.2.5 | Type-safe i18n | Project standard [VERIFIED: package.json] |
| Preact | 10.29 | Popup UI | Project standard [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chrome.scripting` | MV3 built-in | MAIN world injection | Required for DataTransfer-based paste [VERIFIED: background.ts] |
| `turndown` | 7.2 | Markdown stripping | For `convertMarkdownToPlainText()` in telegram-format.ts [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain text paste | Telegram MarkdownV2 syntax | MarkdownV2 would be stripped by Web K's `cleanHtml` sanitizer on external paste [CITED: PITFALLS.md N5] |
| Editor-clearance confirmation | MutationObserver on `.bubble.is-out` | MutationObserver is more complex and fragile on virtual-scrolled chat lists; editor clearance is sufficient |
| Pathname-based `loggedOutPathPatterns` | Hash-based URL detection | Telegram Web K uses hash routing (`#/auth`); `loggedOutPathPatterns` only checks pathname, so DOM layer is primary defense |

**Version verification:**
```bash
$ npm view wxt version
0.20.25
$ npm view vitest version
3.2.4
```

## Architecture Patterns

### System Architecture Diagram

```
Popup (Preact)
  |
  | dispatch.start({ send_to: "https://web.telegram.org/a/#...", prompt, snapshot })
  v
Service Worker (background.ts)
  |
  |-- findAdapter(url) --> "telegram" registry entry
  |-- chrome.tabs.create/update({ url: send_to })
  |-- tabs.onUpdated: complete (or webNavigation.onHistoryStateUpdated for SPA)
  |-- chrome.scripting.executeScript({ files: ["content-scripts/telegram.js"] })
  v
Telegram Content Script (ISOLATED world)
  |
  |-- handleDispatch()
  |   |-- isLoggedOutPath() ? NOT_LOGGED_IN
  |   |-- detectLoginWall() ? NOT_LOGGED_IN
  |   |-- extractChatId() + channel consistency check
  |   |-- checkRateLimit()
  |   |-- waitForReady() races editor vs login wall
  |   |   |-- findEditor() three-tier selector
  |   |-- composeTelegramMessage() -> plain text, metadata-first, truncated to 4096
  |   |-- injectMainWorldPaste() -> port.connect("WEB2CHAT_MAIN_WORLD:telegram")
  |   v
Service Worker (port.onMessage)
  |
  |-- mainWorldInjectors.get("telegram") -> telegramMainWorldPaste
  |-- chrome.scripting.executeScript({ world: "MAIN", func: telegramMainWorldPaste, args: [text] })
  v
Telegram MAIN World Script
  |
  |-- find editor: .input-message-input[contenteditable="true"]
  |-- pre-paste cleanup: beforeinput[deleteContentBackward] if residual text
  |-- create DataTransfer, setData("text/plain", text)
  |-- dispatch ClipboardEvent("paste")
  |-- click send button (.btn-send) or fallback Enter keydown
  |-- post-send: wait 200ms, cleanup residual text
  v
Telegram Content Script (ISOLATED world)
  |
  |-- poll editor.textContent clearance (300ms x 5 = 1500ms)
  |-- confirmed ? ok=true : TIMEOUT
  v
Popup
  |
  |-- dispatch success / error display
```

### Recommended Project Structure

```
shared/adapters/
  telegram-format.ts        # composeTelegramMessage() + truncation (D-140..D-145)
  telegram-login-detect.ts  # detectLoginWall() DOM probes (D-152)
entrypoints/
  telegram.content.ts       # Adapter content script (TG-01..TG-04)
background/injectors/
  telegram-main-world.ts    # MAIN world paste + send (D-150)
tests/unit/adapters/
  telegram.fixture.html     # DOM fixture for selector tests
  telegram-selector.spec.ts # Three-tier selector + confidence tests
  telegram-format.spec.ts   # Formatting + truncation tests
  telegram-login.spec.ts    # Login detection tests
```

### Pattern 1: Registry-Driven Adapter Registration
**What:** Append `defineAdapter({ id: 'telegram', ... })` to `adapterRegistry` in `shared/adapters/registry.ts`. Popup and SW auto-discover.
**When to use:** All new platform adapters (Phase 8+ established pattern).
**Example:**
```typescript
// Source: shared/adapters/registry.ts (existing pattern)
defineAdapter({
  id: 'telegram',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.hostname === 'web.telegram.org' && u.pathname.startsWith('/a/');
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/telegram.js',
  hostMatches: ['https://web.telegram.org/*'],
  iconKey: 'platform_icon_telegram',
  spaNavigationHosts: ['web.telegram.org'],
  loggedOutPathPatterns: ['/', '/login*'], // pathname only; hash routing handled in content script
}),
```

### Pattern 2: MAIN World Paste Bridge
**What:** ISOLATED world content script opens a port to SW; SW looks up injector from `mainWorldInjectors` map and executes it in `world: 'MAIN'`.
**When to use:** Any platform whose editor requires DataTransfer/ClipboardEvent created in MAIN world (Discord, Slack, Telegram).
**Example:**
```typescript
// Source: background.ts (existing generic bridge)
const injector = mainWorldInjectors.get(platformId);
await chrome.scripting.executeScript({
  target: { tabId },
  world: 'MAIN',
  func: injector,
  args: [text],
});
```

### Pattern 3: Three-Tier ARIA-First Selector Fallback
**What:** Tier 1 uses ARIA attributes (`[role="textbox"]`), Tier 2 uses data attributes, Tier 3 uses class fragments. Tier 3 triggers `SELECTOR_LOW_CONFIDENCE` warning.
**When to use:** All platform adapters (DSPT-04 requirement).
**Example:**
```typescript
// Source: entrypoints/slack.content.ts (existing pattern)
function findEditor(): EditorMatch | null {
  const tier1 = document.querySelector<HTMLElement>('.ql-editor[role="textbox"][contenteditable="true"]');
  if (tier1) return { element: tier1, tier: 'tier1-aria', lowConfidence: false };

  const tier2 = document.querySelector<HTMLElement>('.ql-editor[contenteditable="true"]');
  if (tier2) return { element: tier2, tier: 'tier2-data', lowConfidence: false };

  const tier3 = document.querySelector<HTMLElement>('#msg_input [contenteditable="true"]');
  if (tier3) return { element: tier3, tier: 'tier3-class-fragment', lowConfidence: true };

  return null;
}
```

### Pattern 4: Metadata-First Truncation
**What:** Build message with fields in priority order (prompt > title > url > description > timestamp > content). If total exceeds limit, truncate content first, then description, then hard-truncate with suffix.
**When to use:** Telegram only (4096 char limit). Slack doesn't need it (40K limit). Discord has its own prompt-first truncation.
**Example:**
```typescript
// Source: research finding (new pattern for telegram-format.ts)
const TELEGRAM_CHAR_LIMIT = 4096;
const TRUNCATION_SUFFIX = '\n...[truncated]';

export function composeTelegramMessage(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;

  // Build lines array — empty fields omitted entirely
  const lines: string[] = [];
  if (prompt) lines.push(prompt, '');
  if (snapshot.title) lines.push(snapshot.title, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (snapshot.description) lines.push(snapshot.description, '');
  if (snapshot.create_at) lines.push(`${timestampLabel} ${snapshot.create_at}`, '');
  if (snapshot.content) lines.push(snapshot.content);

  let result = lines.join('\n').trim();

  if (result.length <= TELEGRAM_CHAR_LIMIT) {
    return result;
  }

  // Metadata-first truncation: try removing content, then description
  // ... (see Code Examples section for full implementation)
}
```

### Anti-Patterns to Avoid
- **Using `innerText=` or `textContent=` for injection:** Telegram's contenteditable is a custom editor; direct DOM text assignment bypasses its internal state and causes send button to not activate. Use ClipboardEvent paste or execCommand instead. [CITED: CLAUDE.md §DOM注入]
- **Creating DataTransfer in ISOLATED world:** Cross-V8 boundary causes clipboardData to be empty in MAIN world editor handlers. Always create DataTransfer inside MAIN world executeScript. [CITED: PITFALLS.md N4]
- **Matching both Web K and Web Z in one adapter:** They are independent codebases with completely different DOM structures. v1 scope is Web K only (`/a/`). [CITED: PITFALLS.md N5]
- **Assuming pathname-based login detection is sufficient:** Telegram Web K uses hash routing (`#/auth`). `loggedOutPathPatterns` only checks pathname, so DOM-layer detection is the primary defense. [VERIFIED: web search]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram MarkdownV2 conversion | Custom markdown parser for Telegram | Plain text output (no conversion) | Telegram Web K's `cleanHtml` sanitizer strips external HTML formatting on paste. Even if we emit `*bold*`, the paste processor may not preserve it. Plain text is the reliable path. [CITED: PITFALLS.md N5] |
| Hash-based SPA routing detection | Custom `webNavigation` listener | Reuse existing `spaNavigationHosts` + `buildSpaUrlFilters()` | Already implemented in Phase 8 (D-103..D-106). Telegram entry just needs `spaNavigationHosts: ['web.telegram.org']`. [VERIFIED: shared/adapters/registry.ts] |
| MAIN world bridge | Per-adapter port communication code | Reuse generic bridge in `background.ts` | Phase 8 generic bridge routes by `WEB2CHAT_MAIN_WORLD:<platformId>` prefix. Just add injector to `mainWorldInjectors` map. [VERIFIED: background.ts] |
| Message truncation logic | Simple `slice(0, 4096)` | Metadata-first priority truncation | Hard slice could break in the middle of a multi-byte UTF-8 character or cut off the URL. Need structured truncation with suffix. |
| Login wall detection | Single-layer check | URL layer + DOM layer layered defense | Telegram hash routing means URL layer alone is insufficient. DOM probes catch login overlays on any URL. [CITED: discord-login-detect.ts pattern] |

**Key insight:** The most common hand-roll temptation in this phase will be "let's convert markdown to Telegram MarkdownV2 syntax." Research shows Telegram Web K's paste sanitizer (`cleanHtml`) is designed to strip external HTML and normalize pasted content. External paste from a Chrome extension goes through the same sanitization path as paste from any other web page — formatting tags are stripped. Emitting plain text avoids the complexity of MarkdownV2 escaping (which requires escaping 15+ special characters) and the risk of broken formatting.

## Runtime State Inventory

This phase is a greenfield adapter addition — no rename/refactor/migration. No runtime state inventory needed.

## Common Pitfalls

### Pitfall 1: Telegram Web K Hash Routing Breaks Pathname-Based Login Detection
**What goes wrong:** Developer sets `loggedOutPathPatterns: ['/#/auth']` expecting to catch the login state. But `loggedOutPathPatterns` only checks `URL.pathname`, not `URL.hash`. The pattern never matches.
**Why it happens:** Telegram Web K is a SPA using hash-based routing (`https://web.telegram.org/a/#/auth`). The pathname is always `/a/`, regardless of login state.
**How to avoid:** Use DOM-layer login detection as the primary defense (`telegram-login-detect.ts` probing for phone input / login button). URL-layer `loggedOutPathPatterns` can still catch `/login` or `/auth` pathname variants if Telegram ever changes routing, but don't rely on it.
**Warning signs:** Login wall tests pass with mocked `window.location.hash` but fail in real browser where hash isn't checked.

### Pitfall 2: DataTransfer Created in ISOLATED World Results in Empty Paste
**What goes wrong:** Telegram content script creates `new DataTransfer()` in ISOLATED world, dispatches ClipboardEvent. Telegram's paste handler receives the event but `clipboardData.getData('text/plain')` returns empty string.
**Why it happens:** Chrome's ISOLATED and MAIN worlds run in separate V8 contexts. DataTransfer objects don't cross the boundary intact. [CITED: PITFALLS.md N4]
**How to avoid:** Always route paste through the MAIN world bridge. The injector function in `telegram-main-world.ts` creates DataTransfer inside `world: 'MAIN'` executeScript.
**Warning signs:** Paste event fires but editor remains empty; "¬" artifact characters appear (classic symptom of empty clipboardData).

### Pitfall 3: 4096 Character Limit Not Accounted For in Testing
**What goes wrong:** Tests only use short snapshots. In production, a long article's content pushes the message over 4096 characters, Telegram rejects it or truncates mid-word.
**Why it happens:** Telegram has a hard 4096 character limit per message (Bot API documented, and Web K UI enforces it). Unlike Slack's 40K limit, this is easily exceeded by web articles.
**How to avoid:** Implement metadata-first truncation in `telegram-format.ts` and add unit tests with content > 4096 chars. Test the boundary: exactly 4096 chars (should not truncate), 4097 chars (should truncate with suffix).
**Warning signs:** Messages silently fail to send for long articles; user reports "some pages work, others don't."

### Pitfall 4: Confusing Web K (`/a/`) with Web Z (`/z/`)
**What goes wrong:** Developer tests on `web.telegram.org/k/` or `/z/`, writes selectors that don't match `/a/`. Or the match function is too broad and matches all three.
**Why it happens:** Telegram maintains multiple web clients (Web K, Web Z, Web A) with different codebases and DOM structures. [CITED: PITFALLS.md N5]
**How to avoid:** Match function explicitly checks `pathname.startsWith('/a/')`. v1 scope is Web K only. Document in code comments that `/z/` and `/k/` are out of scope.
**Warning signs:** User reports "Telegram doesn't work" but their URL is `web.telegram.org/k/` not `/a/`.

### Pitfall 5: Send Button Not Found After Paste
**What goes wrong:** Text is pasted into the editor, but the send button doesn't appear or isn't clicked. Message sits in the editor unsent.
**Why it happens:** Telegram Web K's send button visibility is tied to the editor's internal state, not just DOM text content. If paste doesn't trigger the right input events, the button may not activate.
**How to avoid:** In MAIN world injector, after paste dispatch an `input` event to ensure the editor's state machine registers the content change. Then look for send button with multiple fallback selectors (`.btn-send`, `.btn-icon.send`, `[aria-label*="Send"]`).
**Warning signs:** Editor has text but no send button visible; clicking send button fails with "element not interactable."

### Pitfall 6: `host_permissions` Assertion Fails After Adding Telegram
**What goes wrong:** Build passes, but `scripts/verify-manifest.ts` fails because `host_permissions` set doesn't include the new Telegram entry.
**Why it happens:** `verify-manifest.ts` has a hardcoded expected set for `host_permissions`.
**How to avoid:** Update both `wxt.config.ts` (dev + production `host_permissions`) AND `scripts/verify-manifest.ts` assertion. [VERIFIED: verify-manifest.ts line 79-82]
**Warning signs:** CI build fails at manifest verification step.

## Code Examples

### Telegram Registry Entry
```typescript
// Source: pattern from shared/adapters/registry.ts
defineAdapter({
  id: 'telegram',
  match: (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.hostname === 'web.telegram.org' && u.pathname.startsWith('/a/');
    } catch {
      return false;
    }
  },
  scriptFile: 'content-scripts/telegram.js',
  hostMatches: ['https://web.telegram.org/*'],
  iconKey: 'platform_icon_telegram',
  spaNavigationHosts: ['web.telegram.org'],
  loggedOutPathPatterns: ['/', '/login*'],
}),
```

### Telegram MAIN World Paste Injector
```typescript
// Source: pattern from background/injectors/slack-main-world.ts
export async function telegramMainWorldPaste(text: string): Promise<boolean> {
  const editor =
    document.querySelector<HTMLElement>('.input-message-input[contenteditable="true"]') ??
    document.querySelector<HTMLElement>('.rows-wrapper [contenteditable="true"]') ??
    document.querySelector<HTMLElement>('.new-message-wrapper [contenteditable="true"]');

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

  // Trigger input event to activate send button
  editor.dispatchEvent(new Event('input', { bubbles: true }));

  // Wait for send button to appear
  await new Promise<void>((resolve) => setTimeout(resolve, 300));

  // Primary: click send button
  let sent = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const sendBtn =
      document.querySelector<HTMLButtonElement>('.btn-send') ??
      document.querySelector<HTMLButtonElement>('.btn-icon.send') ??
      document.querySelector<HTMLButtonElement>('[aria-label*="Send"]');
    if (sendBtn) {
      sendBtn.click();
      sent = true;
      break;
    }
    if (attempt < 2) await new Promise<void>((resolve) => setTimeout(resolve, 150));
  }

  // Fallback: synthetic Enter
  if (!sent) {
    const enterProps = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
    editor.dispatchEvent(new KeyboardEvent('keydown', enterProps));
    editor.dispatchEvent(new KeyboardEvent('keypress', enterProps));
    editor.dispatchEvent(new KeyboardEvent('keyup', enterProps));
  }

  // Post-send cleanup
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  if ((editor.textContent ?? '').length > 0) {
    editor.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true }),
    );
  }
  return true;
}
```

### Telegram Format with Metadata-First Truncation
```typescript
// Source: new pattern based on discord-format.ts + telegram 4096 limit
const TELEGRAM_CHAR_LIMIT = 4096;
const TRUNCATION_SUFFIX = '\n...[truncated]';

export function composeTelegramMessage(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;

  const lines: string[] = [];
  if (prompt) lines.push(prompt, '');
  if (snapshot.title) lines.push(snapshot.title, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (snapshot.description) lines.push(snapshot.description, '');
  if (snapshot.create_at) lines.push(`${timestampLabel} ${snapshot.create_at}`, '');
  if (snapshot.content) lines.push(snapshot.content);

  let result = lines.join('\n').trim();
  if (result.length <= TELEGRAM_CHAR_LIMIT) return result;

  // Truncate content first
  const headerLines: string[] = [];
  if (prompt) headerLines.push(prompt, '');
  if (snapshot.title) headerLines.push(snapshot.title, '');
  if (snapshot.url) headerLines.push(snapshot.url, '');
  if (snapshot.description) headerLines.push(snapshot.description, '');
  if (snapshot.create_at) headerLines.push(`${timestampLabel} ${snapshot.create_at}`, '');

  const headerText = headerLines.join('\n');
  const headerLen = headerText.length;

  if (snapshot.content) {
    const separator = headerLen > 0 ? '\n' : '';
    const available = TELEGRAM_CHAR_LIMIT - headerLen - separator.length - TRUNCATION_SUFFIX.length;
    if (available > 0) {
      const truncatedContent = snapshot.content.slice(0, available);
      return headerLen > 0
        ? `${headerText}${separator}${truncatedContent}${TRUNCATION_SUFFIX}`
        : `${truncatedContent}${TRUNCATION_SUFFIX}`;
    }
  }

  // Content removed entirely, still over — truncate description
  const noContentLines: string[] = [];
  if (prompt) noContentLines.push(prompt, '');
  if (snapshot.title) noContentLines.push(snapshot.title, '');
  if (snapshot.url) noContentLines.push(snapshot.url, '');
  if (snapshot.create_at) noContentLines.push(`${timestampLabel} ${snapshot.create_at}`, '');

  const noContentText = noContentLines.join('\n');
  if (snapshot.description) {
    const separator = noContentText.length > 0 ? '\n' : '';
    const available = TELEGRAM_CHAR_LIMIT - noContentText.length - separator.length - TRUNCATION_SUFFIX.length;
    if (available > 0) {
      const truncatedDesc = snapshot.description.slice(0, available);
      return noContentText.length > 0
        ? `${noContentText}${separator}${truncatedDesc}${TRUNCATION_SUFFIX}`
        : `${truncatedDesc}${TRUNCATION_SUFFIX}`;
    }
  }

  // Last resort: hard truncate
  return noContentText.slice(0, TELEGRAM_CHAR_LIMIT - TRUNCATION_SUFFIX.length).trim() + TRUNCATION_SUFFIX;
}
```

### Telegram Login Detection (DOM Layer)
```typescript
// Source: new pattern based on discord-login-detect.ts
export function detectLoginWall(): boolean {
  // Telegram Web K login page markers
  if (document.querySelector('input[name="phone"], input[type="tel"]')) return true;
  if (document.querySelector('button[type="submit"]:has-text("Next")')) return true; // pseudo — use actual selector
  if (document.querySelector('.login-form, [class*="login"]:not([class*="bubble"])')) return true;

  // Guarded: only treat as login if editor is NOT present
  if (!document.querySelector('.input-message-input[contenteditable="true"]')) {
    if (document.querySelector('[class*="auth"], [class*="signin"]')) return true;
  }

  return false;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Discord-only MAIN world bridge (hardcoded port name) | Generic per-adapter bridge via port name prefix | Phase 8 (D-99..D-102) | New adapters only need to register injector in `mainWorldInjectors` map |
| Hardcoded SPA filter (`discord.com`) | Registry-driven `buildSpaUrlFilters()` | Phase 8 (D-103..D-106) | Telegram entry just needs `spaNavigationHosts` field |
| Platform-specific error codes scattered | ErrorCode namespace per platform | Phase 8 (D-110) | Telegram errors use `TG_*` prefix |
| Single-layer login detection | URL + DOM layered defense | Phase 9 (D-115..D-117) | Telegram gets both pathname guard and DOM probe |
| Fixed timeout constants | Registry-driven `dispatchTimeoutMs` / `adapterResponseTimeoutMs` | Phase 9 (DSPT-01) | Telegram inherits 30s/20s defaults |

**Deprecated/outdated:**
- `document.execCommand('insertText')`: Once considered as fallback for Telegram, but ClipboardEvent paste is more reliable and consistent with Discord/Slack pattern.
- MarkdownV2 syntax emission: Would require complex escaping of 15+ special characters, and formatting would likely be stripped by Web K's paste sanitizer anyway.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Telegram Web K uses `.input-message-input[contenteditable="true"]` as the primary message editor selector | Architecture Patterns / Code Examples | If selector is wrong, editor discovery fails. Mitigation: three-tier fallback provides resilience. |
| A2 | Telegram Web K's paste sanitizer strips external HTML formatting, making plain text the reliable output format | Standard Stack / Don't Hand-Roll | If paste actually preserves MarkdownV2 syntax, we miss an opportunity for formatted messages. Risk is low — plain text is always acceptable. |
| A3 | Telegram Web K send button can be found via `.btn-send` or similar class selectors | Code Examples | If send button selectors are unstable, fallback to Enter keydown still works. |
| A4 | Telegram Web K uses hash-based routing (`#/auth` for login) | Common Pitfalls | If Telegram changes to pathname-based routing, `loggedOutPathPatterns` would become more effective. DOM-layer detection remains primary defense regardless. |
| A5 | Editor textContent clears after successful send in Telegram Web K | Common Pitfalls / Send Confirmation | If Telegram doesn't clear the editor, confirmation polling would time out. Mitigation: test with actual Telegram Web K before shipping. |

## Open Questions (RESOLVED)

1. **Telegram Web K editor selector stability** — RESOLVED: Three-tier fallback in 11-04 provides resilience. Tier 1 (`.input-message-input[contenteditable="true"]`) is primary; Tier 2/3 use broader selectors. CSS module hashing mitigated by fallback chain.

2. **Telegram Web K send button activation after paste** — RESOLVED: Plan 11-03 MAIN world injector includes defensive `editor.dispatchEvent(new Event('input', { bubbles: true }))` after paste. Send button click with fallback Enter keydown in same injector.

3. **Login wall DOM markers on Telegram Web K** — RESOLVED: Plan 11-02 uses broad selectors (`input[type="tel"]`, `input[name="phone"]`, `[class*="login"]`) with guarded checks (editor must NOT be present). Refined selectors tested against fixture HTML.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + test | ✓ | v26.0.0 | — |
| pnpm | Package manager | ✓ | 10.33.4 | — |
| WXT | Build framework | ✓ | 0.20.25 | — |
| Vitest | Unit testing | ✓ | 3.2.4 | — |
| Chrome/Chromium | Extension runtime | ✓ | — | — |
| Telegram Web K | Manual UAT | ✗ | — | Cannot verify without live testing; rely on DOM research + fixture tests |

**Missing dependencies with no fallback:**
- Live Telegram Web K instance for manual DOM verification — planner should include a UAT step for actual Telegram Web K testing.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TG-01 | URL matching for `web.telegram.org/a/` | unit | `vitest run tests/unit/dispatch/platform-detector.spec.ts` | ✅ existing |
| TG-01 | Registry entry has correct `hostMatches` | unit | `vitest run tests/unit/scripts/verify-manifest.spec.ts` | ✅ existing |
| TG-02 | `loggedOutPathPatterns` includes Telegram paths | unit | `vitest run tests/unit/dispatch/logged-out-paths.spec.ts` | ✅ existing |
| TG-02 | DOM login detection returns true for login wall HTML | unit | `vitest run tests/unit/adapters/telegram-login.spec.ts` | ❌ Wave 0 |
| TG-03 | Three-tier selector finds editor in fixture | unit | `vitest run tests/unit/adapters/telegram-selector.spec.ts` | ❌ Wave 0 |
| TG-03 | ClipboardEvent paste carries text/plain data | unit | `vitest run tests/unit/adapters/telegram-selector.spec.ts` | ❌ Wave 0 |
| TG-03 | MAIN world bridge routes to telegram injector | unit | `vitest run tests/unit/dispatch/mainWorldBridge.spec.ts` | ✅ existing |
| TG-04 | Send confirmation via editor clearance | unit | `vitest run tests/unit/adapters/telegram-selector.spec.ts` | ❌ Wave 0 |
| TG-05 | `platform_icon_telegram` key present in locales | unit | `vitest run tests/unit/i18n/locale-coverage.spec.ts` | ✅ existing |
| — | Formatting: metadata-first truncation at 4096 | unit | `vitest run tests/unit/adapters/telegram-format.spec.ts` | ❌ Wave 0 |
| — | SPA filter includes `web.telegram.org` | unit | `vitest run tests/unit/dispatch/spaFilter.spec.ts` | ✅ existing |
| — | Timeout config inherits defaults | unit | `vitest run tests/unit/dispatch/timeout-config.spec.ts` | ✅ existing |

### Sampling Rate
- **Per task commit:** `pnpm test --run`
- **Per wave merge:** `pnpm test --run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/adapters/telegram.fixture.html` — DOM fixture for selector tests
- [ ] `tests/unit/adapters/telegram-selector.spec.ts` — covers TG-03, TG-04
- [ ] `tests/unit/adapters/telegram-format.spec.ts` — covers D-140..D-145 truncation
- [ ] `tests/unit/adapters/telegram-login.spec.ts` — covers TG-02 DOM detection
- [ ] `entrypoints/telegram.content.ts` — adapter content script
- [ ] `background/injectors/telegram-main-world.ts` — MAIN world paste
- [ ] `shared/adapters/telegram-format.ts` — message formatting
- [ ] `shared/adapters/telegram-login-detect.ts` — login detection

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not in scope — Telegram auth is handled by Telegram |
| V3 Session Management | no | Not in scope |
| V4 Access Control | no | Not in scope |
| V5 Input Validation | yes | `zod` schemas for dispatch payload (existing); truncation prevents message length abuse |
| V6 Cryptography | no | Not in scope |
| V8 Data Protection | yes | Message content is only passed through extension to target IM; no external logging |

### Known Threat Patterns for Telegram Adapter Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious payload in snapshot fields | Tampering | `zod` schema validation before dispatch [VERIFIED: shared/messaging.ts] |
| Excessive message length causing DoS | Denial of Service | 4096-character truncation in formatter [CITED: D-143] |
| Mention injection (@everyone spam) | Tampering | No special escaping needed for Telegram plain text (no @everyone equivalent) |
| URL spoofing in message | Spoofing | URL is displayed as plain text, not hyperlinked by formatter |
| Content script injection on wrong origin | Elevation of Privilege | `hostMatches` + `match()` URL validation before script injection [VERIFIED: registry.ts] |

## Sources

### Primary (HIGH confidence)
- `entrypoints/slack.content.ts` — Complete adapter content script template (registry-driven, three-tier selector, MAIN world bridge, send confirmation, rate limiting)
- `entrypoints/discord.content.ts` — Alternative reference with MutationObserver-based send confirmation
- `background/injectors/slack-main-world.ts` — MAIN world paste implementation pattern (pre-paste cleanup, DataTransfer, ClipboardEvent, send button click, post-cleanup)
- `background/injectors/discord-main-world.ts` — Discord MAIN world paste pattern
- `shared/adapters/slack-format.ts` — Formatting module structure (pure function, Snapshot interface, compose, escape, truncation)
- `shared/adapters/slack-login-detect.ts` — DOM login detection pattern (layered markers, guarded checks)
- `shared/adapters/registry.ts` — Registry entry structure and `buildSpaUrlFilters()`
- `background/main-world-registry.ts` — Manual injector map pattern
- `background.ts` — Generic MAIN world bridge routing
- `wxt.config.ts` — Manifest `host_permissions` configuration
- `scripts/verify-manifest.ts` — Manifest verification assertions

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` — v1.1 multi-platform pitfalls research (Telegram Web K vs Web Z, DataTransfer cross-world issue, editor framework differences)
- Web search: Telegram Web K DOM structure — `.input-message-input`, `.btn-send`, `.new-message-wrapper`, `.rows-wrapper` class names referenced in automation communities
- Web search: Telegram MarkdownV2 formatting syntax and 4096 character limit — Bot API documentation patterns
- Web search: Telegram Web K hash routing (`#/auth`, `#/im`) — SPA architecture patterns

### Tertiary (LOW confidence)
- Web search: Telegram Web K `cleanHtml` paste sanitizer behavior — no direct source found; inferred from general contenteditable paste handling patterns and Telegram's security-focused design
- Assumption that Telegram Web K editor clears after send — based on typical contenteditable behavior, not verified against live Telegram

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against package.json and npm registry
- Architecture: HIGH — patterns verified against 3 existing adapters (OpenClaw, Discord, Slack)
- Telegram Web K DOM specifics: MEDIUM — based on web research and automation community references, not live DOM inspection
- Pitfalls: HIGH — derived from v1.1 PITFALLS.md research and cross-adapter pattern analysis

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (30 days for stable architecture) / 2026-05-23 (7 days for Telegram Web K DOM specifics — may drift with Telegram updates)
