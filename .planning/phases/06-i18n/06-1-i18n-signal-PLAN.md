---
phase: 6
plan: "06-1"
type: execute
wave: 1
depends_on: []
files_modified:
  - shared/i18n/index.ts
  - shared/storage/items.ts
  - wxt.config.ts
  - package.json
autonomous: true
requirements:
  - I18N-02
---

# Plan 06-1: Signal-based i18n 运行时切换

## Objective

将 `shared/i18n/index.ts` 从薄 re-export 重写为基于 `@preact/signals` 的 locale signal 实现，使 popup/options 在不重载扩展的前提下运行时切换语言。

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| XSS via translated strings | LOW | `t()` 返回纯 string，组件用文本节点而非 innerHTML |
| Locale storage poisoning | MEDIUM | `setLocale()` 校验输入在 allowlist `['en', 'zh_CN', null]`，拒绝其他值 |
| Build-time YAML injection | LOW | YAML 文件在源码控制中，构建产物不含用户输入 |

## Tasks

### Task 1: 安装 yaml devDependency

<read_first>
- package.json (检查现有 devDependencies，确认无 `yaml` 包)
</read_first>

<action>
在项目根目录运行：
```
pnpm add -D yaml
```
`yaml` 包（npm 包名 `yaml`）用于 Vite plugin 在构建时解析 WXT locale YAML 格式。
</action>

<acceptance_criteria>
- `package.json` devDependencies 中包含 `"yaml"` 字段
- `pnpm install` 后 `node_modules/yaml` 目录存在
</acceptance_criteria>

---

### Task 2: 创建 Vite YAML locale plugin

<read_first>
- wxt.config.ts (现有 Vite plugin 结构，tailwindcss() 的写法)
- locales/en.yml (WXT locale 格式：key → { message, placeholders? })
- locales/zh_CN.yml (同上)
</read_first>

<action>
创建 `vite-plugins/yaml-locale.ts`：

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
    // 将 WXT placeholder ($NAME$) 转换为位置占位符 ({0}, {1}, ...)
    if (entry.placeholders) {
      const placeholders = entry.placeholders;
      // placeholders[name].content = '$1' | '$2' | ...
      // 将消息中的 $NAME$ 替换为 {N-1}
      const nameToIndex: Record<string, number> = {};
      for (const [name, ph] of Object.entries(placeholders)) {
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
    // 使 Vite 知道 .yml 是模块（不走默认 asset 处理）
    load(id) {
      if (!localeFileRE.test(id)) return null;
      return null; // transform 会处理
    },
  };
}
```
</action>

<acceptance_criteria>
- 文件 `vite-plugins/yaml-locale.ts` 存在
- 包含 `export function yamlLocalePlugin()` 导出
- 包含 `transformLocale` 函数，处理 `$NAME$` → `{N}` 转换
- 包含 `localeFileRE` 正则匹配 `locales/en.yml` 和 `locales/zh_CN.yml`
</acceptance_criteria>

---

### Task 3: 将 plugin 注册到 wxt.config.ts

<read_first>
- wxt.config.ts (现有结构，tailwindcss() 插件写法)
- vite-plugins/yaml-locale.ts (刚创建)
</read_first>

<action>
修改 `wxt.config.ts`，在 vite 配置的 plugins 数组中加入 `yamlLocalePlugin()`：

```typescript
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { yamlLocalePlugin } from './vite-plugins/yaml-locale';

export default defineConfig({
  // ... 现有配置不变 ...
  vite: () => ({
    plugins: [tailwindcss(), yamlLocalePlugin()],
  }),
});
```

如果现有 wxt.config.ts 已有 `vite: () => ({ plugins: [tailwindcss()] })` 结构，只需在数组中追加 `yamlLocalePlugin()`。
</action>

<acceptance_criteria>
- `wxt.config.ts` 包含 `import { yamlLocalePlugin } from './vite-plugins/yaml-locale'`
- `wxt.config.ts` 的 vite plugins 数组中包含 `yamlLocalePlugin()`
- `pnpm typecheck` 通过（无 TS 错误）
</acceptance_criteria>

---

### Task 4: 在 storage/items.ts 添加 localeItem

<read_first>
- shared/storage/items.ts (现有 defineItem 模式，查看 grantedOriginsItem 写法)
</read_first>

<action>
在 `shared/storage/items.ts` 末尾追加：

```typescript
export type LocaleChoice = 'en' | 'zh_CN' | null;

/** D-76: 用户显式选择的 locale。null = 跟随浏览器（navigator.language 推断）。 */
export const localeItem = storage.defineItem<LocaleChoice>('local:locale', {
  fallback: null,
});
```

注意：不需要 `version` + `migrations`（null fallback 不存在 schema 演化问题）。
</action>

<acceptance_criteria>
- `shared/storage/items.ts` 包含 `export type LocaleChoice = 'en' | 'zh_CN' | null;`
- `shared/storage/items.ts` 包含 `export const localeItem = storage.defineItem<LocaleChoice>('local:locale'`
- `pnpm typecheck` 通过
</acceptance_criteria>

---

### Task 5: 重写 shared/i18n/index.ts 为 signal-based 实现

<read_first>
- shared/i18n/index.ts (当前 4 行薄 wrapper)
- shared/storage/items.ts (localeItem 刚添加)
- locales/en.yml (YAML key list — 作为理解用，不在 TS 中直接读文件)
- locales/zh_CN.yml (同上)
</read_first>

<action>
完整替换 `shared/i18n/index.ts`：

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

// ─── Initialize from storage on module load ─────────────────────────────────
localeItem.getValue().then((stored) => {
  if (stored !== null) localeSig.value = stored;
});

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

**关于 YAML 模块类型声明：** 需要在 `src/types/yaml.d.ts`（或 `global.d.ts`）中添加模块声明让 TS 接受 `.yml` 导入：

```typescript
// yaml-modules.d.ts (放置于项目根或 src/ 下，并加入 tsconfig include)
declare module '*.yml' {
  const content: Record<string, string>;
  export default content;
}
```

将此文件创建为 `shared/i18n/yaml-modules.d.ts`，并确认 tsconfig.json 的 include 涵盖该路径（WXT 的 tsconfig 通常包含 `**/*.d.ts`）。
</action>

<acceptance_criteria>
- `shared/i18n/index.ts` 包含 `export const localeSig = signal<LocaleChoice>(null)`
- `shared/i18n/index.ts` 包含 `export async function setLocale(locale: LocaleChoice)`
- `shared/i18n/index.ts` 包含 `export function t(key: string, substitutions?:`
- `shared/i18n/index.ts` 包含 `import enDict from '../../locales/en.yml'`
- `shared/i18n/yaml-modules.d.ts` 存在且包含 `declare module '*.yml'`
- `pnpm typecheck` 通过（无 TS 类型错误）
- `pnpm build` 通过（Vite 能解析 .yml 导入）
</acceptance_criteria>

---

### Task 6: 编写 Vitest 单元测试验证 signal-based t()

<read_first>
- shared/i18n/index.ts (刚重写)
- tests/unit/ (现有测试结构，查看 fake-browser 用法)
</read_first>

<action>
创建 `tests/unit/i18n/signal-t.spec.ts`：

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
    expect(t('extension_name')).toBe('Web2Chat');
  });

  it('returns the zh_CN message when locale is zh_CN', async () => {
    const { t, setLocale } = await import('@/shared/i18n');
    await setLocale('zh_CN');
    expect(t('options_page_heading')).toBe('Web2Chat — Settings');
    // 中文版本 (示例)
  });

  it('returns key itself when key is missing', async () => {
    const { t, setLocale } = await import('@/shared/i18n');
    await setLocale('en');
    expect(t('nonexistent_key')).toBe('nonexistent_key');
  });

  it('applies positional substitutions', async () => {
    const { t, setLocale } = await import('@/shared/i18n');
    await setLocale('en');
    // options_origins_confirm_body uses {0} after build-time transform
    const result = t('options_origins_confirm_body', ['http://localhost:18789']);
    expect(result).toContain('http://localhost:18789');
  });

  it('setLocale rejects non-allowlist values', async () => {
    const { setLocale, localeSig } = await import('@/shared/i18n');
    const before = localeSig.value;
    await setLocale('fr' as never);
    expect(localeSig.value).toBe(before);
  });
});
```
</action>

<acceptance_criteria>
- `tests/unit/i18n/signal-t.spec.ts` 存在
- `pnpm test` 包含该测试文件且通过（或仅 skip 因 fake-browser 限制，但不 fail）
</acceptance_criteria>

## Verification

```bash
pnpm typecheck          # TS 类型检查干净
pnpm build              # Vite 能解析 yml 导入，构建成功
pnpm test               # signal-t.spec.ts 通过
grep -r "from '@/shared/i18n'" shared/ entrypoints/ | head -5  # 现有导入仍工作
```

## Must Haves

```yaml
must_haves:
  truths:
    - shared/i18n/index.ts exports function t(key, substitutions?) returning plain string
    - shared/i18n/index.ts exports async function setLocale(locale) with allowlist validation
    - shared/i18n/index.ts exports localeSig as @preact/signals signal
    - localeItem exists in shared/storage/items.ts with type 'local:locale'
    - vite-plugins/yaml-locale.ts transforms WXT YAML format to flat {key: string} dict
    - wxt.config.ts registers yamlLocalePlugin() in vite plugins
    - pnpm typecheck passes
    - pnpm build passes
```
