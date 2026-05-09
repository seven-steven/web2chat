---
phase: 6
plan: "06-4"
type: execute
wave: 2
depends_on:
  - "06-1a"
  - "06-1b"
files_modified:
  - entrypoints/options/App.tsx
  - entrypoints/options/components/LanguageSection.tsx
  - locales/en.yml
  - locales/zh_CN.yml
autonomous: true
requirements:
  - I18N-02
---

# Plan 06-4: LanguageSection UI + locale 文件更新

## Objective

创建 `LanguageSection` 组件替换 Options page 的 `ReservedSection` 占位，实现运行时语言切换 UI。更新 locale 文件：添加 Phase 6 新键，移除废弃的占位键。

## Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Locale storage poisoning via onChange | MEDIUM | onChange handler 校验 value 在 `['en', 'zh_CN', '']` allowlist，`setLocale()` 自身也有 allowlist 守卫 |
| XSS via t() return value | LOW | t() 返回纯 string，JSX 用文本节点，不用 dangerouslySetInnerHTML |
| "English"/"简体中文" option 被 ESLint 拦截 | LOW | 语言标识符是豁免项，在对应 <option> 行加 eslint-disable-next-line 注释 |

## Tasks

### Task 1: 更新 locale 文件（添加新键 + 删除废弃键）

<read_first>
- locales/en.yml (查看文件末尾结构，确认当前 options_* 键的格式，以及 popup_hello/options_reserved_* 键的位置)
- locales/zh_CN.yml (同上)
</read_first>

<action>
**添加新键：**

在 `locales/en.yml` 末尾（discord_tos_* 键之后）追加以下内容：

```yaml
# Group K — Options page Language section (Phase 6, I18N-02)
options_language_heading:
  message: 'Language'
options_language_explainer:
  message: 'Choose the display language for this extension.'
options_language_label:
  message: 'Language'
options_language_auto:
  message: 'Auto (follow browser)'
```

在 `locales/zh_CN.yml` 末尾追加以下内容：

```yaml
# Group K — Options page Language section (Phase 6, I18N-02)
options_language_heading:
  message: '语言'
options_language_explainer:
  message: '选择扩展的显示语言。'
options_language_label:
  message: '语言'
options_language_auto:
  message: '自动（跟随浏览器）'
```

**删除废弃键：**

从 `locales/en.yml` 中删除以下键（含其 `message:` + 可能的 `placeholders:` 行）：
1. `popup_hello:` 块（包含 message + placeholders.count 子块，约 6 行）
2. `options_reserved_language_label:` 块（约 2 行）
3. `options_reserved_placeholder_body:` 块（约 2 行）

从 `locales/zh_CN.yml` 中删除相同的三个键块。

注意：`options_reserved_language` 键在 CONTEXT 中提到但实际不存在于 locale 文件（不需要删除）。
</action>

<verify>
  <automated>pnpm typecheck</automated>
</verify>

<acceptance_criteria>
- `grep "^options_language_heading:" locales/en.yml` 输出非空
- `grep "^options_language_explainer:" locales/en.yml` 输出非空
- `grep "^options_language_label:" locales/en.yml` 输出非空
- `grep "^options_language_auto:" locales/en.yml` 输出非空
- `grep "^options_language_heading:" locales/zh_CN.yml` 输出非空（值为 `语言`）
- `grep "^options_language_auto:" locales/zh_CN.yml` 输出非空（值含 `自动`）
- `grep "^popup_hello:" locales/en.yml` 输出为空
- `grep "^options_reserved_language_label:" locales/en.yml` 输出为空
- `grep "^options_reserved_placeholder_body:" locales/en.yml` 输出为空
- pnpm typecheck 通过
</acceptance_criteria>

---

### Task 2: 创建 LanguageSection 组件

<read_first>
- entrypoints/options/components/ResetSection.tsx (参考现有 section 组件结构和样式)
- entrypoints/options/components/GrantedOriginsSection.tsx (参考存储读取和事件处理模式)
- shared/i18n/index.ts (t() 函数签名, setLocale() 签名, LocaleChoice 类型)
- shared/storage/items.ts (localeItem 定义)
- .planning/phases/06-i18n/06-UI-SPEC.md (UI 规格：select 样式、3 个 option、test IDs)
</read_first>

<action>
创建 `entrypoints/options/components/LanguageSection.tsx`：

```tsx
import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { t, setLocale, localeSig } from '@/shared/i18n';
import { localeItem, type LocaleChoice } from '@/shared/storage/items';

type SelectValue = 'en' | 'zh_CN' | '';

const LOCALE_ALLOWLIST: SelectValue[] = ['en', 'zh_CN', ''];

export function LanguageSection() {
  // '' = Auto（跟随浏览器）
  const selected = useSignal<SelectValue>('');

  useEffect(() => {
    localeItem.getValue().then((stored) => {
      selected.value = stored ?? '';
    });
  }, []);

  async function handleChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as SelectValue;
    if (!LOCALE_ALLOWLIST.includes(val)) return;
    selected.value = val;
    const locale: LocaleChoice = val === '' ? null : val;
    await setLocale(locale);
  }

  return (
    <section
      class="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 flex flex-col gap-4"
      data-testid="options-language-section"
    >
      <header class="flex flex-col gap-2">
        <h2 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
          {t('options_language_heading')}
        </h2>
        <p class="m-0 text-sm leading-normal font-normal text-slate-500 dark:text-slate-400">
          {t('options_language_explainer')}
        </p>
      </header>
      <label for="locale-select" class="sr-only">
        {t('options_language_label')}
      </label>
      <select
        id="locale-select"
        data-testid="options-language-select"
        value={selected.value}
        onChange={handleChange}
        class="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2 text-sm leading-normal font-normal text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
      >
        <option value="">{t('options_language_auto')}</option>
        {/* eslint-disable-next-line local/no-hardcoded-strings */}
        <option value="en">English</option>
        {/* eslint-disable-next-line local/no-hardcoded-strings */}
        <option value="zh_CN">简体中文</option>
      </select>
    </section>
  );
}
```

注意：
- 使用 Preact 的 `for` 属性（非 `htmlFor`）
- `useSignal` 来自 `@preact/signals`（Preact-native signal hook）
- `selected` signal 初始为 `''`（Auto），useEffect 中从 storage 读取真实值
- "English" 和 "简体中文" 是语言标识符，需要 eslint-disable 注释豁免
</action>

<verify>
  <automated>pnpm typecheck && pnpm lint</automated>
</verify>

<acceptance_criteria>
- `entrypoints/options/components/LanguageSection.tsx` 存在
- 包含 `data-testid="options-language-section"`
- 包含 `data-testid="options-language-select"`
- 包含 `<option value="">` 使用 `{t('options_language_auto')}`
- 包含 `<option value="en">English</option>` 带 eslint-disable 注释
- 包含 `<option value="zh_CN">简体中文</option>` 带 eslint-disable 注释
- 包含 `LOCALE_ALLOWLIST.includes(val)` 验证
- 包含 `for="locale-select"` （非 `htmlFor`）
- `pnpm typecheck` 通过
- `pnpm lint` 通过
</acceptance_criteria>

---

### Task 3: 更新 entrypoints/options/App.tsx

<read_first>
- entrypoints/options/App.tsx (当前完整内容，含 ReservedSection 定义和用法)
- entrypoints/options/components/LanguageSection.tsx (刚创建)
</read_first>

<action>
修改 `entrypoints/options/App.tsx`：

1. 添加 import：
   ```tsx
   import { LanguageSection } from './components/LanguageSection';
   ```

2. 将 `App` 函数中的 `<ReservedSection>` 替换为 `<LanguageSection />`，并调整顺序（LanguageSection 放在最前）：
   ```tsx
   export function App() {
     return (
       <main class="mx-auto max-w-[720px] p-8 flex flex-col gap-4 font-sans" data-testid="options-app">
         <h1 class="m-0 text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
           {t('options_page_heading')}
         </h1>
         <LanguageSection />
         <ResetSection />
         <GrantedOriginsSection />
       </main>
     );
   }
   ```

3. 删除 `ReservedSection` 函数定义（整个函数，约 20 行）及其 `labelKey` prop 类型定义。

4. 删除不再需要的 `ReservedSection` 相关注释。
</action>

<verify>
  <automated>pnpm typecheck</automated>
</verify>

<acceptance_criteria>
- `entrypoints/options/App.tsx` 包含 `import { LanguageSection } from './components/LanguageSection'`
- `entrypoints/options/App.tsx` 包含 `<LanguageSection />`，且位于 `<ResetSection />` 之前
- `entrypoints/options/App.tsx` 不包含 `ReservedSection` 函数定义
- `entrypoints/options/App.tsx` 不包含 `options_reserved_language` 引用
- `pnpm typecheck` 通过
- `pnpm lint` 通过（LanguageSection 文件的 eslint-disable 注释正确）
</acceptance_criteria>

## Verification

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test
grep "LanguageSection" entrypoints/options/App.tsx   # 1 行 import + 1 行用法
grep "^options_language_heading:" locales/en.yml      # 存在
grep "^popup_hello:" locales/en.yml                   # 不存在（已删除）
```

## Must Haves

```yaml
must_haves:
  truths:
    - entrypoints/options/components/LanguageSection.tsx exists with data-testid="options-language-section"
    - LanguageSection is first section in options/App.tsx (before ResetSection)
    - ReservedSection function removed from App.tsx
    - locales/en.yml contains options_language_heading, options_language_explainer, options_language_label, options_language_auto
    - locales/zh_CN.yml contains same 4 keys with Chinese values
    - popup_hello removed from both locale files
    - options_reserved_language_label removed from both locale files
    - options_reserved_placeholder_body removed from both locale files
    - pnpm typecheck passes
    - pnpm lint passes
    - pnpm build passes
```
