---
phase: 10
reviewers: [claude-self]
reviewed_at: "2026-05-12T00:30:00+08:00"
plans_reviewed:
  - 10-01-PLAN.md
  - 10-02-PLAN.md
  - 10-03-PLAN.md
  - 10-04-PLAN.md
---

# Cross-AI Plan Review — Phase 10: Slack Adapter

> **Note:** Single-AI fallback review (no external CLIs available). External reviewers (gemini/codex/opencode) recommended for adversarial perspective.

## Claude Self-Review

### Summary

Phase 10 plans are well-structured, closely following the Discord adapter pattern established in Phase 5 and the registry-driven architecture from Phase 8. The wave decomposition is correct (Wave 1: format/login/registry all independent; Wave 2: content script depending on all three). TDD structure in Plans 01-02 is clean. The main concerns are a requirements mapping error in Plan 01, a missing test path for NOT_LOGGED_IN in Plan 04, and a potentially broad `[class*="login"]` selector in Plan 02 that could cause false positives. These are fixable without replanning.

### Strengths

- **Pattern replication is correct.** Plans follow the Discord adapter pattern precisely — format module, login detect, registry entry, MAIN world injector, content script, selector tests. The registry-driven architecture from Phase 8 is validated by Plan 04's "zero pipeline/SW changes" constraint.
- **TDD structure is clean.** Plans 01 and 02 use proper RED/GREEN TDD cycles. Tests are written first, imports fail (RED), then implementation makes them GREEN.
- **Requirements coverage is complete.** SLK-01 through SLK-05 are all covered across the 4 plans. No requirements are missing.
- **Login detection strategy is sound.** Plan 02 correctly identifies that Slack redirects logged-out users from `app.slack.com` to `slack.com` (different host), making DOM-level detection the primary defense (RESEARCH Pitfall 1). The `loggedOutPathPatterns` in the registry entry serve as secondary URL-layer defense.
- **Mention escaping is thorough.** Plan 01 covers all Slack mention patterns (`<!everyone>`, `<!here>`, `<!channel>`, `<@U123>`, `<@W123>`, `<#C123>`, bare `@everyone`, bare `@here`) with ZWS insertion and word-boundary protection.
- **Cross-plan dependency handling.** Plan 02's slack-match.spec.ts correctly acknowledges it will be RED until Plan 03 adds the registry entry. No hidden circular dependencies.
- **Threat models are present** in all 4 plans with proper STRIDE analysis.

### Concerns

1. **[MEDIUM] Plan 01 requirements mapping error.** Plan 01 frontmatter says `requirements: [SLK-05]`, but the plan implements `slack-format.ts` (mrkdwn formatting + mention escaping). SLK-05 is about platform icon + i18n key coverage. The formatting module is a prerequisite for SLK-03 (Quill injection — the formatted text is what gets injected). Correct mapping should be `SLK-03` or no standalone SLK requirement (formatting is an implementation decision, not a directly traceable requirement).

2. **[MEDIUM] Plan 04 missing NOT_LOGGED_IN test path.** The selector/confidence tests cover editor finding, confidence warnings, paste injection, and send confirmation — but no test verifies that `handleDispatch` returns `{ ok: false, code: 'NOT_LOGGED_IN' }` when the login wall is detected. This is a key safety behavior (SLK-02) that should have test coverage. The `waitForReady` racing logic between editor-found and login-detected deserves explicit test.

3. **[MEDIUM] Plan 02 `[class*="login"]` selector is broad.** The `detectLoginWall` function matches ANY element whose class contains the substring "login". In logged-in Slack pages, there could be elements with class fragments like "login-as-another-user" or "nologin-banner" that would trigger false positives. The threat model (T-10-03) acknowledges this as "accept" with fail-closed behavior, but a more specific selector (e.g., `[class*="login"][class*="container"]` or `[class*="login"][class*="page"]`) would reduce false-positive risk while keeping the fail-safe property.

4. **[LOW] Plan 03 Task 1 is oversized.** A single task modifies 5 files (registry, MAIN world injector, injector registry, wxt.config, verify-manifest) with 14 acceptance criteria. While the files are interdependent, this increases rollback cost if any single file has issues. Consider splitting into: (a) registry + injector files, (b) manifest config + verification.

5. **[LOW] Plan 03 `slackMainWorldPaste` uses `InputEvent('beforeinput', { inputType: 'deleteContentBackward' })` for pre-paste cleanup.** This works for Discord's Slate editor but Quill.js may handle synthetic `beforeinput` events differently. If Quill ignores the event, existing editor content won't be cleared before paste. This is fail-closed (post-Enter cleanup would also fail, leading to a send failure detection), but the injection would silently append to existing content before failing. Worth adding a note in the implementation.

6. **[LOW] Plan 04 has significant code duplication with `discord.content.ts`.** The plan says "与 discord.content.ts 完全相同的结构和逻辑" and replicates types, waitForReady, waitForEditor, handleDispatch, checkRateLimit, etc. This is by design (CONTEXT.md: adapters should not share implementation), but it means bug fixes in one adapter won't propagate to the other. Accepted architectural tradeoff.

### Suggestions

1. **Fix Plan 01 requirements mapping.** Change `requirements: [SLK-05]` to `requirements: [SLK-03]` (formatting is part of the injection pipeline). Plan 03 already correctly covers SLK-05.

2. **Add NOT_LOGGED_IN test to Plan 04.** Add a test case in `slack-selector.spec.ts`:
   ```typescript
   describe('Slack login detection (SLK-02)', () => {
     it('returns NOT_LOGGED_IN when login wall detected', async () => {
       document.body.innerHTML = '<input type="email" name="email" />';
       (window as any).happyDOM?.setURL('https://slack.com/check-login');
       const testing = getSlackTesting();
       const result = await testing!.handleDispatch(dispatchPayload);
       expect(result.ok).toBe(false);
       expect(result.code).toBe('NOT_LOGGED_IN');
     });
   });
   ```

3. **Narrow Plan 02's `[class*="login"]` selector.** Consider `[class*="login-overlay"]` or `[class*="loginPage"]` or at minimum add a negative check: only match `[class*="login"]` when `.ql-editor` is NOT present (i.e., the normal editor isn't loaded). This reduces false positives while maintaining the fail-safe property.

4. **Add a comment in Plan 03's `slackMainWorldPaste` noting that `beforeinput` cleanup may not work with Quill.js** and that the fallback behavior is to append to existing content (fail-closed by the send confirmation check).

5. **Consider extracting shared types** (`SelectorTier`, `EditorMatch`, `AdapterDispatchMessage`, `AdapterDispatchResponse`, `isAdapterDispatch`) into `shared/types/adapter-types.ts` to reduce duplication between Discord and Slack content scripts. This is a future cleanup, not blocking for Phase 10.

### Risk Assessment

**Overall Risk: LOW**

The plans are a direct pattern replication of the proven Discord adapter. The architecture (registry-driven, MAIN world bridge, ClipboardEvent paste) is already validated in production (Phases 4, 5, 8). The Slack-specific risks (Quill vs Slate behavior differences, login redirect cross-domain) are well-documented in the research with mitigation strategies.

The identified concerns are all fixable without replanning — they're test coverage gaps and selector specificity improvements, not architectural issues.

---

## Consensus Summary

(Single reviewer — no cross-model consensus available)

### Agreed Strengths

- Pattern replication from Discord adapter is precise and correct
- TDD structure in Plans 01-02 is clean
- Login detection strategy correctly addresses the cross-domain redirect pitfall
- Requirements coverage is complete (SLK-01 through SLK-05)
- Wave decomposition is correct

### Agreed Concerns

1. Plan 01 requirements mapping error (`SLK-05` should be `SLK-03`) — **MEDIUM**
2. Missing NOT_LOGGED_IN test path in Plan 04 — **MEDIUM**
3. Broad `[class*="login"]` selector in Plan 02 — **MEDIUM**

### Divergent Views

(N/A — single reviewer)

### Recommended Actions Before Execution

| Priority | Action | Plan | Effort |
|----------|--------|------|--------|
| HIGH | Fix requirements mapping: `SLK-05` → `SLK-03` | 10-01 | 1 line |
| HIGH | Add NOT_LOGGED_IN handleDispatch test | 10-04 | ~20 lines |
| MEDIUM | Narrow `[class*="login"]` selector or add `.ql-editor` absence check | 10-02 | ~5 lines |
| LOW | Add Quill `beforeinput` compatibility note | 10-03 | Comment only |
