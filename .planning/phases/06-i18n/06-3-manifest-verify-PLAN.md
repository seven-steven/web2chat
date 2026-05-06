---
phase: 6
plan: "06-3"
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/verify-manifest.ts
autonomous: true
requirements:
  - I18N-04
---

# Plan 06-3: Manifest i18n 完整性验证

## Objective

验证并强化 `scripts/verify-manifest.ts`，确保构建产物 `dist/manifest.json` 的 `name`、`description`、`action.default_title` 三个字段使用 `__MSG_*__` 本地化占位符，而非硬编码字符串。

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Manifest name/description 硬编码 | LOW | verify-manifest.ts 在 CI 中断言 __MSG_*__ 形式 |
| __MSG_*__ key 缺失导致 undefined 展示 | LOW | manifest 构建后可加载验证，WXT 会在构建时报 missing locale key |

## Tasks

### Task 1: 读取并验证 wxt.config.ts 中 manifest __MSG_*__ 配置

<read_first>
- wxt.config.ts (查看 manifest() 函数中 name/description/action.default_title 字段)
- locales/en.yml (确认 extension_name, extension_description, action_default_title 键存在)
- locales/zh_CN.yml (同上)
</read_first>

<action>
核实 `wxt.config.ts` 中 manifest 配置：
- `name: '__MSG_extension_name__'` — 已存在（Phase 1 落地）
- `description: '__MSG_extension_description__'` — 已存在
- `action.default_title: '__MSG_action_default_title__'` — 已存在

核实 `locales/en.yml` 包含：
- `extension_name:` 键
- `extension_description:` 键
- `action_default_title:` 键

核实 `locales/zh_CN.yml` 包含相同的三个键。

如果缺失，在 `locales/en.yml` 和 `locales/zh_CN.yml` 相应位置添加。根据当前 locale 文件开头，这三个键已存在（Phase 1 已落地），仅需验证。
</action>

<verify>
  <automated>grep '__MSG_extension_name__' wxt.config.ts</automated>
</verify>

<acceptance_criteria>
- `grep "__MSG_extension_name__" wxt.config.ts` 输出非空
- `grep "__MSG_extension_description__" wxt.config.ts` 输出非空
- `grep "__MSG_action_default_title__" wxt.config.ts` 输出非空
- `grep "^extension_name:" locales/en.yml` 输出非空
- `grep "^extension_description:" locales/en.yml` 输出非空
- `grep "^action_default_title:" locales/en.yml` 输出非空
- `grep "^extension_name:" locales/zh_CN.yml` 输出非空
</acceptance_criteria>

---

### Task 2: 更新 scripts/verify-manifest.ts 添加 __MSG_*__ 断言

<read_first>
- scripts/verify-manifest.ts (当前实现，查看断言结构)
</read_first>

<action>
读取 `scripts/verify-manifest.ts` 当前内容，然后在现有权限/host_permissions 断言之后，追加以下 __MSG_*__ 字段验证：

```typescript
// ─── I18N-04: manifest __MSG_*__ 本地化字段验证 ───────────────────────────
const i18nChecks: Array<{ path: string; value: string }> = [
  { path: 'name', value: manifest.name },
  { path: 'description', value: manifest.description },
  { path: 'action.default_title', value: manifest.action?.default_title },
];

let i18nOk = true;
for (const check of i18nChecks) {
  if (!check.value || !check.value.startsWith('__MSG_')) {
    console.error(`FAIL [I18N-04] manifest.${check.path} is not an __MSG_*__ placeholder: "${check.value}"`);
    i18nOk = false;
  } else {
    console.log(`OK   [I18N-04] manifest.${check.path} = "${check.value}"`);
  }
}

if (!i18nOk) process.exit(1);
```

确保该代码块在文件末尾的 `process.exit(1)` 之前，或与现有失败处理保持一致。
</action>

<verify>
  <automated>pnpm build && pnpm verify:manifest</automated>
</verify>

<acceptance_criteria>
- `scripts/verify-manifest.ts` 包含 `i18nChecks` 数组，含 name/description/action.default_title 三个检查
- `scripts/verify-manifest.ts` 包含 `startsWith('__MSG_')` 检查
- `scripts/verify-manifest.ts` 包含 `[I18N-04]` 日志标记
- `pnpm verify:manifest` 运行通过，输出 3 行 `OK   [I18N-04]`
</acceptance_criteria>

---

### Task 3: 运行验证并记录结果

<read_first>
- scripts/verify-manifest.ts (刚更新)
</read_first>

<action>
运行验证命令：
```bash
pnpm verify:manifest
```

预期输出包含：
```
OK   [I18N-04] manifest.name = "__MSG_extension_name__"
OK   [I18N-04] manifest.description = "__MSG_extension_description__"
OK   [I18N-04] manifest.action.default_title = "__MSG_action_default_title__"
```

如果任何一项 FAIL，检查 wxt.config.ts 中对应字段并修正。
</action>

<verify>
  <automated>pnpm build && pnpm verify:manifest</automated>
</verify>

<acceptance_criteria>
- `pnpm verify:manifest` 退出码为 0
- 输出包含 3 行 `OK   [I18N-04]`
- 输出不包含 `FAIL [I18N-04]`
</acceptance_criteria>

## Verification

```bash
pnpm verify:manifest    # exit 0, 3× OK [I18N-04]
grep "I18N-04" scripts/verify-manifest.ts   # 至少 3 行
```

## Must Haves

```yaml
must_haves:
  truths:
    - scripts/verify-manifest.ts asserts manifest.name starts with __MSG_
    - scripts/verify-manifest.ts asserts manifest.description starts with __MSG_
    - scripts/verify-manifest.ts asserts manifest.action.default_title starts with __MSG_
    - pnpm verify:manifest exits 0 with 3 OK [I18N-04] lines
    - locales/en.yml and locales/zh_CN.yml contain extension_name, extension_description, action_default_title keys
    - chrome://extensions 中扩展 name/description 在浏览器 zh_CN UI 下显示中文（__MSG_*__ 由浏览器在扩展加载时解析）
```
