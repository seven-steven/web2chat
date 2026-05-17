---
status: investigating
trigger: "飞书所有群组都使用同一个 URL https://wqpj2wow47w.feishu.cn/next/messenger，无法根据 URL 定位到具体的聊天"
created: 2026-05-17T22:00:00+08:00
updated: 2026-05-17T22:00:00+08:00
---

## Current Focus

hypothesis: Feishu web messenger is a SPA where all chats share the same base URL ({tenant}.feishu.cn/next/messenger) with no chat-specific path or hash segment — making the current URL-based chat verification and rate-limiting architecture fundamentally incompatible.
test: Trace the full URL comparison chain from dispatch-pipeline through feishu.content.ts, verify Feishu SPA URL behavior against research docs and web search
expecting: Content script's `currentHref !== payload.send_to` check always passes (or always fails) because all chats have identical URLs
next_action: Synthesize findings and return ROOT CAUSE FOUND

## Symptoms

expected: 每个飞书聊天有唯一 URL，投递管线可根据 URL 定位到具体聊天
actual: 所有群组共享同一 URL https://xxx.feishu.cn/next/messenger，无法根据 URL 定位到具体聊天
errors: None reported
reproduction: Navigate to different Feishu group chats in browser, observe URL bar stays the same base URL
started: Discovered during UAT testing

## Eliminated

## Evidence

- timestamp: 2026-05-17T22:00:00
  checked: feishu.content.ts lines 199-208 — URL verification logic
  found: Content script does strict equality `window.location.href !== payload.send_to` to verify correct chat. If user saved send_to as "https://wqpj2wow47w.feishu.cn/next/messenger" and all chats share this URL, verification PASSES for ANY chat (not just the intended one).
  implication: URL-based chat verification cannot distinguish between different Feishu chats

- timestamp: 2026-05-17T22:01:00
  checked: feishu.content.ts line 211 — rate limit key
  found: Rate limit uses full `payload.send_to` URL as key. All chats share same URL, so rate limit applies across ALL chats indiscriminately.
  implication: Sending to Chat A rate-limits sending to Chat B, since both use the same URL key

- timestamp: 2026-05-17T22:02:00
  checked: dispatch-pipeline.ts openOrActivateTab() lines 86-115
  found: `chrome.tabs.query({ url: url + '*' })` matches any tab with the base URL prefix. If multiple Feishu chats are open, it cannot distinguish which specific chat tab to target. `exactMatches` filter compares `t.url === url`, which would match ALL Feishu chat tabs (since they all have the same URL).
  implication: Tab targeting is non-deterministic when multiple Feishu tabs are open

- timestamp: 2026-05-17T22:03:00
  checked: Discord adapter extractChannelId() and Telegram adapter extractChatId()
  found: Other adapters extract a chat-specific ID from the URL (Discord: /channels/<server>/<channel>, Telegram: /a/<chatId> or hash fragment). They compare extracted IDs, not full URLs. Feishu has NO such ID in its web URL structure.
  implication: The adapter pattern assumes URL-identifiable chats; Feishu breaks this assumption

- timestamp: 2026-05-17T22:04:00
  checked: 12-RESEARCH.md assumptions A1 and open questions Q1
  found: Research noted "match function broad path matching, no chat_id extraction needed -- rate limit uses full send_to URL". This assumption was incorrect — the full send_to URL is identical for all chats. The research also flagged "具体 chat 路由格式（是 hash 路由还是 path 路由？chat_id 如何出现在 URL 中？）" as unclear.
  implication: Research identified the risk but the implementation proceeded without resolving it

- timestamp: 2026-05-17T22:05:00
  checked: Feishu AppLink protocol documentation (open.feishu.cn)
  found: Official deep links use `https://applink.feishu.cn/client/chat/open?openChatId=oc_xxx` format — these are AppLink URLs that open the desktop/mobile client, NOT web URLs. The web client at {tenant}.feishu.cn/next/messenger does NOT expose chat_id in the URL.
  implication: No publicly documented way to deep-link to a specific Feishu web chat via URL

- timestamp: 2026-05-17T22:06:00
  checked: Feishu web SPA routing behavior
  found: Feishu web messenger uses either Memory routing or internal state management — switching between chats does NOT update window.location (neither path nor hash). All chats are accessed from the same URL.
  implication: This is a fundamental limitation of Feishu's web architecture, not a bug in our code

## Resolution

root_cause: Feishu web messenger ({tenant}.feishu.cn/next/messenger) is a SPA where switching between chats does NOT change the URL (no path segment, no hash fragment). All group chats and DMs share the identical base URL. This breaks three architectural assumptions: (1) content script URL verification (send_to === window.location.href) either always passes or always fails with no chat specificity, (2) rate-limiting by URL key conflates all chats into one bucket, (3) dispatch pipeline tab targeting cannot distinguish which Feishu chat tab contains the intended conversation. This is a fundamental Feishu web platform limitation, not a code bug.
fix: Requires architectural change — potential workarounds include: (a) skip URL-based chat verification for Feishu and rely on user being on the correct chat, (b) extract chat name/title from DOM for verification instead of URL, (c) use Feishu AppLink protocol to open specific chats then inject, or (d) accept the limitation and document that users must manually navigate to the target chat before dispatching.
verification: Pending — architectural decision needed
files_changed: []
