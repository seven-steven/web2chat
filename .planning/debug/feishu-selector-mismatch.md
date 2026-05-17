---
status: diagnosed
trigger: "feishu editor tier1/tier2 selectors don't match real DOM, only tier3 generic contenteditable hits"
created: 2026-05-17T10:30:00+08:00
updated: 2026-05-17T10:45:00+08:00
---

## Current Focus

ROOT CAUSE CONFIRMED: fixture HTML was fabricated from Assumption A7, never validated against real Feishu DOM. Three specific selector mismatches identified.

## Symptoms

expected: tier1 (`[contenteditable][role=textbox]`) or tier2 (`.message-input [contenteditable]`) matches real Feishu editor
actual: only tier3 generic `[contenteditable]` matches, triggering low confidence warning
errors: None reported
reproduction: UAT Test 4 - dispatch to Feishu, observe low confidence warning
started: Discovered during UAT testing

## Eliminated

## Evidence

- timestamp: 2026-05-17T10:30:00+08:00
  checked: feishu.fixture.html DOM structure
  found: Fixture assumes editor is inside `<div class="message-input">` wrapping a `<div contenteditable="true" role="textbox" aria-label="Message">`
  implication: Both tier1 and tier2 selectors were designed to match this fabricated structure

- timestamp: 2026-05-17T10:31:00+08:00
  checked: RESEARCH.md Assumption A7
  found: "飞书编辑器有 role='textbox' 和 contenteditable='true' 属性" marked as needing DevTools verification
  implication: A7 was an assumption that was never validated against real Feishu DOM

- timestamp: 2026-05-17T10:33:00+08:00
  checked: feishu.content.ts findEditor() function (lines 95-109)
  found: tier1 uses `[contenteditable="true"][role="textbox"]`, tier2 uses `.message-input [contenteditable="true"]`, tier3 uses `[contenteditable="true"]`
  implication: tier1 requires BOTH contenteditable AND role=textbox on the SAME element; tier2 requires a parent with class "message-input"

- timestamp: 2026-05-17T10:35:00+08:00
  checked: feishu-main-world.ts (lines 12-15) — duplicate of same selector logic in MAIN world
  found: Same three-tier selectors duplicated in the MAIN world injector
  implication: Both content script and MAIN world injector will fail to match tier1/tier2 on real Feishu DOM

- timestamp: 2026-05-17T10:37:00+08:00
  checked: feishu-login-detect.ts (line 29) — guard condition uses tier1 selector
  found: Login guard checks `!document.querySelector('[contenteditable="true"][role="textbox"]')` before checking login class markers
  implication: Since real Feishu lacks role=textbox, this guard ALWAYS passes, potentially causing false positive login wall detection if any element has class containing "signin" or "login"

- timestamp: 2026-05-17T10:40:00+08:00
  checked: UAT Test 4 report and user DOM description
  found: User reported editor shows "Message" label with placeholder "Shift + Enter to add a new line". Only tier3 generic [contenteditable] matched.
  implication: Real Feishu editor contenteditable element does NOT have role="textbox" attribute and is NOT inside a .message-input container

- timestamp: 2026-05-17T10:42:00+08:00
  checked: RESEARCH.md section "Key insight" and "Open Question 3"
  found: Research explicitly states "编辑器 DOM 结构是最不透明的" and recommends DevTools verification of selectors. Open Question 3 notes selectors "must be verified on actual Feishu Web via DevTools during execution."
  implication: This was a KNOWN risk that was acknowledged but not mitigated — fixture was built from assumptions, not real DOM inspection

## Resolution

root_cause: The feishu fixture HTML (feishu.fixture.html) was fabricated from RESEARCH Assumption A7 which hypothesized that the Feishu editor would have `role="textbox"` and sit inside a `.message-input` container. These assumptions were never validated against the real Feishu Web DOM. The real Feishu contenteditable editor element lacks `role="textbox"` (invalidating tier1) and is not contained within any element with class `message-input` (invalidating tier2). Only the generic `[contenteditable="true"]` tier3 selector matches, which degrades to low confidence mode.

fix: Requires DevTools inspection of real Feishu Web editor DOM to determine actual attributes/classes/structure. Then update: (1) tier1/tier2 selectors in feishu.content.ts findEditor(), (2) duplicate selectors in feishu-main-world.ts, (3) guard selector in feishu-login-detect.ts line 29, (4) feishu.fixture.html to reflect real DOM.
verification:
files_changed: []
