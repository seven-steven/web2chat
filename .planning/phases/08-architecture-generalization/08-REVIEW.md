---
phase: 08-architecture-generalization
reviewed: 2026-05-10T00:00:00Z
depth: deep
files_reviewed: 17
files_reviewed_list:
  - background/dispatch-pipeline.ts
  - background/injectors/discord-main-world.ts
  - background/main-world-registry.ts
  - entrypoints/background.ts
  - entrypoints/discord.content.ts
  - entrypoints/popup/components/ErrorBanner.tsx
  - entrypoints/popup/components/SendForm.tsx
  - shared/adapters/platform-errors.ts
  - shared/adapters/registry.ts
  - shared/adapters/types.ts
  - shared/messaging/index.ts
  - shared/messaging/result.ts
  - shared/storage/repos/dispatch.ts
  - tests/unit/dispatch/mainWorldBridge.spec.ts
  - tests/unit/dispatch/platform-detector.spec.ts
  - tests/unit/dispatch/spaFilter.spec.ts
  - tests/unit/messaging/errorCode.spec.ts
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-05-10T00:00:00Z
**Depth:** deep
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Reviewed the Phase 8 architecture-generalization implementation covering the generic MAIN world bridge, SPA routing, adapter registry refactoring, and error code expansion.

The core registry-driven dispatch and SPA filtering logic is structurally sound. Three blocker-level issues were found: a layering violation (shared/ importing from background/ that pulls MAIN world injector code into the popup bundle), a `setTimeout` used in the service worker in violation of CLAUDE.md's SW discipline rules, and a `handleConfirm` exception-handling gap that permanently locks the Confirm button if a permission check throws. Five warnings cover an empty retry action, URL prefix collision, a non-standard InputEvent type, an unreachable dead-code guard, and a resource leak in the content script.

---

## Critical Issues

### CR-01: `shared/` imports `background/` — popup bundle pollution and architecture violation

**File:** `shared/adapters/registry.ts:28`
**Issue:** `registry.ts` is in `shared/` and is imported by both the popup (`SendForm.tsx:24`, `App.tsx:36`) and the SW. Yet line 28 imports `discordMainWorldPaste` from `@/background/injectors/discord-main-world`, a module that belongs exclusively to the background bundle. This pulls the MAIN world injector function — including its `DataTransfer` / `ClipboardEvent` / `KeyboardEvent` DOM manipulation code — into the popup bundle. The file's own comment (line 21) states "CRITICAL: match() is a pure function — NO chrome.* calls … WXT inlines this module into popup + SW + content-script bundles." Importing from `background/` breaks this guarantee.

Concrete consequences:
1. The popup bundle includes dead code (the injector is never called from the popup).
2. Any future `background/` module imported transitively from the injector (e.g., one that calls `chrome.scripting.*`) would silently break the popup bundle at build or runtime.
3. The `background/ → shared/` dependency direction convention is violated; `shared/` must not depend on `background/`.

**Fix:** Move the `mainWorldInjector` wiring out of `registry.ts`. Keep `AdapterRegistryEntry.mainWorldInjector` as an optional field in `types.ts` (fine for the type), but do NOT import the concrete function in the shared module. Instead, populate the injector only in `background/main-world-registry.ts`, which already builds the `mainWorldInjectors` Map. Remove the import at `registry.ts:28` and remove `mainWorldInjector: discordMainWorldPaste` from the discord entry in `registry.ts`. The `main-world-registry.ts` can import directly from `background/injectors/` without layering issues.

```typescript
// shared/adapters/registry.ts — remove this line entirely:
// import { discordMainWorldPaste } from '@/background/injectors/discord-main-world';

// And remove mainWorldInjector from the discord defineAdapter() call:
defineAdapter({
  id: 'discord',
  match: ...,
  scriptFile: 'content-scripts/discord.js',
  hostMatches: ['https://discord.com/*'],
  iconKey: 'platform_icon_discord',
  spaNavigationHosts: ['discord.com'],
  // mainWorldInjector removed — populated in background/main-world-registry.ts
}),

// background/main-world-registry.ts — build the map manually instead of
// reading from registry entries:
import { discordMainWorldPaste } from '@/background/injectors/discord-main-world';

export const mainWorldInjectors = new Map<string, (text: string) => Promise<boolean>>([
  ['discord', discordMainWorldPaste],
]);
```

---

### CR-02: `setTimeout` used in service worker — violates SW discipline

**File:** `background/dispatch-pipeline.ts:261`
**Issue:** CLAUDE.md's "Service worker 纪律" section explicitly states: "跨事件调度使用 `chrome.alarms`，不要使用 `setInterval` / `setTimeout`。" Line 261 uses `setTimeout` inside `advanceToAdapterInjection`, which runs in the SW context:

```typescript
new Promise<never>((_, reject) =>
  setTimeout(
    () => reject(new Error('ADAPTER_RESPONSE_TIMEOUT')),
    ADAPTER_RESPONSE_TIMEOUT_MS,  // 20000ms
  ),
),
```

SW idle-suspension can fire while this timer is pending. Chrome MV3 service workers can be suspended mid-execution when there are no active events; a pending `setTimeout` does not keep the SW alive. If the SW is suspended, the timer callback never fires, the `Promise.race` never rejects, and `advanceToAdapterInjection` is silently abandoned — the dispatch record remains stuck in `awaiting_adapter` until the 30s alarm backstop fires (which IS a real `chrome.alarms` event). However, the 30s alarm fires REGARDLESS, so the dispatch will eventually time out. The immediate impact is a 30s wait instead of the intended 20s wait, and the TIMEOUT error message says "30s" instead of "20s" which could confuse diagnostics.

**Fix:** The 20s cap on adapter response can be removed in favour of relying solely on the existing 30s `dispatch-timeout:<id>` alarm, or implement it correctly by scheduling an additional `chrome.alarms.create` with a shorter delay. Since `chrome.alarms` minimum is 0.5 minutes (30s), the 20s timeout cannot be implemented via alarms at fine granularity. The simplest correct fix is to remove the `Promise.race` timeout entirely and rely on the existing `DISPATCH_TIMEOUT_MINUTES` alarm:

```typescript
// Remove the Promise.race and use only the alarm backstop.
// The 30s alarm already guards against hung adapters (D-33).
response = await chrome.tabs.sendMessage(tabId, {
  type: 'ADAPTER_DISPATCH',
  payload: { ... },
});
```

If a finer-grained timeout is required, it must be implemented inside the content script (which IS allowed to use `setTimeout`) with the content script explicitly calling `sendResponse({ ok: false, code: 'TIMEOUT', ... })` after its own timer.

---

### CR-03: Exception in permission-check block leaves `submitting` permanently `true`

**File:** `entrypoints/popup/components/SendForm.tsx:207-230`
**Issue:** The permission-check block (lines 207-230) that handles OpenClaw dynamic permissions executes BEFORE and OUTSIDE the `try-catch` at lines 233-245. Any exception thrown in this block — e.g., from `chrome.permissions.contains(...)`, `draftRepo.savePendingDispatch(input)`, `chrome.permissions.request(...)`, or `draftRepo.clearPendingDispatch()` — propagates uncaught, leaving `submitting` stuck at `true`. The Confirm button remains permanently disabled (`confirmEnabled = platformId !== null && props.sendTo !== '' && !submitting`) with no way for the user to recover without reopening the popup.

```typescript
// CURRENT — exception between setSubmitting(true) and the try-catch
// leaves submitting=true permanently:
setSubmitting(true);
// ...
const adapter = findAdapter(props.sendTo);
if (adapter && adapter.hostMatches.length === 0) {
  // Any throw here escapes the catch below:
  const targetOrigin = new URL(props.sendTo).origin;
  const alreadyGranted = await chrome.permissions.contains(...); // can throw
  if (!alreadyGranted) {
    await draftRepo.savePendingDispatch(input); // can throw
    const granted = await chrome.permissions.request(...); // can throw
    ...
    await draftRepo.clearPendingDispatch(); // can throw
  }
}
props.onConfirm(dispatchId);
try {
  // Only this block has error recovery
```

**Fix:** Wrap the entire body of `handleConfirm` from `setSubmitting(true)` to the end in a single try-catch:

```typescript
async function handleConfirm() {
  if (submitting) return;
  setSubmitting(true);
  try {
    // ... all existing logic including permission check ...
    props.onConfirm(dispatchId);
    const res = await sendMessage('dispatch.start', input);
    if (res.ok) {
      window.close();
    } else {
      setSubmitting(false);
      props.onDispatchError(res.code, res.message);
    }
  } catch (err) {
    setSubmitting(false);
    const msg = err instanceof Error ? err.message : String(err);
    props.onDispatchError('INTERNAL', msg);
  }
}
```

---

## Warnings

### WR-01: "Retry" button only dismisses the error — dispatch is not actually retried

**File:** `entrypoints/popup/components/SendForm.tsx:273-275`
**Issue:** The `onRetry` callback passed to `ErrorBanner` does nothing but dismiss the error:

```typescript
onRetry={() => {
  props.onDismissError();
}}
```

`ErrorBanner` shows a clickable "Retry" button (with i18n label) for all codes in `RETRIABLE_CODES` (`NOT_LOGGED_IN`, `INPUT_NOT_FOUND`, `TIMEOUT`, `RATE_LIMITED`, `EXECUTE_SCRIPT_FAILED`, `INTERNAL`, `OPENCLAW_OFFLINE`, `OPENCLAW_PERMISSION_DENIED`). When the user clicks it, the banner disappears — but no dispatch is retried. The user must manually click Confirm again. The retry button's label implies a retry will occur, but the action is equivalent to clicking Dismiss.

**Fix:** Either implement actual retry (calling `handleConfirm()` directly after dismissing), or remove the retry button for all codes by not passing `onRetry` to `ErrorBanner` and documenting that the user must click Confirm manually:

```typescript
// Option A: real retry
onRetry={() => {
  props.onDismissError();
  void handleConfirm();
}}

// Option B: no retry button (remove onRetry prop entirely)
<ErrorBanner
  code={props.dispatchError.code}
  onDismiss={props.onDismissError}
/>
```

---

### WR-02: `tabs.query({ url: url + '*' })` can match unrelated tabs with prefix-matching URLs

**File:** `background/dispatch-pipeline.ts:92`
**Issue:** `chrome.tabs.query({ url: url + '*' })` uses the send_to URL as a match-pattern prefix. For a URL like `https://discord.com/channels/123/456`, the pattern `https://discord.com/channels/123/456*` also matches `https://discord.com/channels/123/456789` (a different, longer channel ID). If `matches[0]` returns a tab on a different channel (one whose ID is a numeric extension of the target channel), line 103 detects `existing.url !== url` and navigates that tab to the intended URL — navigating away from a different channel the user had open without consent.

For Discord specifically, channel IDs are numeric Snowflakes and prefix collisions are possible.

**Fix:** After `tabs.query`, filter results to exact-URL matches first, then fall back to creating a new tab if no exact match exists. The "update if URL differs" logic should not kick in when the matched tab is a different destination entirely:

```typescript
const exactMatches = matches.filter((t) => t.url === url);
const existing = exactMatches.length > 0 ? exactMatches[0]! : null;
if (!existing) {
  const created = await chrome.tabs.create({ url, active: true });
  // ...
}
```

---

### WR-03: `inputType: 'deleteContent'` is not a valid W3C `InputType`

**File:** `background/injectors/discord-main-world.ts:34,71`
**Issue:** The `beforeinput` events at lines 34 and 71 use `inputType: 'deleteContent'`:

```typescript
new InputEvent('beforeinput', {
  inputType: 'deleteContent',
  bubbles: true,
  cancelable: true,
})
```

The [W3C Input Events Level 2 spec](https://www.w3.org/TR/input-events-2/#interface-InputEvent-Attributes) defines deletion input types as `deleteContentBackward` and `deleteContentForward`, not `deleteContent`. While Slate may forward any `beforeinput` event to its handlers, using a non-standard `inputType` risks:
1. Slate's event handler not recognising the type and treating it as a no-op.
2. Future Slate versions enforcing strict type validation and ignoring the event.

The comment says this "uses the same path Backspace/Delete take" — Backspace maps to `deleteContentBackward`, not `deleteContent`.

**Fix:** Replace `'deleteContent'` with `'deleteContentBackward'` to match the W3C spec and Slate's expected input type:

```typescript
new InputEvent('beforeinput', {
  inputType: 'deleteContentBackward',
  bubbles: true,
  cancelable: true,
})
```

---

### WR-04: Dead `ACTIVE_KEY` guard in `listAll()` — comment misleads maintenance

**File:** `shared/storage/repos/dispatch.ts:32,55`
**Issue:** `ACTIVE_KEY` is defined as `'dispatch:active'` (line 32) and used as a filter guard in `listAll()` at line 55. However, the actual active-dispatch pointer is stored via WXT's `activeDispatchPointerItem` (defined in `items.ts` as `'session:dispatchActive'`). WXT strips the `session:` area prefix and stores the value under the raw key `dispatchActive` in `chrome.storage.session`. Raw keys from `chrome.storage.session.get(null)` are `dispatchActive`, not `dispatch:active`. The `listAll()` filter at line 54 (`key.startsWith('dispatch:')`) already excludes `dispatchActive` because it lacks the `dispatch:` prefix. The guard at line 55 (`key === ACTIVE_KEY`) is therefore unreachable dead code.

The comment at line 9 says "The `dispatch:active` pointer (single string | null) goes through the typed `activeDispatchPointerItem` in items.ts" — this is accurate, but it creates a false impression that the raw key `dispatch:active` will appear in session storage, when in fact WXT uses `dispatchActive`.

**Fix:** Remove the dead guard and update the comment:

```typescript
// shared/storage/repos/dispatch.ts
export async function listAll(): Promise<DispatchRecord[]> {
  const all = await chrome.storage.session.get(null);
  const out: DispatchRecord[] = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith(PREFIX)) continue;
    // Note: the active-dispatch pointer is stored by WXT as 'dispatchActive'
    // (no 'dispatch:' prefix), so it is already excluded by startsWith above.
    out.push(value as DispatchRecord);
  }
  return out;
}
```

---

### WR-05: Promise in `injectMainWorldPaste` may never resolve if port disconnects silently

**File:** `entrypoints/discord.content.ts:174-187`
**Issue:** The `Promise` wrapping the port message exchange resolves via `onMessage` (success) or `onDisconnect` with `chrome.runtime.lastError` (error). If the SW is killed mid-execution (MV3 idle suspend) AFTER the port is created but BEFORE `executeScript` completes, Chrome disconnects the port WITHOUT setting `chrome.runtime.lastError`. In that case:
- `onMessage` never fires (no response was sent).
- `onDisconnect` fires but the `if (chrome.runtime.lastError)` guard is false.
- The Promise never resolves.
- `handleDispatch` hangs indefinitely.

The SW-side 20s `ADAPTER_RESPONSE_TIMEOUT` (`setTimeout` in the SW — see CR-02) is itself unreliable. The 30s `chrome.alarms` backstop WILL eventually fire and mark the dispatch as `TIMEOUT`, but the content-script promise remains unresolved, leaking memory in the tab for the tab's lifetime.

**Fix:** Always resolve the promise in `onDisconnect`, regardless of `chrome.runtime.lastError`:

```typescript
port.onDisconnect.addListener(() => {
  const errMsg = chrome.runtime.lastError?.message;
  resolve({ ok: false, message: errMsg ?? 'Port disconnected unexpectedly' });
});
```

---

## Info

### IN-01: `hostMatches.length === 0` used as implicit "dynamic-permission adapter" sentinel

**File:** `background/dispatch-pipeline.ts:135`, `entrypoints/popup/components/SendForm.tsx:208`
**Issue:** Both the dispatch pipeline and the popup infer "this adapter requires dynamic permission (openclaw)" from `adapter.hostMatches.length === 0`. This convention is documented only in comments. Any future adapter with no static host permissions (e.g., a self-hosted Slack instance) would incorrectly trigger the OpenClaw permission flow. The `AdapterRegistryEntry` type in `types.ts` has no explicit `requiresDynamicPermission` field.

**Fix:** Add an explicit `requiresDynamicPermission?: boolean` field to `AdapterRegistryEntry` and set it to `true` only for the openclaw entry. Update both consumers to check `adapter.requiresDynamicPermission === true`.

---

### IN-02: `isOnAdapterHost` pattern substitution `replace('*', 'x')` only replaces first wildcard

**File:** `background/dispatch-pipeline.ts:74`
**Issue:** `pattern.replace('*', 'x')` replaces only the first `*` in the pattern string (JavaScript `String.replace` with a string argument, not a RegExp, replaces only the first occurrence). For the current registry patterns (`https://discord.com/*`), this produces `https://discord.com/x`, which is correct. If a future adapter adds a pattern like `https://*.example.com/*`, the substitution produces `https://x.example.com/*`, and `new URL('https://x.example.com/*')` throws (the second `*` is invalid in a URL). The `catch` block would silently return `false`, causing every `isOnAdapterHost` check for that adapter to fail — disabling login-redirect detection.

**Fix:** Strip all wildcards from the pattern before URL parsing, or use a regex replace:

```typescript
const patternHost = new URL(pattern.replace(/\*/g, 'x')).hostname;
```

---

### IN-03: `registry.ts` comment contradiction — states "no chrome.* calls" but imports background module

**File:** `shared/adapters/registry.ts:21-25,28`
**Issue:** The comment at lines 21-25 states: "CRITICAL: match() is a pure function — NO chrome.* calls. WXT inlines this module into popup + SW + content-script bundles; chrome.* dependencies would break popup-side bundling." Line 28 then imports from `@/background/injectors/discord-main-world`. While `discordMainWorldPaste` does not currently call `chrome.*` APIs, the comment claim is undercut. Future contributors adding chrome.* calls to the injector would not know this module is pulled into the popup bundle, because the comment says otherwise. (This is the documentation aspect of CR-01.)

**Fix:** Resolve by removing the import (per CR-01 fix). No standalone fix needed — this is a symptom of CR-01.

---

_Reviewed: 2026-05-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
