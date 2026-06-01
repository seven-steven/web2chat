---
phase: 11-telegram-adapter
reviewed: 2026-05-16T12:00:00.000Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - background/injectors/telegram-main-world.ts
  - background/main-world-registry.ts
  - entrypoints/popup/components/Combobox.tsx
  - entrypoints/popup/components/PlatformIcon.tsx
  - entrypoints/popup/components/SendForm.tsx
  - entrypoints/telegram.content.ts
  - locales/en.yml
  - locales/zh_CN.yml
  - scripts/verify-manifest.ts
  - shared/adapters/registry.ts
  - shared/adapters/telegram-format.ts
  - shared/adapters/telegram-login-detect.ts
  - tests/unit/adapters/telegram-format.spec.ts
  - tests/unit/adapters/telegram-i18n.spec.ts
  - tests/unit/adapters/telegram-login.spec.ts
  - tests/unit/adapters/telegram-match.spec.ts
  - tests/unit/adapters/telegram-selector.spec.ts
  - tests/unit/adapters/telegram.fixture.html
  - tests/unit/dispatch/platform-detector.spec.ts
  - tests/unit/scripts/verify-manifest.spec.ts
  - wxt.config.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-16T12:00:00.000Z
**Depth:** deep
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Deep review of Phase 11 Telegram adapter implementation. The adapter follows the established architecture patterns (registry, MAIN world bridge, content script, three-tier selector). Cross-file analysis confirms no telegram-specific logic leaked into background.ts or other shared modules. The MAIN world port routing (`WEB2CHAT_MAIN_WORLD:telegram`) connects correctly through the generic bridge in `entrypoints/background.ts`.

One critical issue found: the `[class*="auth"]` login-wall marker is unguarded and can trigger false-positive NOT_LOGGED_IN on logged-in Telegram pages that happen to contain elements with "auth" in a class name (e.g., "authorization", "authentication" UI elements). Unlike `[class*="login"]` which is guarded by checking editor absence, `[class*="auth"]` fires unconditionally.

Three warnings: a comment/code mismatch in the MAIN world injector, the `PLATFORM_UNSUPPORTED` i18n text not mentioning Telegram despite Telegram now being a supported platform, and a potential dispatch failure when the user navigates to `https://web.telegram.org/a/` without a chat ID (registry matches but extractChatId returns null).

## Critical Issues

### CR-01: Unguarded `[class*="auth"]` selector causes false-positive NOT_LOGGED_IN

**File:** `shared/adapters/telegram-login-detect.ts:25`
**Issue:** The `detectLoginWall()` function checks `[class*="auth"]` unconditionally. If a logged-in Telegram Web K page contains any element whose class includes the substring "auth" (e.g., class="authorization-badge", class="two-factor-auth"), the function returns `true` and `handleDispatch` immediately returns `NOT_LOGGED_IN` (line 212 of telegram.content.ts). This blocks legitimate dispatches to logged-in Telegram pages.

The `[class*="login"]` selector is correctly guarded by checking that `.input-message-input[contenteditable="true"]` is NOT present (lines 30-31). However, `[class*="auth"]` has no equivalent guard, creating an asymmetry.

Real-world risk: Telegram Web K is a single-page app with frequent DOM updates. If any future UI component or third-party widget uses "auth" in a class name on a logged-in page, all dispatches fail silently with a misleading "not logged in" error.

**Fix:** Guard `[class*="auth"]` the same way `[class*="login"]` is guarded -- only match when the Telegram editor is NOT present:

```typescript
export function detectLoginWall(): boolean {
  // Unconditional markers
  if (document.querySelector('input[name="phone"], input[type="tel"]')) return true;

  // Guarded markers -- only match when the editor is absent.
  // Logged-in Telegram pages may contain elements with "auth" or "login"
  // class fragments. The guard prevents false positives.
  if (!document.querySelector('.input-message-input[contenteditable="true"]')) {
    if (document.querySelector('[class*="auth"]')) return true;
    if (document.querySelector('[class*="login"]')) return true;
  }

  return false;
}
```

## Warnings

### WR-01: Comment says `deleteContent` but code uses `deleteContentBackward`

**File:** `background/injectors/telegram-main-world.ts:21`
**Issue:** The comment on line 21 says `beforeinput[deleteContent]` but the actual `inputType` on lines 26 and 85 is `'deleteContentBackward'`. These are different `InputEvent` types: `deleteContent` deletes all content, while `deleteContentBackward` simulates a single backspace. The code may be intentionally using `deleteContentBackward` (matching Discord/Slack injectors), but the comment is misleading.

**Fix:** Update the comment to match the actual inputType:

```typescript
  // Pre-paste cleanup: if the editor still holds residual text from a
  // prior (failed) dispatch, clear it via beforeinput[deleteContentBackward] BEFORE
  // pasting new content.
```

### WR-02: PLATFORM_UNSUPPORTED i18n body text omits Telegram

**File:** `locales/en.yml:132` and `locales/zh_CN.yml:131`
**Issue:** The `error_code_PLATFORM_UNSUPPORTED_body` message says "web2chat supports Discord, Slack, and OpenClaw in v1" (en) / "v1 支持 Discord、Slack 与 OpenClaw" (zh_CN). Telegram is now a supported platform in v1, so this message is outdated and will mislead users who enter an unsupported URL into thinking Telegram is also unsupported.

**Fix:** Update both locale files:

```yaml
# en.yml
error_code_PLATFORM_UNSUPPORTED_body:
  message: 'web2chat supports Discord, Slack, Telegram, and OpenClaw in v1. Other platforms come later.'

# zh_CN.yml
error_code_PLATFORM_UNSUPPORTED_body:
  message: 'v1 支持 Discord、Slack、Telegram 与 OpenClaw，其他平台后续版本支持。'
```

### WR-03: Registry match accepts URL without chatId but extractChatId returns null

**File:** `shared/adapters/registry.ts:114` and `entrypoints/telegram.content.ts:78-98`
**Issue:** The Telegram registry entry's `match()` accepts any URL starting with `https://web.telegram.org/a/` (including `https://web.telegram.org/a/` with no chat ID). However, `extractChatId()` returns `null` for these URLs. When the dispatch pipeline processes such a URL, `findAdapter()` detects Telegram but `handleDispatch` returns `INPUT_NOT_FOUND` with message "Invalid Telegram chat URL" (line 225-230). This is not a crash, but the error code `INPUT_NOT_FOUND` is misleading -- the platform was detected but the URL is incomplete.

This means the Confirm button in the popup enables for `https://web.telegram.org/a/` (platformId is detected), but dispatch always fails. The user sees "Couldn't find the message box" instead of a clearer message about the incomplete URL.

**Fix:** Either tighten the registry `match()` to require a chatId segment, or accept the current behavior and document it. Tightening the match:

```typescript
match: (url: string): boolean => {
  try {
    const u = new URL(url);
    return (
      u.hostname === 'web.telegram.org' &&
      u.pathname.startsWith('/a/') &&
      u.pathname.replace('/a/', '').length > 0
    );
  } catch {
    return false;
  }
},
```

## Info

### IN-01: Test for exactly-4096 characters depends on fragile arithmetic

**File:** `tests/unit/adapters/telegram-format.spec.ts:129`
**Issue:** The test `it('does NOT truncate at exactly 4096 chars')` computes content length as `4096 - baseResult.length - 2` with a comment `-2 for \n\n separator from join`. This assumes specific join behavior that could break if the formatting logic changes. The magic number `-2` is fragile.

**Fix:** Consider a more robust approach: build the message with known field lengths, then pad content to exactly hit 4096 by measuring the actual output after a trial compose:

```typescript
// Measure base, then fill to exactly 4096
const trialResult = composeTelegramMessage({ prompt: 'P', snapshot: { ...snapshot, content: '' }, timestampLabel: 'at' });
const paddingNeeded = 4096 - trialResult.length - 1; // -1 for the \n before content
const exactSnapshot = { ...snapshot, content: 'x'.repeat(Math.max(0, paddingNeeded)) };
```

### IN-02: i18n test uses string containment check instead of YAML parsing

**File:** `tests/unit/adapters/telegram-i18n.spec.ts:18-22`
**Issue:** The i18n coverage test checks `${key}:` as a substring match in the raw YAML file. This would match `some_other_telegram_key:` if such a key existed, since `platform_icon_telegram:` is a substring of it. While unlikely with the current key naming convention, a proper YAML parser would be more robust.

**Fix:** Use a YAML parser or check for the exact line pattern `^${key}:` to avoid false positives:

```typescript
expect(enYml.split('\n').some(line => line.startsWith(`${key}:`))).toBe(true);
```

### IN-03: Rate limit map is module-scoped but content script is one-shot

**File:** `entrypoints/telegram.content.ts:37`
**Issue:** `lastSendTime` is a module-scoped `Map`. The comment says "content script lifetime = tab lifetime" but MV3 content scripts registered with `registration: 'runtime'` are injected per-dispatch by the SW and may not persist across tab navigations. This means the rate limit only works within a single injection lifetime. If the SW injects the content script twice in quick succession (two dispatch calls), the second injection has a fresh empty map and bypasses the rate limit.

This is an informational note -- the SW-side dispatch pipeline likely has its own rate-limiting, making this defense-in-depth rather than the primary rate limiter.

**Fix:** No immediate fix needed if SW-side rate limiting exists. If this is the only rate limit, consider persisting timestamps in `chrome.storage.session` instead.

---

_Reviewed: 2026-05-16T12:00:00.000Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
