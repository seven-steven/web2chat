---
status: diagnosed
trigger: "Discord adapter injects wrong content -- single '¬' character instead of formatted markdown. Enter never fires. Popup shows dispatch timeout."
created: 2026-05-05T00:00:00.000Z
updated: 2026-05-05T00:10:00.000Z
---

## Current Focus

hypothesis: "CONFIRMED — ClipboardEvent dispatched from ISOLATED world content script carries a DataTransfer object that Discord's Slate editor (running in MAIN world) cannot read."
test: "N/A — root cause confirmed via code review + web research + Chromium architecture documentation"
expecting: "N/A"
next_action: "Return diagnosis — fix requires paste injection to execute in MAIN world"

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

## Resolution

root_cause: "The discord.content.ts adapter is injected via chrome.scripting.executeScript with world:'ISOLATED' (dispatch-pipeline.ts line 211). The pasteText() function creates a DataTransfer object and ClipboardEvent in the ISOLATED world, then dispatches it to Discord's Slate editor. However, Discord's Slate JavaScript runs in the MAIN world and cannot read DataTransfer objects created in the ISOLATED world — getData('text/plain') returns empty string. With no valid paste data, Slate either ignores the event or produces unexpected behavior (the '¬' character), and the Enter key simulation that follows has nothing to send."
fix: ""
verification: ""
files_changed: []
