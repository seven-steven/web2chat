---
status: resolved
phase: 03-dispatch-popup
source: [03-01..08-SUMMARY.md]
started: "2026-05-07T12:00:00.000Z"
updated: "2026-05-07T12:00:00.000Z"
---

## Current Test

[testing complete]

## Tests

### 1. dispatch happy path — Confirm → mock-platform tab visible + popup 复原（DSP-05, DSP-08）
expected: 点击 Confirm → mock-platform 新 tab 出现，popup 重开后显示成功状态，badge 变绿
result: pass
command: `pnpm test:e2e -- dispatch.spec.ts`

### 2. failure injection NOT_LOGGED_IN → ErrorBanner（DSP-07）
expected: send_to 指向 `mock://?fail=NOT_LOGGED_IN` → popup ErrorBanner 展示对应文案
result: pass
command: `pnpm test:e2e -- dispatch.spec.ts`

### 3. 200ms 双击只产生 1 个 dispatch（DSP-06, ROADMAP SC#4）
expected: 200ms 内连点两次 Confirm，SW 仅创建 1 个 dispatch record，第二次调用幂等忽略
result: pass
command: `pnpm test:e2e -- dispatch.spec.ts`

### 4. SW restart mid-flight 续接（DSP-06, ROADMAP SC#3）
expected: 投递进行中杀掉 SW（CDP stopWorker）→ 重启后 SW 从 storage.session 读取活跃 dispatch → 完成投递
result: pass
command: `pnpm test:e2e -- dispatch.spec.ts`

### 5. unsupported send_to URL → Confirm 禁用 + tooltip（DSP-01, D-25）
expected: 输入不可识别的 URL → Confirm 按钮 disabled，悬停显示 tooltip 说明原因
result: pass
command: `pnpm test:e2e -- dispatch.spec.ts`

### 6. draft recovery — send_to + prompt + 编辑后 title 在 popup 关闭后持久化（DSP-09）
expected: 填写 send_to + prompt + 修改 title → 关闭 popup → 重开 → 三个字段值恢复
result: pass
command: `pnpm test:e2e -- draft-recovery.spec.ts`

### 7. options reset — 预置 history → Reset → 下拉为空（STG-03）
expected: 预置 history 条目 → Options 页点击 Reset → 确认弹窗 → history 下拉为空
result: pass
command: `pnpm test:e2e -- options-reset.spec.ts`

### 8. options reset — Cancel 保留 history（STG-03）
expected: 点击 Reset → 弹确认 → 点 Cancel → history 下拉条目不变
result: pass
command: `pnpm test:e2e -- options-reset.spec.ts`

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
