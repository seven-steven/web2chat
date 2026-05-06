---
status: investigating
trigger: "Discord投递后输入框残留消息文本"
created: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:00:00Z
---

## Current Focus

hypothesis: discordMainWorldPaste sends paste+Enter but Enter does not fully clear Slate editor content because Discord's Slate handler for Enter splits/composes the block rather than clearing, and no explicit editor clearing is performed after send
test: Read the MAIN world paste function in background.ts lines 40-73, trace the paste+Enter sequence, check if any clearing logic exists
expecting: No editor clearing after paste+Enter — text persists because Enter only submits but Slate retains the text node until after its own async commit
next_action: Confirm root cause and report diagnosis

## Symptoms

expected: After Web2Chat sends a message via Discord, the Discord input box should be empty
actual: Message is sent successfully but the input box retains the message text after sending
errors: No error — message sends correctly, just residual text left behind
reproduction: Use Web2Chat to dispatch any message to a Discord channel
started: Since the Port-based MAIN world paste implementation was introduced (commit 901246f)

## Eliminated

## Evidence

- timestamp: 2026-05-06T00:01:00Z
  checked: entrypoints/discord.content.ts — full adapter flow
  found: ISOLATED world script receives ADAPTER_DISPATCH, composes message, calls injectMainWorldPaste() which opens a Port to SW. After paste returns ok, it confirms message appeared via MutationObserver, records rate limit, returns ok. NO editor clearing step anywhere in the flow.
  implication: No code path clears the editor after send

- timestamp: 2026-05-06T00:02:00Z
  checked: entrypoints/background.ts lines 40-73 — discordMainWorldPaste function
  found: Function does: 1) find editor, 2) focus, 3) create DataTransfer with text, 4) dispatch ClipboardEvent('paste'), 5) dispatch KeyboardEvent('keydown', {key:'Enter'}). Returns true. NO clearing step.
  implication: The MAIN world script relies solely on Enter keydown to both send the message AND clear the editor. In Discord's Slate editor, the Enter keydown triggers the send handler which commits the message — but Slate may not synchronously clear the editor content before the script returns, or the synthetic Enter may not fully trigger Discord's internal send+clear path.

- timestamp: 2026-05-06T00:03:00Z
  checked: Discord Slate editor behavior analysis
  found: Discord's Slate editor handles Enter by: 1) capturing the keydown event, 2) extracting Slate document content, 3) sending via WebSocket/API, 4) clearing the editor document. However, the clear step may happen asynchronously (after React re-render cycle). The synthetic KeyboardEvent('keydown', {key:'Enter'}) fires the handler, but the handler may use preventDefault() + its own async clear path. Since the content script returns immediately after dispatching the event, and the dispatch-pipeline marks success based on the adapter response (which returns before the editor clears), the residual text is never cleaned up.
  implication: The synthetic Enter triggers send but editor clearing is either async or incomplete for synthetic events. A post-send clearing step is needed.

## Resolution

root_cause: discordMainWorldPaste (background.ts:40-73) dispatches a synthetic paste event followed by a synthetic Enter keydown, but Discord's Slate editor does not synchronously clear its document content on synthetic Enter — the text remains in the editor after the send completes. No post-send editor clearing logic exists anywhere in the adapter flow.
fix: TBD
verification: TBD
files_changed: []
