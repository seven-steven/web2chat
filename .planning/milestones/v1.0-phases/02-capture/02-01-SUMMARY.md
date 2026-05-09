---
plan: "02-01"
phase: 02-capture
status: complete
started: "2026-04-30T10:00:00Z"
completed: "2026-04-30T10:05:00Z"
self_check: passed
---

# Summary: Plan 02-01 — 安装运行时依赖

## What Was Built

安装了 Phase 2 抓取流水线所需的 4 个运行时依赖和 1 个类型包：
- `@mozilla/readability` 0.6 — 文章内容抽取
- `dompurify` 3.4 — HTML 净化
- `turndown` 7.2 — HTML→Markdown 转换
- `turndown-plugin-gfm` 1.0 — GFM 扩展（表格、删除线、任务列表）
- `@types/turndown` 5.0 — TypeScript 类型声明（devDep）
- `types/turndown-plugin-gfm.d.ts` — 模块声明（npm 无 @types 包）

## Key Files

| File | Action | What Changed |
|------|--------|-------------|
| `package.json` | modified | +4 runtime deps, +1 devDep |
| `pnpm-lock.yaml` | modified | lockfile updated |
| `types/turndown-plugin-gfm.d.ts` | created | 模块类型声明 |

## Self-Check

- [x] `pnpm install` 成功
- [x] `pnpm typecheck` 通过（所有新库类型可解析）
- [x] `grep "@mozilla/readability" package.json` 返回匹配
- [x] `grep "declare module 'turndown-plugin-gfm'" types/turndown-plugin-gfm.d.ts` 返回匹配

## Deviations

无偏差。按计划精确执行。
