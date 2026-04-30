---
phase: 3
slug: dispatch-popup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `03-RESEARCH.md` §"Validation Architecture"

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (unit) + Playwright 1.59 (E2E) |
| **Config file** | `vitest.config.ts` + `playwright.config.ts` (Phase 1+2 已就位) |
| **Quick run command** | `pnpm test` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest` |
| **E2E command** | `pnpm test:e2e` (本地手测；CI 接入留 Phase 4) |
| **Estimated runtime** | unit + typecheck + lint < 30s；E2E < 5min |

---

## Sampling Rate

- **After every task commit:** `pnpm typecheck && pnpm lint && pnpm test`
- **After every plan wave:** `pnpm typecheck && pnpm lint && pnpm test && pnpm verify:manifest`
- **Before `/gsd-verify-work`:** 上述 + `pnpm test:e2e` 全绿（人工 gate）
- **Max feedback latency:** ~30 秒（per-task）

---

## Per-Task Verification Map

> 由 planner 在 PLAN.md 中按任务粒度填充。下表为 Phase 需求 → 测试映射的初稿，planner 必须把每条映射到具体任务 ID 与 `<automated>` 命令。

| Req ID | Behavior | Test Type | Automated Command | Wave 0 |
|--------|----------|-----------|-------------------|--------|
| DSP-01 | send_to debounce 200ms → platform icon | unit | `pnpm test tests/unit/dispatch/platform-detector.spec.ts` | ❌ |
| DSP-01 | popup 渲染 platform icon | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ |
| DSP-02 | history dropdown score 排序 + cap 50 | unit | `pnpm test tests/unit/repos/history.spec.ts` | ❌ |
| DSP-03 | prompt 历史复用 + 自动补全 | unit | `pnpm test tests/unit/repos/history.spec.ts` | ❌ |
| DSP-04 | binding upsert + Soft overwrite + dirty flag | unit | `pnpm test tests/unit/repos/binding.spec.ts` | ❌ |
| DSP-04 | popup 切换 send_to → prompt 自动切换 | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ |
| DSP-05 | tabs.create/update + waitForComplete + executeScript | unit | `pnpm test tests/unit/dispatch/state-machine.spec.ts` | ❌ |
| DSP-05 | 端到端 popup → SW → mock-platform | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ |
| DSP-06 | 同 dispatchId 重复请求幂等 | unit | `pnpm test tests/unit/dispatch/state-machine.spec.ts` | ❌ |
| DSP-06 | SW restart 后续接 awaiting_complete | e2e | `pnpm test:e2e -- dispatch.spec.ts` (CDP stopWorker) | ❌ |
| DSP-06 | 200ms 双击产生 1 个 dispatch | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ |
| DSP-07 | 5 个新 ErrorCode popup 渲染对应文案 | unit + e2e | unit ErrorView + e2e `mock://?fail=*` | ❌ |
| DSP-08 | badge 三态 loading/ok/err | unit | `pnpm test tests/unit/dispatch/state-machine.spec.ts` | ❌ |
| DSP-08 | badge 自清 30s（A3 deviation：5s → 30s） | e2e | `pnpm test:e2e -- dispatch.spec.ts` | ❌ |
| DSP-09 | popup 编辑 → 关闭 → 重开恢复 | e2e | `pnpm test:e2e -- draft-recovery.spec.ts` | ❌ |
| DSP-09 | dispatch=done 后 popupDraft 清 | unit | `pnpm test tests/unit/repos/popupDraft.spec.ts` | ❌ |
| DSP-10 | manifest commands._execute_action 字段 | manifest | `pnpm verify:manifest` | ✓ (脚本已存在，需扩展) |
| DSP-10 | 快捷键打开 popup + 自动 capture.run | manual | README 手测脚本 | ✓ |
| STG-03 | options page reset history 二次确认 | e2e | `pnpm test:e2e -- options-reset.spec.ts` | ❌ |
| STG-03 | typed-repo resetAll | unit | `pnpm test tests/unit/repos/{history,binding}.spec.ts` | ❌ |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ✓ infrastructure exists*

---

## Wave 0 Requirements

新增的测试 / 脚本 stub —— planner 必须把这些放到 Wave 0（最早的 wave）：

- [ ] `tests/unit/dispatch/state-machine.spec.ts` — DSP-05/06/08 状态机推进
- [ ] `tests/unit/dispatch/platform-detector.spec.ts` — DSP-01 adapter-registry.match
- [ ] `tests/unit/repos/history.spec.ts` — DSP-02/03 + STG-03 history 部分
- [ ] `tests/unit/repos/binding.spec.ts` — DSP-04 + STG-03 binding 部分
- [ ] `tests/unit/repos/popupDraft.spec.ts` — DSP-09 持久化 + cleanup
- [ ] `tests/unit/messaging/dispatch.spec.ts` — capture.spec.ts mirror 模式
- [ ] `tests/e2e/fixtures/mock-platform.html` — stub 目标页面 + query string failure injection
- [ ] `tests/e2e/dispatch.spec.ts` — DSP-05/06/07/08 端到端
- [ ] `tests/e2e/draft-recovery.spec.ts` — DSP-09
- [ ] `tests/e2e/options-reset.spec.ts` — STG-03
- [ ] `scripts/verify-manifest.ts` 扩展 — `commands._execute_action.suggested_key.default === 'Ctrl+Shift+S'` + `options_ui.page === 'options.html'` 断言

*框架 install: 已就位（Phase 1 落地 Vitest + Playwright），Phase 3 无新测试依赖。*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `Ctrl+Shift+S` 打开 popup | DSP-10 | Playwright 暂无可靠的 OS-level 全局快捷键模拟 | 手测：在 chrome 中加载扩展 → 按 `Ctrl+Shift+S` → popup 打开且自动触发 `capture.run` |
| Chrome `chrome://extensions/shortcuts` 重绑快捷键 | DSP-10 | 内置浏览器 UI 不在扩展可控范围 | 手测：进入 `chrome://extensions/shortcuts` → 修改 web2chat 快捷键 → 验证新键生效 |
| chrome.alarms 30s 最低粒度（D-34 deviation） | DSP-08 | unpacked 模式 alarms 可触发，production 模式静默 clamp 至 30s — 需在打包后人工核验 | 手测：production build → load → 触发 dispatch → badge `ok` 大约 30s 后自清 |

---

## Validation Sign-Off

- [ ] All Phase 3 tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all ❌ MISSING references
- [ ] No watch-mode flags in committed test commands
- [ ] Feedback latency < 30s (per-task) / < 5min (full E2E)
- [ ] `nyquist_compliant: true` set in frontmatter after planner approval

**Approval:** pending
