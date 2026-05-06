---
phase: 6
plan: "06-1b"
type: execute
wave: 1
depends_on:
  - "06-1a"
files_modified:
  - entrypoints/popup/main.tsx
autonomous: true
requirements:
  - I18N-02

must_haves:
  truths:
    - "popup/main.tsx awaits localeItem.getValue() before render() to prevent first-frame flash"
    - "render(<App />) is wrapped in async function called after locale signal is initialized"
    - "pnpm typecheck passes"
    - "pnpm test passes (locale-switch.spec.ts green)"
    - "pnpm build passes"
  artifacts:
    - path: "entrypoints/popup/main.tsx"
      provides: "async main() awaits locale before render"
      contains: "await localeItem.getValue()"
  key_links:
    - from: "entrypoints/popup/main.tsx"
      to: "shared/i18n/index.ts"
      via: "localeSig import"
      pattern: "localeSig"
    - from: "entrypoints/popup/main.tsx"
      to: "shared/storage/items.ts"
      via: "localeItem import"
      pattern: "localeItem"
---

<objective>
修复 popup/options 挂载时的初始 locale 竞态（RESEARCH.md Pitfall 5）：在 render() 前 await storage 读取 locale，消除首帧语言闪烁。

Purpose: D-75 要求"下次打开 popup 也读取存储的 locale"，不处理则首帧可能短暂显示错误语言。

Output: popup/main.tsx（及 options/main.tsx 若存在）使用 async main() 模式。
</objective>

<execution_context>
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/workflows/execute-plan.md
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/06-i18n/06-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 修改 popup/main.tsx（及 options/main.tsx）为 async locale init 模式</name>
  <files>entrypoints/popup/main.tsx</files>
  <action>
读取 `entrypoints/popup/main.tsx` 当前内容，将 render 调用包裹在 async 函数中，在 render 前 await localeItem.getValue()：

```typescript
import { render } from 'preact';
import App from './App';
import { localeItem } from '@/shared/storage/items';
import { localeSig } from '@/shared/i18n';

async function main() {
  // D-75: 读取存储的 locale 偏好（RESEARCH.md Pitfall 5 — 防止首帧闪烁）
  const savedLocale = await localeItem.getValue();
  if (savedLocale !== null) {
    localeSig.value = savedLocale;
  }
  // locale signal 已就绪，再挂载组件树
  render(<App />, document.getElementById('app')!);
}

main();
```

注意：直接赋值 `localeSig.value = savedLocale`，不调用 `setLocale()`（避免不必要的 storage 写回）。

如果 `entrypoints/options/main.tsx` 存在，对其做同样修改（相同的 async main() 模式）。
  </action>
  <verify>
    <automated>pnpm typecheck</automated>
  </verify>
  <done>entrypoints/popup/main.tsx 中 render() 调用前有 `await localeItem.getValue()`，render 被包裹在 async 函数内；如 options/main.tsx 存在，同样完成；pnpm typecheck 通过。</done>
</task>

<task type="auto">
  <name>Task 2: 运行完整验证（GREEN 确认）</name>
  <files></files>
  <action>
运行完整验证套件确认 Wave 1 基础设施全部绿：

```bash
pnpm test && pnpm typecheck && pnpm build
```

预期结果：
- `pnpm test`：locale-switch.spec.ts 4 个测试通过，现有测试无回归
- `pnpm typecheck`：0 errors
- `pnpm build`：Vite 构建成功，.yml import 正确解析
  </action>
  <verify>
    <automated>pnpm test && pnpm typecheck && pnpm build</automated>
  </verify>
  <done>pnpm test、pnpm typecheck、pnpm build 三项全部退出码为 0。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| storage read on mount | localeItem.getValue() 读取 chrome.storage.local，返回值受 LocaleChoice 类型约束 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-1b-01 | Tampering | localeSig.value assignment | accept | 仅从 typed localeItem（LocaleChoice）赋值，allowlist 在 setLocale() 层已验证 |
</threat_model>

<verification>
```bash
pnpm test && pnpm typecheck && pnpm build
```
</verification>

<success_criteria>
- popup/main.tsx 使用 async main() 在 render 前 await locale
- pnpm test 通过（含 locale-switch.spec.ts）
- pnpm typecheck 通过
- pnpm build 通过
</success_criteria>

<output>
完成后创建 `.planning/phases/06-i18n/06-1b-SUMMARY.md`
</output>
