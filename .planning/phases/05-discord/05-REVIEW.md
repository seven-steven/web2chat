---
phase: 05-discord
reviewed: 2026-05-05T10:50:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - shared/adapters/discord-format.ts
  - tests/unit/adapters/discord-format.spec.ts
  - tests/unit/adapters/discord-match.spec.ts
  - shared/adapters/registry.ts
  - wxt.config.ts
  - scripts/verify-manifest.ts
  - locales/en.yml
  - locales/zh_CN.yml
  - tests/unit/dispatch/platform-detector.spec.ts
  - entrypoints/discord.content.ts
  - tests/unit/adapters/discord.fixture.html
  - tests/unit/adapters/discord-selector.spec.ts
  - tests/unit/dispatch/login-detection.spec.ts
  - entrypoints/background.ts
  - background/dispatch-pipeline.ts
  - entrypoints/popup/components/PlatformIcon.tsx
  - entrypoints/popup/components/SendForm.tsx
  - tests/e2e/fixtures/discord/index.html
  - tests/e2e/fixtures/discord/login.html
  - tests/e2e/fixtures/serve.json
  - tests/e2e/discord-dispatch.spec.ts
  - tests/e2e/discord-login.spec.ts
  - tests/e2e/discord-channel-switch.spec.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-05T10:50:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed 23 files comprising the Phase 5 Discord adapter implementation: adapter content script, format utilities, registry, dispatch pipeline integration, E2E test fixtures, unit tests, i18n keys, and manifest configuration.

The implementation is well-structured overall. The adapter follows the established pattern (registry entry, content script, dispatch pipeline hooks), the i18n keys have 100% coverage between en/zh_CN, the manifest permissions are correct, and the E2E fixtures are self-contained stubs that validate the core flow.

However, one correctness bug was found in the mention escaping regex (false positives on partial word matches), alongside a hardcoded Chinese label that violates the i18n convention, a stale debug default string in the dispatch pipeline, and a misleading comment in the manifest verifier.

## Critical Issues

### CR-01: escapeMentions regex matches partial words -- corrupts legitimate content

**File:** `shared/adapters/discord-format.ts:25`
**Issue:** The regex `/@(everyone|here)/g` has no word boundary assertion. It matches `@here` inside `@hereford`, `@heresy`, `@hereafter`, etc. It also matches `@everyone` inside email addresses like `user@everyone.com`. When a user's page content or prompt contains these legitimate strings, the zero-width space insertion corrupts the text.

Verified with `@hereford` producing `@<ZWS>hereford` (broken), and `user@everyone.com` producing `user@<ZWS>everyone.com` (broken email). No test case covers these false-positive scenarios.

**Fix:**
```typescript
export function escapeMentions(text: string): string {
  // Use \b word boundary to avoid false positives on @hereford, @heresy, etc.
  let result = text.replace(/@(everyone|here)\b/g, '@​$1');
  // Angle-bracket mentions are already bounded by < and >, no change needed
  result = result.replace(/<(@[!&]?\d+|#\d+)>/g, '<​$1>');
  return result;
}
```

## Warnings

### WR-01: Hardcoded Chinese label "采集时间" bypasses i18n

**File:** `shared/adapters/discord-format.ts:54, 70, 95`
**Issue:** The timestamp label `采集时间:` is hardcoded in Chinese. Per CLAUDE.md i18n convention: "用户可见的字符串全部走 `t(...)`". The existing key `capture_field_createAt` ("Captured at" / "抓取时间") should be used instead. The module header explicitly says "Pure utility -- no WXT or chrome.* imports", so the `t()` facade cannot be used directly. The label string should be parameterized so the caller can pass a localized label, or the module should import from a pure i18n utility that works in content scripts.

**Fix:** Add a `timestampLabel` parameter to `composeDiscordMarkdown`, or extract the label constant and let the adapter content script pass `t('capture_field_createAt')` at the call site.

### WR-02: Stale default string 'mock' in dispatch pipeline error path

**File:** `background/dispatch-pipeline.ts:256`
**Issue:** When `response.message` is undefined, the fallback is `'mock'`:
```typescript
response.message ?? 'mock',
```
This is clearly a leftover from Phase 3 development. In production, if an adapter returns `{ ok: false }` without a message, the user-facing error would display the literal string "mock". Should be a descriptive fallback like `'Adapter returned an error'` or `'Unknown error'`.

**Fix:**
```typescript
response.message ?? 'Adapter returned an unknown error',
```

### WR-03: Stale docstring in verify-manifest.ts

**File:** `scripts/verify-manifest.ts:6`
**Issue:** The docstring at line 6 states:
```
permissions === ['activeTab', 'alarms', 'scripting', 'storage'] (set equality)
```
But the actual assertion at line 66 checks for 5 permissions including `webNavigation`:
```typescript
expectSet('permissions', manifest.permissions, ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation']);
```
The code is correct (matches `wxt.config.ts` production config), but the docstring is misleading. A developer reading only the docstring would believe the production build should omit `webNavigation`.

**Fix:** Update line 6 to include `webNavigation`:
```
*   - permissions === ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation'] (set equality)
```

## Info

### IN-01: escapeMentions unit tests lack false-positive coverage

**File:** `tests/unit/adapters/discord-format.spec.ts:64-114`
**Issue:** The test suite for `escapeMentions` validates that `@everyone`, `@here`, and angle-bracket mentions are correctly escaped, and that `normal text unchanged` passes. However, it does not test false-positive scenarios: `@hereford`, `@everywhere`, or email addresses like `user@everyone.com`. Given CR-01 above, adding these test cases would have caught the word boundary bug.

**Fix:** Add test cases:
```typescript
it('@hereford unchanged (no partial match)', () => {
  expect(escapeMentions('@hereford')).toBe('@hereford');
});
it('email user@everyone.com unchanged', () => {
  expect(escapeMentions('user@everyone.com')).toBe('user@everyone.com');
});
```

### IN-02: waitForNewMessage assumes flat children structure

**File:** `entrypoints/discord.content.ts:238-264`
**Issue:** `waitForNewMessage` observes `container.children.length` with `childList: true` (no `subtree`). This correctly handles the stub fixture but real Discord's chat-messages container may use a virtualized or nested list structure where new messages do not appear as direct children. This is an architectural limitation documented by the D-65 spec -- the unit/E2E tests validate against the fixture DOM, and real-world confirmation would require manual testing on live Discord.

**Fix:** No code change required. If real-world testing reveals the MutationObserver does not fire, consider adding `subtree: true` and walking `container.querySelectorAll('[id^="chat-messages-"] > [class*="message"]')` instead.

---

_Reviewed: 2026-05-05T10:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
