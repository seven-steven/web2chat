---
status: resolved
trigger: "Discord adapter injects wrong content -- single '¬' character instead of formatted markdown. Enter never fires. Popup shows dispatch timeout."
created: 2026-05-05T00:00:00.000Z
updated: 2026-05-06T10:51:00.000Z
---

## Current Focus

hypothesis: "RESOLVED — Discord paste must be executed in MAIN world; the prior inline-script postMessage bridge did not execute under the E2E path and still timed out."
test: "pnpm typecheck && pnpm test:e2e -- tests/e2e/discord-dispatch.spec.ts; pnpm build; pnpm test; pnpm lint"
expecting: "Automated Discord stub dispatch succeeds; production build and unit tests pass; lint has no errors."
next_action: "Human UAT on real Discord with fresh production build to confirm live Slate behavior."

## Symptoms

expected: "Adapter injects formatted markdown via synthetic ClipboardEvent('paste') into Discord's Slate editor, then simulates Enter to send."
actual: "Slate editor receives a single '¬' character (U+00AC NOT SIGN) instead of the formatted markdown text. Enter key simulation never triggers. Popup shows dispatch timeout."
errors: "Dispatch timeout — message confirmation timed out"
reproduction: "Dispatch to a Discord channel page via the extension popup"
started: "Since Discord adapter implementation (Phase 5)"

## Eliminated

## Evidence

- timestamp: 2026-05-05T00:01:00Z
  checked: "dispatch-pipeline.ts line 211"
  found: "executeScript uses world: 'ISOLATED' for all adapter content scripts including Discord"
  implication: "Content script JS environment is isolated from the page's MAIN world JS"

- timestamp: 2026-05-05T00:02:00Z
  checked: "discord.content.ts pasteText function (lines 97-108)"
  found: "Creates DataTransfer in ISOLATED world, calls setData('text/plain', text), passes to ClipboardEvent constructor, dispatches on editor element"
  implication: "DataTransfer object created in ISOLATED world; page's Slate JS in MAIN world reads it"

- timestamp: 2026-05-05T00:03:00Z
  checked: "Web research: Chrome isolated world + DataTransfer cross-boundary behavior"
  found: "JS objects (including DataTransfer) don't cross world boundaries. ISOLATED world DataTransfer is not readable from MAIN world. Slate editor discussion confirms paste doesn't work from ISOLATED world — DataTransfer.getData() returns empty."
  implication: "Root cause confirmed: Discord's Slate reads empty/null from clipboardData.getData() because DataTransfer was created in a different world"

- timestamp: 2026-05-05T00:04:00Z
  checked: "E2E test stub vs real Discord"
  found: "E2E stub (tests/e2e/fixtures/discord/index.html) has its own paste handler in page JS. But in the E2E test, the content script is injected with world:'ISOLATED' and dispatches ClipboardEvent — the stub's handler in MAIN world would face the same issue. Test may pass on older Chrome or have a bug."
  implication: "The E2E test may be incorrectly passing, or Chrome's behavior varies. Either way, real Discord definitely can't read the DataTransfer cross-world."

- timestamp: 2026-05-05T00:05:00Z
  checked: "'¬' character origin analysis"
  found: "U+00AC (NOT SIGN). When Slate gets a paste event with empty/unreadable clipboardData, it may fall through to reading from the system clipboard or produce unexpected behavior. The '¬' could be an artifact of Slate's internal paste processing when data is empty, or a keyboard shortcut artifact (Option+L on Mac produces ¬)."
  implication: "The specific '¬' character is a secondary symptom — primary issue is empty clipboardData due to world isolation"

- timestamp: 2026-05-05T00:06:00Z
  checked: "Chromium V8 bindings design doc (chromium.googlesource.com)"
  found: "All worlds in one isolate share underlying C++ DOM objects, but each world has its own DOM wrappers. No JavaScript objects are shared among the worlds. Events dispatched cross-world are re-wrapped — the DataTransfer C++ object is shared but its JS wrapper in the receiving world may not expose data set in the originating world."
  implication: "Architectural confirmation: DataTransfer.getData() returns empty in MAIN world for data set via ISOLATED world's setData()"

- timestamp: 2026-05-05T00:07:00Z
  checked: "Slate GitHub Discussion #5721: 'How do I programmatically insert text using Chrome extension on Slate document?'"
  found: "Confirmed that clipboard paste from content script doesn't work with Slate editors. Recommended approach: inject into MAIN world or access Slate editor instance directly via React internals."
  implication: "Known community issue — paste injection into Slate requires MAIN world execution"

- timestamp: 2026-05-06T10:45:00Z
  checked: "Current code after Phase 05 Plan 05 summary"
  found: "entrypoints/discord.content.ts had an inline <script> + postMessage bridge, but tests/e2e/discord-dispatch.spec.ts still failed with { ok:false, code:'TIMEOUT', message:'Paste injection timed out' }."
  implication: "The claimed MAIN-world bridge was not sufficient in the current code state; automated regression still reproduced the send failure."

- timestamp: 2026-05-06T10:48:00Z
  checked: "Alternative bridge using chrome.runtime.sendMessage"
  found: "webext-core messaging rejected the raw message format before the direct runtime listener could handle it."
  implication: "Raw sendMessage conflicts with the project's typed messaging layer; the bridge needs a separate channel."

- timestamp: 2026-05-06T10:50:00Z
  checked: "Runtime Port + service-worker chrome.scripting.executeScript({ world:'MAIN' }) bridge"
  found: "Content script connects to a dedicated runtime port; background executes the paste+Enter function in MAIN world for the sender tab. Discord E2E stub passes."
  implication: "DataTransfer is now created in MAIN world without page inline script or postMessage spoofing surface."

## Resolution

root_cause: "The original Discord adapter created ClipboardEvent/DataTransfer in an ISOLATED content-script world, which Discord Slate cannot read in MAIN world. The later inline-script postMessage bridge still failed in the current automated E2E path, so the send operation timed out before confirmation."
fix: "Replaced the inline postMessage bridge with a dedicated runtime Port from discord.content.ts to background.ts; the background executes paste+Enter via chrome.scripting.executeScript({ world:'MAIN' }) in the sender tab, and confirmation now captures the pre-send message count so synchronous sends are not missed."
verification: "PASS: pnpm typecheck && pnpm test:e2e -- tests/e2e/discord-dispatch.spec.ts (2/2 passed). PASS: pnpm build. PASS: pnpm test (26 files, 193 tests). PASS: pnpm lint (0 errors, 4 pre-existing warnings in types/turndown-plugin-gfm.d.ts). NOTE: an earlier pnpm test run failed before production build because verify-manifest read stale .output/chrome-mv3 artifacts; after pnpm build it passed."
files_changed:
  - "/data/coding/projects/seven/web2chat/entrypoints/background.ts"
  - "/data/coding/projects/seven/web2chat/entrypoints/discord.content.ts"
  - "/data/coding/projects/seven/web2chat/tests/e2e/discord-dispatch.spec.ts"
