---
status: resolved
trigger: "15 marketing locale toggle after click does not rerender localized section copy"
created: 2026-06-02T23:40:00+08:00
updated: 2026-06-03T00:20:00+08:00
---

## Symptoms

- expected_behavior: "点击 locale toggle 后，页面所有可本地化文案都切到目标语言。"
- actual_behavior: "locale toggle 自己变了，但页面主体文案没跟着变。"
- error_messages: "无明显报错；自动化失败体现在 tests/unit/marketing/app-sections.spec.tsx 中 locale 切换后的中文断言未通过。"
- timeline: "由 Phase 15 verify-work 自动化验证发现。"
- reproduction: "运行 tests/unit/marketing/app-sections.spec.tsx，render marketing app 后点击 locale toggle，按钮文本变化，但 section body copy 初始实现仍停留在原语言。"

## Current Focus

hypothesis: "resolved"
test: "已完成：检查 apps/marketing/src/app.tsx、apps/marketing/src/i18n/index.ts 与 site-content getter 的 locale 依赖链。"
expecting: "已确认根因并完成修复。"
next_action: "none"

## Evidence

- timestamp: 2026-06-03T00:05:00+08:00
  checked: `apps/marketing/src/app.tsx`, `apps/marketing/src/i18n/index.ts`, `apps/marketing/src/data/site-content.ts`
  found: locale toggle 按钮文案依赖传入 signal，而页面主体 copy 通过 getter → `t()` 读取 i18n；marketing i18n 使用 module-scope `currentLocale` 普通变量，不是响应式 signal source。
  implication: 点击后按钮会变，但主体文案没有可靠的 reactive 依赖来驱动整页切换。
- timestamp: 2026-06-03T00:12:00+08:00
  checked: `pnpm test -- tests/unit/marketing/app-sections.spec.tsx`
  found: 失败稳定复现于 `re-renders localized body copy after toggling locale`，断言缺少 `结构化载荷示例`。
  implication: Phase 15 自动化验证失败来自 marketing locale runtime switch 回归，而不是构建或站点 smoke verifier。
- timestamp: 2026-06-03T00:16:00+08:00
  checked: `pnpm test -- tests/unit/marketing/app-sections.spec.tsx tests/unit/marketing/site-content.spec.ts tests/unit/marketing/proof-labels.spec.tsx`
  found: focused marketing locale regression tests 全部通过。
  implication: signal-based locale 修复已恢复 section copy 与 proof labels 的运行时切换行为。
- timestamp: 2026-06-03T00:17:00+08:00
  checked: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:i18n-coverage && pnpm site:build && pnpm site:verify && pnpm verify:manifest`
  found: 全量自动化验证全部通过。
  implication: 修复没有引入新的类型、lint、测试、i18n coverage、营销构建或 manifest 回归。

## Eliminated

- hypothesis: "toggle click handler 或按钮 signal 更新失效"
  evidence: footer 按钮文案会从 `中文` 切到 `English`，说明点击与 locale state 更新路径可达。
  timestamp: 2026-06-03T00:05:00+08:00
- hypothesis: "site-content getter 自身缓存了旧文案"
  evidence: getter 每次调用都会重新执行，问题在于 `t()` 读取的是非响应式 module-scope locale 变量。
  timestamp: 2026-06-03T00:05:00+08:00

## Resolution

root_cause: "Marketing i18n layer kept locale in a plain module-scope variable (`currentLocale`) while the UI only updated the footer toggle through a separate signal. Page copy came from getter functions that called `t()`, but `t()` had no reactive signal dependency, so locale switching changed the button label without reliably re-rendering localized section copy."
fix: "Replaced marketing i18n locale state with `@preact/signals` (`localeSig` + computed dictionary), imported both locale dictionaries directly, and updated `App` to derive toggle state from `localeSig` instead of a prop plus `useState` forced re-render hack."
verification: "`pnpm test -- tests/unit/marketing/app-sections.spec.tsx tests/unit/marketing/site-content.spec.ts tests/unit/marketing/proof-labels.spec.tsx`; `pnpm typecheck`; `pnpm lint`; `pnpm test`; `pnpm test:i18n-coverage`; `pnpm site:build`; `pnpm site:verify`; `pnpm verify:manifest`"
files_changed:
  - apps/marketing/src/app.tsx
  - apps/marketing/src/i18n/index.ts
  - .planning/debug/locale-toggle-rerender-copy.md
