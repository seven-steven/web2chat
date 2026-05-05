---
status: diagnosed
trigger: "Discord Terms of Service notice missing from SendForm in popup"
created: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:01:00Z
---

## Current Focus

hypothesis: Implementation is CORRECT — UAT false negative due to stale build or testing methodology
test: Verified code, i18n, CSS, compiled output — all correct
expecting: N/A — implementation confirmed present and correct
next_action: Report diagnosis

## Symptoms

expected: A localized footnote about Discord ToS appears at bottom of SendForm when dispatching to Discord
actual: UAT tester reported "未发现 ToS 提示文字" (ToS prompt text not found)
errors: None — silent missing UI
reproduction: Open popup, enter Discord channel URL in send-to, observe below Confirm button
started: Reported during Phase 05 UAT (2026-05-05)

## Eliminated

- hypothesis: Feature was never implemented
  evidence: Code exists at SendForm.tsx:341-354, added in commit 2c90d03 (2026-05-05 10:30)
  timestamp: 2026-05-05

- hypothesis: i18n keys are missing
  evidence: discord_tos_warning and discord_tos_details exist in locales/en.yml:252-255, locales/zh_CN.yml:252-255, and in .wxt/i18n/structure.d.ts:101-102
  timestamp: 2026-05-05

- hypothesis: CSS classes are purged/missing from build
  evidence: text-amber-600 class exists in .output/chrome-mv3-dev/assets/options-jlnIxXRH.css (confirmed with grep)
  timestamp: 2026-05-05

- hypothesis: Platform detection doesn't return 'discord' for Discord URLs
  evidence: detectPlatformId test passes (10/10). UAT test #2 confirms icon renders (detection works). Code uses same platformId state for both icon and ToS conditional.
  timestamp: 2026-05-05

- hypothesis: Build output doesn't contain the ToS rendering code
  evidence: Grep of popup-vwmZPtqO.js shows `m===\`discord\`` conditional with discord_tos_warning. Build timestamp 11:37 > code commit 10:30.
  timestamp: 2026-05-05

- hypothesis: Popup overflow clips the ToS below viewport
  evidence: ToS is at ~272px from top (after header + send-to + prompt + button). Chrome popup max is 600px. ToS is well within viewport.
  timestamp: 2026-05-05

## Evidence

- timestamp: 2026-05-05
  checked: SendForm.tsx source code
  found: Lines 341-354 contain conditional rendering `{platformId === 'discord' && (<p>...</p>)}` with discord_tos_warning and discord_tos_details i18n keys
  implication: Feature IS implemented

- timestamp: 2026-05-05
  checked: locales/en.yml and locales/zh_CN.yml
  found: Both contain discord_tos_warning and discord_tos_details at lines 252-255
  implication: i18n keys ARE defined

- timestamp: 2026-05-05
  checked: .wxt/i18n/structure.d.ts
  found: Lines 101-102 declare discord_tos_warning and discord_tos_details with proper typing
  implication: TypeScript types are generated correctly

- timestamp: 2026-05-05
  checked: Built CSS output (options-jlnIxXRH.css)
  found: .text-amber-600{color:var(--color-amber-600)} and .dark\:text-amber-400{color:var(--color-amber-400)} present
  implication: Styling IS included in build

- timestamp: 2026-05-05
  checked: Built JS output (popup-vwmZPtqO.js)
  found: Compiled code includes `m===\`discord\`` conditional rendering discord_tos_warning
  implication: Feature IS in the compiled bundle

- timestamp: 2026-05-05
  checked: Git history
  found: ToS code added in 2c90d03 (10:30), build generated at 11:37, UAT started at 12:00
  implication: Build was current when UAT was performed

- timestamp: 2026-05-05
  checked: UAT test #2 result
  found: "频道页显示的 Discord icon 不对" — icon shows but wrong graphic. This CONFIRMS platformId === 'discord' is true (icon only renders when platform detected)
  implication: Same platformId state controls both icon and ToS; if icon shows, ToS should render

## Resolution

root_cause: |
  NOT a code bug. The Discord ToS footnote implementation is COMPLETE and CORRECT:
  - SendForm.tsx:341-354 conditionally renders the footnote when platformId === 'discord'
  - i18n keys (discord_tos_warning, discord_tos_details) are defined in both locales
  - CSS (text-amber-600) is included in build output
  - Build was regenerated after the code commit
  
  The UAT failure is likely a FALSE NEGATIVE caused by one of:
  1. Tester ran stale extension that didn't hot-reload after 2c90d03 commit
  2. Tester didn't have a valid Discord channel URL in the send-to field (detection requires https://discord.com/channels/<g>/<c> format, NOT DM or login URLs)
  3. Tester overlooked the footnote due to its position (below Confirm button) and subtle styling (text-xs amber text)
  
  Evidence that code is correct: UAT test #2 confirms platformId='discord' IS set (icon appears), and the same state variable gates both the icon and the ToS footnote.
fix: No code fix needed. Recommend re-testing with fresh build and valid Discord channel URL.
verification: Code review + static analysis confirms implementation. No runtime reproduction of the bug.
files_changed: []
