---
status: resolved
trigger: "修正 github action 报错 https://github.com/seven-steven/web2chat/actions/runs/25590133574，排查原因并修复，设计流程或者记录经验保证以后不再出问题。"
created: "2026-05-09"
updated: "2026-05-09"
---

# Debug Session: github-action-failure

## Symptoms

- expected_behavior: GitHub Actions run should pass for the repository changes.
- actual_behavior: GitHub Actions run at https://github.com/seven-steven/web2chat/actions/runs/25590133574 failed.
- error_messages: Release workflow job `release` failed at `pnpm test`; Vitest failed `tests/unit/options/select.spec.tsx > Select > click outside closes the dropdown` because `[role="listbox"]` remained present after outside mousedown.
- timeline: Observed on 2026-05-09 via the provided run URL.
- reproduction: CI command is `pnpm test` after install/typecheck/lint in `.github/workflows/release.yml`.

## Current Focus

- hypothesis: Confirmed; the failed run was at commit `ae5619318403bd20550022f9811dac1cb34464a9` (`v1.0`) before the Select outside-click test harness stabilization now present on `main`.
- test: Inspect GitHub Actions logs with `gh`, reproduce/verify the same command locally, compare failed SHA with current HEAD, then run CI-equivalent checks.
- expecting: Current HEAD passes the failed command and release gate commands locally.
- next_action: no code change needed in current working tree; push/current HEAD or rerun CI from current `main` when desired.
- reasoning_checkpoint: complete
- tdd_checkpoint: existing CI failure is the red test; current tree already contains the green test-harness stabilization.

## Evidence

- timestamp: 2026-05-09T17:13:00+08:00
  checked: `gh run view 25590133574 --repo seven-steven/web2chat --json status,conclusion,name,createdAt,updatedAt,jobs,event,headBranch,headSha,url`
  found: Release workflow failed on push to `v1.0`, head SHA `ae5619318403bd20550022f9811dac1cb34464a9`; install, typecheck, and lint succeeded; `pnpm test` failed.
  implication: Failure is a unit-test/runtime flake or assertion issue, not dependency install, lint, typecheck, packaging, or release publishing.
- timestamp: 2026-05-09T17:13:00+08:00
  checked: `gh run view 25590133574 --repo seven-steven/web2chat --log-failed`
  found: `tests/unit/options/select.spec.tsx > Select > click outside closes the dropdown` failed at the assertion expecting no `[role="listbox"]` after dispatching outside mousedown.
  implication: Root cause area is the Select outside-click test harness / event-effect flushing.
- timestamp: 2026-05-09T17:13:00+08:00
  checked: `pnpm test` locally on current HEAD `a3c4ed90f70136fa36267c8c79871d949e0fba87`
  found: Full Vitest suite passed locally: 35 files, 239 tests.
  implication: The failed CI command is green on the current working tree.
- timestamp: 2026-05-09T17:14:00+08:00
  checked: `git log --oneline --decorate -8` and `git diff ae5619318403bd20550022f9811dac1cb34464a9..HEAD --name-only`
  found: Current `main` includes commits `022f041 fix(readme,tests): remove duplicate CWS link and stabilize Select test` and `a3c4ed9 test(options): stabilize Select outside-click test`; changed files include `tests/unit/options/select.spec.tsx`.
  implication: The durable fix already exists after the failed release SHA; no additional source change is needed in this session.
- timestamp: 2026-05-09T17:15:00+08:00
  checked: Release/CI-equivalent local verification commands
  found: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm verify:manifest` all passed on current HEAD.
  implication: Current HEAD satisfies the local gates that failed/preceded the failed GitHub Actions run.

## Eliminated

- hypothesis: The provided run failed because of release token/permission/publishing configuration.
  evidence: The `Release` step was skipped because `pnpm test` failed first; earlier setup/typecheck/lint steps passed.
  timestamp: 2026-05-09T17:13:00+08:00
- hypothesis: Current working tree still contains the failing Select test behavior.
  evidence: Current `pnpm test` passed locally, and current history contains explicit Select test stabilization commits after the failed SHA.
  timestamp: 2026-05-09T17:14:00+08:00

## Resolution

- root_cause: The provided GitHub Actions run executed the older `v1.0` SHA where `tests/unit/options/select.spec.tsx` used timing-sensitive outside-click flushing, so the document mousedown listener was not reliably observed on the GitHub runner and the dropdown stayed open.
- fix: No new code change was needed in the current working tree; current `main` already includes the Select test-harness stabilization commits after the failed SHA.
- verification: `gh` confirmed the failing CI step; local `pnpm test` reproduced the same CI command on current HEAD and passed; `pnpm typecheck`, `pnpm lint`, and `pnpm verify:manifest` also passed.
- files_changed:
  - /home/seven/data/coding/projects/seven/web2chat/.planning/debug/github-action-failure.md
