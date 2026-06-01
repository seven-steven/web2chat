---
phase: 12-feishu-lark-adapter
reviewed: 2026-05-16T12:00:00Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - background/injectors/feishu-main-world.ts
  - background/main-world-registry.ts
  - entrypoints/feishu.content.ts
  - entrypoints/popup/components/PlatformIcon.tsx
  - locales/en.yml
  - locales/zh_CN.yml
  - scripts/verify-manifest.ts
  - shared/adapters/feishu-format.ts
  - shared/adapters/feishu-login-detect.ts
  - shared/adapters/registry.ts
  - shared/adapters/types.ts
  - tests/unit/adapters/feishu-format.spec.ts
  - tests/unit/adapters/feishu-i18n.spec.ts
  - tests/unit/adapters/feishu-login.spec.ts
  - tests/unit/adapters/feishu-match.spec.ts
  - tests/unit/adapters/feishu-selector.spec.ts
  - tests/unit/adapters/feishu.fixture.html
  - tests/unit/dispatch/platform-detector.spec.ts
  - tests/unit/dispatch/spaFilter.spec.ts
  - tests/unit/scripts/verify-manifest.spec.ts
  - wxt.config.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-05-16T12:00:00Z
**Depth:** deep
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Deep review of Phase 12 Feishu/Lark adapter implementation. The adapter follows the established architecture patterns: registry entry with dual-domain matching, content script with three-tier selector and login wall detection, MAIN world paste injector, i18n coverage, and comprehensive unit tests.

Cross-file analysis confirms correct integration: the MAIN world port routing (`WEB2CHAT_MAIN_WORLD:feishu`) connects through the generic bridge in `entrypoints/background.ts`; the `mainWorldInjectors` map in `background/main-world-registry.ts` correctly imports and registers the feishu injector; the manifest verifier (`scripts/verify-manifest.ts`) includes the feishu host_permissions; `spaNavigationUseHostSuffix: true` correctly generates `hostSuffix` filters for subdomain tenant matching; and i18n keys achieve 100% coverage across both locales.

Three warnings found: a pre-paste cleanup logic flaw in the MAIN world injector, a `deleteContentBackward` semantics issue affecting both pre-paste and post-send cleanup, and an `en.yml` tooltip labeling inconsistency.

## Warnings

### WR-01: `deleteContentBackward` only deletes one character, not the full editor content

**File:** `background/injectors/feishu-main-world.ts:21-29` and `background/injectors/feishu-main-world.ts:81-89`
**Issue:** Both the pre-paste cleanup (line 21-29) and post-send cleanup (line 81-89) use `inputType: 'deleteContentBackward'`. This InputEventType simulates a single Backspace keypress, which only removes the last character -- it does NOT clear the entire editor. If the editor contains residual text from a prior failed dispatch (e.g., 500 characters of formatted message), only the last character is removed. The guard `(editor.textContent ?? '').length > 0` will always be true after the cleanup dispatch because 499 characters remain.

The same pattern exists in the Discord and Telegram injectors (same codebase) and is a systemic issue. For Feishu's Slate-based editor specifically, the pre-paste cleanup will leave residual text intact, causing the new paste to append to the old content rather than replace it. The post-send cleanup similarly fails to clear the editor, though the content script's confirmation polling (`editor.textContent` clearance check at line 302) may incidentally catch this and report `TIMEOUT`.

This is consistent with how all other adapters in this codebase behave, so it is not a regression introduced by Phase 12. However, it means the cleanup logic in the feishu injector is effectively non-functional for multi-character residual text.

**Fix:** Replace single `deleteContentBackward` with `deleteWordBackward` in a loop, or select all content first and then delete:
```typescript
// Select all then delete
const selection = window.getSelection();
if (selection) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
}
editor.dispatchEvent(
  new InputEvent('beforeinput', {
    inputType: 'deleteContentBackward',
    bubbles: true,
    cancelable: true,
  }),
);
```

### WR-02: MAIN world injector returns `true` even when send button is not clicked and Enter is synthetic

**File:** `background/injectors/feishu-main-world.ts:63-90`
**Issue:** The injector function always returns `true` (line 90) regardless of whether the message was actually sent. The flow is: try to click send button (up to 3 attempts) -> fallback synthetic Enter -> cleanup -> return true. If neither the send button click nor the synthetic Enter triggers an actual send (e.g., the editor framework ignores synthetic KeyboardEvents as many modern editors do), the function still reports success. The content script's `handleDispatch` at `entrypoints/feishu.content.ts:283` interprets `pasteOk === true` as a successful paste and proceeds to confirmation polling, which will then timeout with `TIMEOUT` because the editor was never cleared. This results in an incorrect error code (`TIMEOUT`) rather than an accurate failure indication from the injector itself.

**Fix:** Return `false` when neither the send button nor the Enter key could be dispatched, or add a post-send verification check before returning `true`:
```typescript
// After cleanup, verify the editor was actually cleared
await new Promise<void>((resolve) => setTimeout(resolve, 200));
if ((editor.textContent ?? '').length > 0) {
  // Only do cleanup but don't falsely report success if nothing was sent
  // The content script will handle the TIMEOUT reporting
}
return true; // OK because content script handles confirmation
```
Note: Since the content script already has its own confirmation polling, this is a minor clarity issue rather than a functional bug. The existing `TIMEOUT` result is acceptable but slightly misleading.

### WR-03: `en.yml` platform icon tooltip says "Lark" but all other references use "Feishu/Lark"

**File:** `locales/en.yml:274`
**Issue:** The English locale defines `platform_icon_feishu` as `'Lark'`, while the Chinese locale uses `'飞书'` (the Chinese name). However, all other English-language references to this platform use the dual form "Feishu/Lark" (e.g., `feishu_tos_warning` says "Feishu/Lark dispatch...", `combobox_send_to_placeholder` says "Feishu/Lark chat", `error_code_PLATFORM_UNSUPPORTED_body` says "Feishu/Lark"). The tooltip should be consistent with the established naming convention. The tooltip appears on hover over the platform icon in the popup, so users will see "Lark" alone while the combobox placeholder says "Feishu/Lark" -- this inconsistency may confuse international users who know the product as "Feishu" rather than "Lark".

**Fix:** Change `platform_icon_feishu` in `en.yml` to use the dual form:
```yaml
platform_icon_feishu:
  message: 'Feishu/Lark'
```

## Info

### IN-01: `feishu-main-world.ts` send button selectors are speculative

**File:** `background/injectors/feishu-main-world.ts:51-54`
**Issue:** The send button selectors (`[aria-label*="Send"]`, `.send-btn`, `button[data-testid*="send"]`) are speculative -- they are not verified against actual Feishu DOM fixtures. The fixture HTML at `tests/unit/adapters/feishu.fixture.html:24` uses `aria-label="Send message"` which matches `[aria-label*="Send"]`, but the fixture is a simplified test fixture, not a captured real DOM. This is an acceptable risk given the testing constraints noted in CLAUDE.md ("adapters tested against committed DOM fixtures, not live sites"), and the fallback synthetic Enter provides a secondary attempt path.

**Fix:** When real Feishu DOM becomes available for validation, verify these selectors match. Consider adding a comment noting the speculative nature.

### IN-02: Content script `isLoggedOutPath` duplicates registry `loggedOutPathPatterns`

**File:** `entrypoints/feishu.content.ts:77-83`
**Issue:** The `isLoggedOutPath` function hardcodes login path prefixes (`/accounts/page/login`, `/login`, `/passport`) that are also defined in the feishu registry entry's `loggedOutPathPatterns` field in `shared/adapters/registry.ts:144`. These two lists could drift apart if one is updated without the other. However, they serve different purposes -- the registry patterns drive SW-side checks while the content script function runs in the tab context -- and the content script cannot import from the registry without pulling chrome.* dependencies into the content script bundle. The duplication is architecturally necessary given the constraints.

**Fix:** Add a comment in the content script noting the relationship to the registry entry:
```typescript
// NOTE: These patterns must stay in sync with the feishu registry entry's
// loggedOutPathPatterns in shared/adapters/registry.ts
```

---

_Reviewed: 2026-05-16T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
