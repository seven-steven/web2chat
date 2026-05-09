---
phase: 6
plan: "06-5"
type: execute
wave: 3
depends_on:
  - "06-4"
files_modified:
  - scripts/i18n-coverage.ts
  - package.json
autonomous: true
requirements:
  - I18N-01
---

# Plan 06-5: i18n 覆盖率审计脚本

## Objective

编写 `scripts/i18n-coverage.ts` 静态分析脚本，比对源码中所有 `t('key')` 引用与 locale 文件的键集合，断言 100% 双向覆盖（无缺失键、无孤立键）。添加 `test:i18n-coverage` 到 package.json。

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| 正则漏掉部分 t() 调用形式 | MEDIUM | 同时匹配单引号和双引号；添加 t() 调用模式文档 |
| 误报未使用键（实际用于构建时 YAML 解析） | LOW | 脚本扫描范围排除 locales/ 和 scripts/ 自身 |
| en.yml / zh_CN.yml 键不对称 | LOW | 脚本分别检查两个文件，输出明确 diff |

## Tasks

### Task 1: 创建 scripts/i18n-coverage.ts

<read_first>
- locales/en.yml (确认 YAML 格式，顶层 key 直接是字典)
- locales/zh_CN.yml (同上)
- package.json (tsconfig / tsx 设置，查看 tsx 如何调用)
- scripts/verify-manifest.ts (参考 scripts 目录中 ts 脚本的写法)
</read_first>

<action>
创建 `scripts/i18n-coverage.ts`：

```typescript
#!/usr/bin/env tsx
/**
 * i18n coverage audit — asserts 100% bidirectional coverage between
 * source t() calls and locale YAML keys (I18N-01).
 *
 * Usage: pnpm test:i18n-coverage
 * Exit 0 = all keys covered; Exit 1 = gaps found.
 *
 * Scanned t() forms:
 *   t('key')  t("key")  t(`key`)
 * NOT scanned (dynamic keys are forbidden by convention):
 *   t(someVar)  t(`prefix-${x}`)
 *
 * MANIFEST_ONLY_KEYS: keys used in wxt.config.ts __MSG_*__ or index.html
 * __MSG_*__ but never called via t() — these are expected "orphans".
 */

import { parse } from 'yaml';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const LOCALES_DIR = join(ROOT, 'locales');

// Keys that live in locale files for manifest/__MSG_*__ use and are
// intentionally NOT called via t() in source code.
// Update this allowlist when new manifest keys are added.
const MANIFEST_ONLY_KEYS = new Set([
  'action_default_title',      // wxt.config.ts: action.default_title
  'command_open_popup',        // wxt.config.ts: commands._execute_action.description
  'extension_description',     // wxt.config.ts: description
  'extension_name',            // wxt.config.ts: name
  'options_page_title',        // entrypoints/options/index.html: <title>__MSG_...__</title>
]);

// ─── Gather all source files ────────────────────────────────────────────────
const SCAN_DIRS = ['shared', 'entrypoints', 'background', 'content'];
const EXCLUDE_FILES = new Set([
  join(ROOT, 'scripts/i18n-coverage.ts'),
]);

function walkDir(dir: string, files: string[] = []): string[] {
  const dirPath = join(ROOT, dir);
  if (!statSync(dirPath, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.wxt') continue;
      walkDir(join(dir, entry.name).replace(ROOT + '/', ''), files);
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      if (!EXCLUDE_FILES.has(full)) files.push(full);
    }
  }
  return files;
}

const sourceFiles = SCAN_DIRS.flatMap((d) => walkDir(d));

// ─── Extract t() key references from source ─────────────────────────────────
// Matches: t('key'), t("key"), t(`key`) — static string keys only
const T_CALL_RE = /\bt\(\s*(['"`])([a-z][a-z0-9_]*)\1/g;

const usedKeys = new Set<string>();
for (const file of sourceFiles) {
  const src = readFileSync(file, 'utf-8');
  let m: RegExpExecArray | null;
  T_CALL_RE.lastIndex = 0;
  while ((m = T_CALL_RE.exec(src)) !== null) {
    usedKeys.add(m[2]);
  }
}

// ─── Load locale YAML keys ──────────────────────────────────────────────────
type WxtLocaleEntry = { message: string };
type WxtLocaleYaml = Record<string, WxtLocaleEntry>;

function loadLocaleKeys(locale: string): Set<string> {
  const raw = parse(readFileSync(join(LOCALES_DIR, `${locale}.yml`), 'utf-8')) as WxtLocaleYaml;
  return new Set(Object.keys(raw));
}

const enKeys = loadLocaleKeys('en');
const zhKeys = loadLocaleKeys('zh_CN');

// ─── Compute gaps ───────────────────────────────────────────────────────────
// 1. Keys used in source but missing from locale files
const missingFromEn = [...usedKeys].filter((k) => !enKeys.has(k));
const missingFromZh = [...usedKeys].filter((k) => !zhKeys.has(k));

// 2. Keys in locale files not referenced in source
//    Subtract MANIFEST_ONLY_KEYS — they are expected orphans (used via __MSG_*__)
const unusedInEn = [...enKeys].filter((k) => !usedKeys.has(k) && !MANIFEST_ONLY_KEYS.has(k));
const unusedInZh = [...zhKeys].filter((k) => !usedKeys.has(k) && !MANIFEST_ONLY_KEYS.has(k));

// 3. Keys in en but missing from zh_CN (asymmetric locale files)
const enNotZh = [...enKeys].filter((k) => !zhKeys.has(k));
const zhNotEn = [...zhKeys].filter((k) => !enKeys.has(k));

// ─── Report ─────────────────────────────────────────────────────────────────
let ok = true;

function report(label: string, items: string[]) {
  if (items.length === 0) {
    console.log(`✓  ${label}: none`);
    return;
  }
  console.error(`✗  ${label} (${items.length}):`);
  for (const item of items) console.error(`   - ${item}`);
  ok = false;
}

console.log(`\ni18n Coverage Audit`);
console.log(`===================`);
console.log(`Source files scanned: ${sourceFiles.length}`);
console.log(`t() keys referenced:  ${usedKeys.size}`);
console.log(`en.yml keys:          ${enKeys.size}`);
console.log(`zh_CN.yml keys:       ${zhKeys.size}`);
console.log(`Manifest-only keys (allowlist, not checked as orphans): ${[...MANIFEST_ONLY_KEYS].join(', ')}\n`);

report('Keys used in source but MISSING from en.yml', missingFromEn);
report('Keys used in source but MISSING from zh_CN.yml', missingFromZh);
report('Keys in en.yml but NOT referenced in source (excluding manifest-only)', unusedInEn);
report('Keys in zh_CN.yml but NOT referenced in source (excluding manifest-only)', unusedInZh);
report('Keys in en.yml but MISSING from zh_CN.yml', enNotZh);
report('Keys in zh_CN.yml but MISSING from en.yml', zhNotEn);

if (ok) {
  console.log(`\n✓ i18n coverage: 100% — all ${usedKeys.size} keys covered in both locales\n`);
  process.exit(0);
} else {
  console.error(`\n✗ i18n coverage gaps found — fix the above before release\n`);
  process.exit(1);
}
```
</action>

<acceptance_criteria>
- `scripts/i18n-coverage.ts` 存在
- 包含 `T_CALL_RE` 正则 `\bt\(\s*(['"\`])([a-z][a-z0-9_]*)\1`
- 包含 `MANIFEST_ONLY_KEYS` allowlist，含 `action_default_title`、`command_open_popup`、`extension_description`、`extension_name`、`options_page_title` 五个键
- 孤立键检查时通过 `&& !MANIFEST_ONLY_KEYS.has(k)` 过滤 allowlist 键
- 包含 `missingFromEn`、`missingFromZh`、`unusedInEn`、`unusedInZh` 四个 gap 检查
- 包含 `process.exit(0)` (全绿) 和 `process.exit(1)` (有 gap) 两个出口
- 文件头部有 `MANIFEST_ONLY_KEYS` 说明注释
</acceptance_criteria>

---

### Task 2: 添加 test:i18n-coverage script 到 package.json

<read_first>
- package.json (查看 scripts 区域的现有格式)
</read_first>

<action>
在 `package.json` 的 `scripts` 对象中，在 `"test:e2e"` 行附近添加：

```json
"test:i18n-coverage": "tsx scripts/i18n-coverage.ts",
```
</action>

<acceptance_criteria>
- `package.json` scripts 包含 `"test:i18n-coverage": "tsx scripts/i18n-coverage.ts"`
- `grep "test:i18n-coverage" package.json` 输出非空
</acceptance_criteria>

---

### Task 3: 运行覆盖率审计，修复所有 gap

<read_first>
- scripts/i18n-coverage.ts (刚创建)
- locales/en.yml (当前完整键列表)
- locales/zh_CN.yml (当前完整键列表)
</read_first>

<action>
运行审计：
```bash
pnpm test:i18n-coverage
```

**孤立键（unused）处理规则：**

脚本会自动跳过 `MANIFEST_ONLY_KEYS` allowlist 中的键（manifest 用途，不走 `t()`）。

如果输出中仍有"Keys in en.yml but NOT referenced in source"报错，按如下规则处理：

1. **先判断该键是否有合法用途：**
   - 在 `wxt.config.ts` 中以 `__MSG_xxx__` 形式使用 → 加入 `MANIFEST_ONLY_KEYS` allowlist
   - 在 `*.html` 中以 `__MSG_xxx__` 形式使用 → 同上加入 allowlist
   - 在 `tests/` 中使用但源码无引用 → **从 locale 文件删除**（测试不应新增 locale 键）

2. **如果确认是废弃键（如 `popup_hello` Phase 1 hello-world 键）：**
   - 确认源码 `grep -rn "t('popup_hello')"` 无引用
   - 从 `locales/en.yml` 和 `locales/zh_CN.yml` 两处删除

3. **RESEARCH.md Open Questions 中提到的潜在孤立键：**
   - `dispatch_cancelled_toast`、`dispatch_confirm_disabled_tooltip`、`history_view_all` — 运行脚本后按实际结果处理
   - 如果确实无引用且不在 manifest，从 locale 文件删除

修复后重新运行 `pnpm test:i18n-coverage` 直到退出码为 0。
</action>

<acceptance_criteria>
- `pnpm test:i18n-coverage` 退出码为 0
- 输出包含 `✓ i18n coverage: 100%`
- 输出中所有 6 个检查项均显示 `: none`（无 gap）
- `MANIFEST_ONLY_KEYS` 中的 5 个 manifest 用途键不被报为孤立键
</acceptance_criteria>

## Verification

```bash
pnpm test:i18n-coverage   # exit 0, "✓ i18n coverage: 100%"
pnpm typecheck             # 仍然通过
pnpm lint                  # 仍然通过
pnpm test                  # 单元测试仍然通过
```

## Must Haves

```yaml
must_haves:
  truths:
    - scripts/i18n-coverage.ts exists and scans source files for t() calls
    - scripts/i18n-coverage.ts contains MANIFEST_ONLY_KEYS allowlist with 5 manifest-use keys
    - package.json scripts contains "test:i18n-coverage": "tsx scripts/i18n-coverage.ts"
    - pnpm test:i18n-coverage exits 0 with "✓ i18n coverage: 100%"
    - no t() keys in source are missing from en.yml
    - no t() keys in source are missing from zh_CN.yml
    - no keys in en.yml are unused (excluding manifest-only allowlist)
    - en.yml and zh_CN.yml have identical key sets
```
