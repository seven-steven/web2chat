---
status: awaiting_human_verify
trigger: "github action 高频报错，排查原因并修复，设计流程或者记录经验保证以后不再出问题。"
created: 2026-05-09
updated: 2026-05-09
---

# Debug Session: github-action

## Symptoms

- expected_behavior: GitHub Actions 在正常 push/PR 触发下全部通过。
- actual_behavior: 需要通过 `gh` 查询最近失败 run/job 日志确认；用户反馈为高频报错。
- error_messages: 使用 GitHub CLI 查询最近失败日志；若未登录或权限不足再请求用户协助。
- timeline: 最近才开始。
- reproduction: push/PR 触发。

## Current Focus

reasoning_checkpoint:
  hypothesis: "The recurring CI failure is caused by the Select outside-click unit test using ad-hoc timer flushing after Preact state/effect updates; on GitHub runner/Node 20 the document mousedown listener is not guaranteed to be installed before the test dispatches the outside mousedown, so the dropdown remains open."
  confirming_evidence:
    - "Multiple CI logs fail at the same Select outside-click assertion after `pnpm test`, while typecheck/lint pass."
    - "The test opens the dropdown via `button.click()` and relies on two `setTimeout(0)` ticks rather than Preact `act()` to flush render/effect work before dispatching the outside mousedown."
    - "Focused and full local runs pass on Node v25, showing the component is not deterministically broken and the failure is scheduler/environment-sensitive."
  falsification_test: "If replacing timer guessing with Preact `act()` around the open and outside-mousedown interactions still allows repeated local focused/full test runs to fail or CI logs keep failing at the same assertion, this hypothesis is wrong."
  fix_rationale: "Use Preact's test utility to flush state/effect work around the exact interactions under test, removing timing assumptions instead of changing production Select behavior."
  blind_spots: "Cannot run GitHub-hosted Node 20 runner locally; final remote confirmation requires a future CI run after the local fix is pushed by the user."

- hypothesis: confirmed timing-sensitive Select test flush issue
- test: Patch the Select outside-click test to use Preact act() for render/effect flushing, then run focused/full tests plus typecheck/lint.
- expecting: Local validation passes repeatedly and no longer depends on arbitrary timer ticks for this interaction.
- next_action: Edit tests/unit/options/select.spec.tsx to use Preact act() for render and the outside-click interaction.
- reasoning_checkpoint: complete
- tdd_checkpoint: not applicable (existing CI failure is the red test; fix is test harness stabilization)

## Evidence

- timestamp: 2026-05-09T00:00:00Z
  checked: Select.tsx and select.spec.tsx; focused local Vitest run for `click outside closes the dropdown`
  found: Component registers document `mousedown` listener only while open; test opens with `button.click()`, waits two setTimeout ticks, dispatches bubbling `mousedown` on a div appended to document.body, and focused run passes locally.
  implication: Failure is likely order/concurrency/test-isolation related rather than a deterministic single-test failure.
- timestamp: 2026-05-09T00:00:00Z
  checked: gh run view 25596691134 --log-failed
  found: Latest CI failure is job verify step `pnpm test`; Vitest failed `tests/unit/options/select.spec.tsx > Select > click outside closes the dropdown` at line 106 because `[role="listbox"]` remained present after outside click.
  implication: Primary CI failure is a flaky or incorrect Select outside-click unit test/component behavior, not install/lint/build setup.
- timestamp: 2026-05-09T00:00:00Z
  checked: gh run list --limit 10 --status failure
  found: Recent failures include repeated CI workflow failures on main push (latest run 25596691134) plus one Release workflow failure on v1.0.
  implication: GitHub CLI is authenticated enough for read-only run listing; inspect latest CI failure first to identify repeated failing step.
- timestamp: 2026-05-09T00:00:00Z
  checked: .github/workflows directory listing
  found: Repository has ci.yml and release.yml workflows.
  implication: CI workflow config and release workflow config are the likely local files involved if failure is configuration-related.

## Evidence

- timestamp: 2026-05-09T00:00:00Z
  checked: Full local select.spec.tsx and `pnpm test`
  found: Full Select spec passed locally (4/4); full test suite passed locally (35 files, 239 tests) in 4.62s.
  implication: The failing test is intermittent/CI-sensitive; local deterministic reproduction did not occur with one full run.
- timestamp: 2026-05-09T00:00:00Z
  checked: vitest.config.ts and package.json test script
  found: Tests run in happy-dom; no sequence/concurrency override; script is `vitest run --passWithNoTests`.
  implication: CI executes the same Vitest command as local, so likely timing/scheduler sensitivity inside the test or component lifecycle.
- timestamp: 2026-05-09T00:00:00Z
  checked: Failed Release workflow run 25590133574
  found: Release workflow also failed in `pnpm test` at the same `tests/unit/options/select.spec.tsx > Select > click outside closes the dropdown` assertion.
  implication: The same Select test timing issue affects both normal CI and tag release verification; one test harness fix covers both workflows.
- timestamp: 2026-05-09T00:00:00Z
  checked: Post-fix verification commands
  found: `pnpm vitest run tests/unit/options/select.spec.tsx --reporter=verbose` passed; repeated Select spec 5 times passed; `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm verify:manifest` all passed locally.
  implication: Local CI-equivalent verification passes after stabilizing the Select test harness; remaining verification is a future GitHub-hosted run after user pushes the local changes.

## Eliminated

- hypothesis: CI failure is caused by install/lint/typecheck/build workflow setup.
  evidence: Latest and prior failed logs reach `pnpm test`; typecheck and lint complete before failure; error is a single Vitest assertion in Select outside-click test.
  timestamp: 2026-05-09T00:00:00Z
- hypothesis: The Select outside-click behavior is deterministically broken in the component.
  evidence: Focused Select outside-click test, full Select spec, and full `pnpm test` all pass locally; CI failure appears only under GitHub runner timing/Node 20 scheduling.
  timestamp: 2026-05-09T00:00:00Z

## Resolution

- root_cause: Select outside-click unit test used timer-based flushing instead of Preact act(), making effect/listener registration timing sensitive on GitHub Actions Node 20/happy-dom runs.
- fix: Updated Select test harness to use Preact `act()` around render and the outside-click interaction.
- verification: `pnpm vitest run tests/unit/options/select.spec.tsx --reporter=verbose` passed; repeated Select spec 5 times passed; `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm verify:manifest` passed locally. Remote GitHub Actions verification remains pending until these local changes are pushed.
- files_changed:
  - /home/seven/data/coding/projects/seven/web2chat/tests/unit/options/select.spec.tsx
