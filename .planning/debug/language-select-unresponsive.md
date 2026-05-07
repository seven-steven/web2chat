---
status: resolved
trigger: "设置页面 Language 下拉菜单选项无法选择，疑似点击穿透"
created: "2026-05-07"
updated: "2026-05-07"
---

## Symptoms

- **Expected:** Language 下拉菜单展开后，点击选项能正常选中
- **Actual:** 下拉菜单能展开，但选项不可点击，疑似点击事件穿透到下层元素
- **Scope:** 仅 Language 下拉菜单有问题，其他 Select 组件正常
- **Timeline:** 最近修改下拉框样式时引入
- **Errors:** 无已知错误信息
- **Reproduction:** 打开扩展设置页面 → 点击 Language 下拉菜单 → 尝试选择任意语言选项

## Current Focus

hypothesis: "resolved"
next_action: "none"

## Evidence

- 2026-05-07: Analyzed Select.tsx component — mousedown/commit pattern is correct, outside-click handler correctly skips when listboxRef is null after unmount
- 2026-05-07: Built extension and verified CSS output — z-10 class on dropdown resolves to z-index: 10
- 2026-05-07: Unit tests pass for Select component: mousedown calls onChange, dropdown closes, outside-click works
- 2026-05-07: Identified root cause: w2c-editorial-rise animation on wrapper divs in App.tsx uses transform, creating stacking contexts per section. The dropdown's z-index: 10 only applies within the Language section's stacking context. The Reset/GrantedOrigins sections' stacking contexts (later in DOM order) paint on top, intercepting clicks on the lower portion of the dropdown.
- 2026-05-07: Fix applied — added `relative z-20` to Language section's wrapper div in App.tsx, elevating its stacking order above subsequent sections.

## Eliminated

- Select component logic (mousedown/commit/onOutsideClick) — correct behavior verified by unit tests
- pointer-events issue — only the chevron SVG has pointer-events-none
- overflow clipping — no overflow: hidden on any ancestor
- iframe embedding (options_ui open_in_tab: false) — not the cause; dropdown is visually visible, the problem is click interception by overlapping stacking context
- Preact signal/state management — handleChange and setLocale flow is correct, signal updates preserve Select's useState

## Resolution

root_cause: "Each options section is wrapped in a div with w2c-editorial-rise animation (transform: translateY), which creates a CSS stacking context. The Language section's dropdown has z-index: 10, but this only applies within that section's stacking context. Subsequent sections (Reset, GrantedOrigins) have their own stacking contexts, and since they appear later in DOM order with no explicit z-index, they paint on top of the Language section — intercepting clicks on the lower portion of the dropdown."
fix: "Added `relative z-20` class to the Language section's wrapper div in App.tsx, giving it an explicit stacking order above subsequent section wrappers. This ensures the dropdown (absolute positioned, z-10 within its parent) paints above all sibling sections."
files_changed:
  - entrypoints/options/App.tsx
  - tests/unit/options/select.spec.tsx (new — Select component unit tests)
