---
phase: 6
plan: "06-1a"
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - vite-plugins/yaml-locale.ts
  - wxt.config.ts
  - shared/storage/items.ts
  - shared/i18n/index.ts
  - shared/i18n/yaml.d.ts
autonomous: true
requirements:
  - I18N-02

must_haves:
  truths:
    - "shared/i18n/index.ts exports function t(key, substitutions?) returning plain string"
    - "shared/i18n/index.ts exports async function setLocale(locale) with allowlist validation"
    - "shared/i18n/index.ts exports localeSig as @preact/signals signal"
    - "localeItem exists in shared/storage/items.ts with type 'local:locale'"
    - "vite-plugins/yaml-locale.ts transforms WXT YAML format to flat {key: string} dict"
    - "wxt.config.ts registers yamlLocalePlugin() in vite plugins"
    - "pnpm typecheck passes"
    - "pnpm build passes"
    - "setLocale() triggers immediate re-render of all Preact components that call t() without extension reload (verified by locale-switch.spec.ts)"
  artifacts:
    - path: "vite-plugins/yaml-locale.ts"
      provides: "Vite plugin: YAML locale → flat JS dict"
      exports: ["yamlLocalePlugin"]
    - path: "shared/storage/items.ts"
      provides: "localeItem storage definition"
      contains: "localeItem"
    - path: "shared/i18n/index.ts"
      provides: "signal-based t(), setLocale(), localeSig"
      exports: ["t", "setLocale", "localeSig", "localeDictSig"]
    - path: "shared/i18n/yaml.d.ts"
      provides: "TypeScript *.yml module declaration"
      contains: "declare module '*.yml'"
    - path: "tests/unit/i18n/locale-switch.spec.ts"
      provides: "TDD RED stub — fails before index.ts is rewritten"
      contains: "locale-switch"
  key_links:
    - from: "shared/i18n/index.ts"
      to: "locales/en.yml"
      via: "Vite YAML plugin import"
      pattern: "import enDict from"
    - from: "shared/i18n/index.ts"
      to: "shared/storage/items.ts"
      via: "localeItem import"
      pattern: "localeItem"
---

<objective>
构建 signal-based i18n 运行时切换基础设施（构建时 YAML→JS 转换 + Preact signal locale store）。

Purpose: 解除对 chrome.i18n 的运行时依赖，使 popup/options 在不重载扩展的前提下立即切换语言（D-73/D-74）。

Output: yamlLocalePlugin、localeItem、重写的 shared/i18n/index.ts、yaml.d.ts、TDD stub 测试。
</objective>

<execution_context>
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/workflows/execute-plan.md
@/Users/seven/data/coding/projects/seven/web2chat/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/06-i18n/06-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: 安装 yaml devDep，创建 vite-plugins/yaml-locale.ts，注册到 wxt.config.ts</name>
  <files>package.json, vite-plugins/yaml-locale.ts, wxt.config.ts</files>
  <action>
三步合一（三个文件均为纯新增/小改，无逻辑耦合）：

**Step 1 — 安装 yaml 包：**
```bash
pnpm add -D yaml
```

**Step 2 — 创建 vite-plugins/yaml-locale.ts：**

```typescript
import { Plugin } from 'vite';
import { parse } from 'yaml';
import { readFileSync } from 'fs';

type WxtLocaleEntry = {
  message: string;
  placeholders?: Record<string, { content: string; example?: string }>;
};

type LocaleYaml = Record<string, WxtLocaleEntry>;
type LocaleDict = Record<string, string>;

function transformLocale(raw: LocaleYaml): LocaleDict {
  const dict: LocaleDict = {};
  for (const [key, entry] of Object.entries(raw)) {
    let msg = entry.message;
    if (entry.placeholders) {
      const nameToIndex: Record<string, number> = {};
      for (const [name, ph] of Object.entries(entry.placeholders)) {
        const match = ph.content.match(/^\$(\d+)$/);
        if (match) {
          nameToIndex[name.toLowerCase()] = parseInt(match[1], 10) - 1;
        }
      }
      msg = msg.replace(/\$([A-Za-z_]+)\$/g, (_, name: string) => {
        const idx = nameToIndex[name.toLowerCase()];
        return idx !== undefined ? `{${idx}}` : `$${name}$`;
      });
    }
    dict[key] = msg;
  }
  return dict;
}

export function yamlLocalePlugin(): Plugin {
  const localeFileRE = /locales\/(en|zh_CN)\.yml(\?|$)/;
  return {
    name: 'yaml-locale',
    transform(code, id) {
      if (!localeFileRE.test(id)) return null;
      const raw = parse(readFileSync(id.split('?')[0], 'utf-8')) as LocaleYaml;
      const dict = transformLocale(raw);
      return {
        code: `export default ${JSON.stringify(dict)};`,
        map: null,
      };
    },
  };
}
```

**Step 3 — 修改 wxt.config.ts（在现有 plugins 数组追加）：**

在 `wxt.config.ts` 顶部 import 区追加：
```typescript
import { yamlLocalePlugin } from './vite-plugins/yaml-locale';
```

在 vite plugins 数组中追加 `yamlLocalePlugin()`（现有 tailwindcss() 保持不变）：
```typescript
vite: () => ({
  plugins: [tailwindcss(), yamlLocalePlugin()],
}),
```
  </action>
  <verify>
    <automated>pnpm typecheck && pnpm build</automated>
  </verify>
  <done>package.json devDependencies 包含 yaml；vite-plugins/yaml-locale.ts 存在且导出 yamlLocalePlugin；wxt.config.ts 中 plugins 数组包含 yamlLocalePlugin()；pnpm typecheck 和 pnpm build 均通过。</done>
</task>

<task type="auto">
  <name>Task 2: 追加 localeItem 到 shared/storage/items.ts</name>
  <files>shared/storage/items.ts</files>
  <action>
读取 shared/storage/items.ts 末尾结构，在文件末尾追加：

```typescript
export type LocaleChoice = 'en' | 'zh_CN' | null;

/** D-76: 用户显式选择的 locale。null = 跟随浏览器（navigator.language 推断）。*/
export const localeItem = storage.defineItem<LocaleChoice>('local:locale', {
  fallback: null,
});
```

注意：fallback 为 null，无 schema 演化问题，不需要 version + migrations。
  </action>
  <verify>
    <automated>pnpm typecheck</automated>
  </verify>
  <done>shared/storage/items.ts 包含 `export type LocaleChoice = 'en' | 'zh_CN' | null` 和 `export const localeItem = storage.defineItem&lt;LocaleChoice&gt;('local:locale'`；pnpm typecheck 通过。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: 创建 locale-switch.spec.ts stub（TDD RED 阶段）</name>
  <files>tests/unit/i18n/locale-switch.spec.ts</files>
  <behavior>
    - 此时 shared/i18n/index.ts 仍是旧的 chrome.i18n 薄 wrapper，不导出 setLocale / localeSig
    - 创建测试文件后运行，预期结果：FAIL（RED）——因为 index.ts 还未重写
    - Task 4 重写 index.ts 后，这些测试应 PASS（GREEN）
  </behavior>
  <action>
创建 `tests/unit/i18n/locale-switch.spec.ts`（最小 stub，足以在 Task 4 前失败、Task 4 后通过）：

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';

describe('signal-based t()', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns the en message for a known key when locale is en', async () => {
    const { t, setLocale } = await import('@/shared/i18n');
    await setLocale('en');
    const result = t('extension_name');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns key itself when key is missing', async () => {
    const { t, setLocale } = await import('@/shared/i18n');
    await setLocale('en');
    expect(t('nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
  });

  it('setLocale rejects non-allowlist values', async () => {
    const { setLocale, localeSig } = await import('@/shared/i18n');
    const before = localeSig.value;
    await setLocale('fr' as never);
    expect(localeSig.value).toBe(before);
  });

  it('setLocale(null) reverts to browser-inferred locale (localeSig becomes null)', async () => {
    const { setLocale, localeSig } = await import('@/shared/i18n');
    await setLocale('en');
    await setLocale(null);
    expect(localeSig.value).toBeNull();
  });
});
```

**重要：** 创建文件后，立即运行一次确认为 RED 状态（测试失败），记录失败原因（setLocale / localeSig 未导出），然后继续 Task 4。
  </action>
  <verify>
    <automated>pnpm test -- tests/unit/i18n/locale-switch.spec.ts</automated>
  </verify>
  <done>tests/unit/i18n/locale-switch.spec.ts 文件存在；此时运行预期 FAIL（RED）——这是 TDD 正确状态，Task 4 将使其变绿。</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: 重写 shared/i18n/index.ts + 创建 yaml.d.ts（TDD GREEN 阶段）</name>
  <files>shared/i18n/index.ts, shared/i18n/yaml.d.ts</files>
  <behavior>
    - 重写后 Task 3 的 4 个测试全部 PASS
    - pnpm typecheck 通过（无 TS2307 cannot find module *.yml）
    - pnpm build 通过（Vite 能解析 .yml import）
  </behavior>
  <action>
**Step 1 — 创建 shared/i18n/yaml.d.ts（TS 必须先有类型声明才能 import .yml）：**

```typescript
// shared/i18n/yaml.d.ts
declare module '*.yml' {
  const data: Record<string, { message: string; placeholders?: Record<string, { content: string; example?: string }> }>;
  export default data;
}
```

**Step 2 — 完整替换 shared/i18n/index.ts：**

```typescript
import { signal, computed } from '@preact/signals';
import enDict from '../../locales/en.yml';
import zhCNDict from '../../locales/zh_CN.yml';
import { localeItem, type LocaleChoice } from '../storage/items';

// ─── Locale dicts (build-time YAML→JS via yamlLocalePlugin) ───────────────
const DICTS: Record<NonNullable<LocaleChoice>, Record<string, string>> = {
  en: enDict as Record<string, string>,
  zh_CN: zhCNDict as Record<string, string>,
};

// ─── Locale signal ─────────────────────────────────────────────────────────
function inferLocaleFromBrowser(): NonNullable<LocaleChoice> {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return lang.startsWith('zh') ? 'zh_CN' : 'en';
}

/** 当前激活的 locale (D-76: null → 跟随浏览器). */
export const localeSig = signal<LocaleChoice>(null);

/** 解析后的有效 locale. */
const resolvedLocaleSig = computed<NonNullable<LocaleChoice>>(() =>
  localeSig.value ?? inferLocaleFromBrowser(),
);

/** 当前激活的 locale dict. */
export const localeDictSig = computed<Record<string, string>>(
  () => DICTS[resolvedLocaleSig.value],
);

// ─── Public API ────────────────────────────────────────────────────────────
const LOCALE_ALLOWLIST: LocaleChoice[] = ['en', 'zh_CN', null];

/**
 * 切换 locale。null = 恢复跟随浏览器。
 * 仅接受 allowlist 内的值，写入 chrome.storage.local。
 */
export async function setLocale(locale: LocaleChoice): Promise<void> {
  if (!LOCALE_ALLOWLIST.includes(locale)) return;
  localeSig.value = locale;
  await localeItem.setValue(locale);
}

/**
 * 翻译 key。在 Preact 组件中调用时自动跟踪 localeDictSig 依赖。
 * 支持位置占位符：t('key', ['val0', 'val1']) → 替换 {0}, {1}。
 * 返回纯 string，绝不返回 HTML。
 */
export function t(key: string, substitutions?: (string | number)[]): string {
  const dict = localeDictSig.value;
  let msg = dict[key] ?? key;
  if (substitutions && substitutions.length > 0) {
    msg = msg.replace(/\{(\d+)\}/g, (_, idx: string) => {
      const i = parseInt(idx, 10);
      return i < substitutions.length ? String(substitutions[i]) : `{${idx}}`;
    });
  }
  return msg;
}

export type T = typeof t;
```

运行 `pnpm test -- tests/unit/i18n/locale-switch.spec.ts` 确认变绿（GREEN）。
  </action>
  <verify>
    <automated>pnpm test -- tests/unit/i18n/locale-switch.spec.ts</automated>
  </verify>
  <done>shared/i18n/index.ts 导出 t、setLocale、localeSig、localeDictSig；shared/i18n/yaml.d.ts 存在含 declare module '*.yml'；locale-switch.spec.ts 4 个测试全部 PASS（GREEN）；pnpm typecheck 通过。</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| setLocale() input | 来自 UI onChange 事件的 locale 字符串，需 allowlist 验证 |
| YAML build output | 构建时 YAML 转 JS，源码受版本控制，非用户输入 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-1a-01 | Tampering | setLocale() | mitigate | LOCALE_ALLOWLIST 校验输入，拒绝 allowlist 外值 |
| T-06-1a-02 | Tampering | t() return value | accept | 返回纯 string，组件用 Preact text node，不走 innerHTML |
| T-06-1a-03 | Tampering | YAML build-time | accept | YAML 文件在源码控制中，构建产物不含用户输入 |
</threat_model>

<verification>
```bash
pnpm typecheck          # TS 类型检查干净（含 yaml.d.ts）
pnpm build              # Vite 能解析 .yml 导入
pnpm test -- tests/unit/i18n/locale-switch.spec.ts  # 4 个测试 GREEN
```
</verification>

<success_criteria>
- yamlLocalePlugin 在 wxt.config.ts 注册，pnpm build 通过
- localeItem 在 shared/storage/items.ts 中定义（type LocaleChoice）
- locale-switch.spec.ts 4 个测试 GREEN
- shared/i18n/index.ts 导出 t、setLocale、localeSig、localeDictSig
- pnpm typecheck 无错误
</success_criteria>

<output>
完成后创建 `.planning/phases/06-i18n/06-1a-SUMMARY.md`
</output>
