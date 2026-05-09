---
phase: 6
plan: "06-1b"
status: complete
started: "2026-05-07T07:05:00.000Z"
completed: "2026-05-07T07:06:00.000Z"
requirements:
  - I18N-02
---

## Summary

修改 popup/main.tsx 和 options/main.tsx 为 async locale init 模式：render() 前 `await localeItem.getValue()` 读取存储的 locale 偏好，赋值给 `localeSig`，消除首帧语言闪烁（D-75, RESEARCH.md Pitfall 5）。

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | popup/main.tsx + options/main.tsx async locale init | ✓ |
| 2 | Full verification (test + typecheck + build) | ✓ |

## Key Decisions

- 直接赋值 `localeSig.value = savedLocale`，不调用 `setLocale()`（避免不必要的 storage 写回）
- `void main()` 标记满足 `no-floating-promises` 规则

## Self-Check

- [x] pnpm test: 216/216 passed
- [x] pnpm typecheck: clean
- [x] pnpm build: clean (391.29 kB)

## Key Files

### Created
(none)

### Modified
- `entrypoints/popup/main.tsx` — async main() awaits locale before render
- `entrypoints/options/main.tsx` — same async locale init pattern
