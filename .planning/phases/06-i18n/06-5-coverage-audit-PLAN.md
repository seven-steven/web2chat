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
 */

import { parse } from 'yaml';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const LOCALES_DIR = join(ROOT, 'locales');

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
const unusedInEn = [...enKeys].filter((k) => !usedKeys.has(k));
const unusedInZh = [...zhKeys].filter((k) => !usedKeys.has(k));

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
console.log(`zh_CN.yml keys:       ${zhKeys.size}\n`);

report('Keys used in source but MISSING from en.yml', missingFromEn);
report('Keys used in source but MISSING from zh_CN.yml', missingFromZh);
report('Keys in en.yml but NOT referenced in source', unusedInEn);
report('Keys in zh_CN.yml but NOT referenced in source', unusedInZh);
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
- 包含 `missingFromEn`、`missingFromZh`、`unusedInEn`、`unusedInZh` 四个 gap 检查
- 包含 `process.exit(0)` (全绿) 和 `process.exit(1)` (有 gap) 两个出口
- 文件头部有使用说明注释
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

**预期 gap 分析：**

1. **`popup_hello` 在 locale 文件中已被 Plan 06-4 删除** — 但 `t('popup_hello')` 若还在源码中会被标记为 missing。需检查 `entrypoints/popup/App.tsx` 等文件是否还引用 `popup_hello`，如有则替换为新的翻译键或删除（Phase 1 hello-world，正式功能已不需要）。

2. **孤立键（unused）** — 若 locale 文件中还有其他键未被任何源码引用（例如 `popup_hello` 已从源码中删除但 Plan 06-4 未删干净），从 locale 文件删除。

3. **asymmetric** — en 和 zh_CN 键不对称时修复较少的一方。

**修复原则：**
- 若某键在源码中被引用但 locale 文件中不存在 → 在 locale 文件中添加缺失键
- 若某键在 locale 文件中存在但源码无引用 → 从 locale 文件删除孤立键
- 修复后重新运行 `pnpm test:i18n-coverage` 直到退出码为 0

确认 `popup_hello` 的源码引用状态：
```bash
grep -rn "t('popup_hello')" --include="*.ts" --include="*.tsx" .
```
如果仍有引用，删除引用（Phase 1 test key，不再需要）。
</action>

<acceptance_criteria>
- `pnpm test:i18n-coverage` 退出码为 0
- 输出包含 `✓ i18n coverage: 100%`
- 输出中所有 6 个检查项均显示 `: none`（无 gap）
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
    - package.json scripts contains "test:i18n-coverage": "tsx scripts/i18n-coverage.ts"
    - pnpm test:i18n-coverage exits 0 with "✓ i18n coverage: 100%"
    - no t() keys in source are missing from en.yml
    - no t() keys in source are missing from zh_CN.yml
    - no keys in en.yml are unused (not referenced in source)
    - en.yml and zh_CN.yml have identical key sets
```
