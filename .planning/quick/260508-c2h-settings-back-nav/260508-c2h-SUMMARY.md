---
status: complete
quick_id: 260508-c2h
---

# Quick Task 260508-c2h: 设置页面要能回到主页面

## What changed

- **PopupChrome**: settings 模式下齿轮图标替换为 chevron-left 箭头，提供明确的"返回"视觉信号。齿轮模式保留 hover 旋转动效，箭头模式无旋转。
- **i18n**: 新增 `popup_chrome_back_tooltip` 键（en: "Back"，zh_CN: "返回"），根据视图状态切换 tooltip。

## Files modified

- `entrypoints/popup/components/PopupChrome.tsx` — 条件渲染齿轮/箭头图标
- `locales/en.yml` — 新增 popup_chrome_back_tooltip
- `locales/zh_CN.yml` — 新增 popup_chrome_back_tooltip

## Verification

- `pnpm tsc --noEmit` — pass
- `pnpm build` — pass (414.98 kB)
- `pnpm test` — 35 files, 239 tests pass
