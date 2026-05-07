---
status: complete
quick_id: 260508-9se
---

# Quick Task 260508-9se: 把 settings 页面合并到 popup 显示

## What changed

- **PopupChrome**: 齿轮图标从 `openOptionsPage()` 改为 inline 视图切换器。`showSettings` / `onToggleSettings` props 控制状态。激活时齿轮保持旋转 + accent 色。
- **App.tsx**: 新增 `viewModeSig = signal<'send' | 'settings'>('send')`。Settings 模式渲染 Language / GrantedOrigins / Reset 三节（从 options/components 直接 import）。所有状态分支统一传入 PopupChrome props。
- **Options App.tsx**: 调整 section 顺序与 popup 一致（Language → GrantedOrigins → Reset），保留为独立页面 fallback。

## Files modified

- `entrypoints/popup/components/PopupChrome.tsx` — props 化，删除 openOptionsPage 调用
- `entrypoints/popup/App.tsx` — viewMode 信号 + settings 视图分支
- `entrypoints/options/App.tsx` — section 顺序对齐，简化注释

## Verification

- `pnpm tsc --noEmit` — pass
- `pnpm build` — pass (414.63 kB)
- `pnpm test` — 35 files, 239 tests pass
