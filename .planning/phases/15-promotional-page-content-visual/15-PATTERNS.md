# Phase 15: 宣传页内容与视觉实现 - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/marketing/src/app.tsx` | component | request-response | `apps/marketing/src/app.tsx` | exact |
| `apps/marketing/src/data/site-content.ts` | utility | transform | `apps/marketing/src/data/site-content.ts` | exact |
| `apps/marketing/src/i18n/locales/en.json` | config | transform | `apps/marketing/src/i18n/locales/en.json` | exact |
| `apps/marketing/src/i18n/locales/zh_CN.json` | config | transform | `apps/marketing/src/i18n/locales/zh_CN.json` | exact |
| `apps/marketing/src/components/section-shell.tsx` | component | request-response | `apps/marketing/src/app.tsx` | role-match |
| `apps/marketing/src/components/cta-button.tsx` | component | request-response | `entrypoints/options/components/Select.tsx` | role-match |
| `apps/marketing/src/components/proof/asset-label.tsx` | component | request-response | `entrypoints/popup/components/primitives.tsx` | role-match |
| `apps/marketing/src/components/proof/popup-mockup.tsx` | component | transform | `entrypoints/popup/components/CapturePreview.tsx` | dataflow-match |
| `apps/marketing/src/components/proof/target-mockup.tsx` | component | transform | `entrypoints/popup/components/PopupChrome.tsx` | role-match |
| `apps/marketing/src/components/flow/stepper.tsx` | component | request-response | `entrypoints/options/components/Select.tsx` | role-match |
| `tests/unit/marketing/site-content.spec.ts` | test | transform | `tests/unit/scripts/marketing-verify-build.spec.ts` | role-match |
| `tests/unit/marketing/app-sections.spec.tsx` | test | request-response | `tests/unit/options/select.spec.tsx` | role-match |
| `tests/unit/marketing/proof-labels.spec.tsx` | test | request-response | `tests/unit/options/granted-origins-section.spec.tsx` | role-match |
| `apps/marketing/scripts/verify-build.mjs` | utility | file-I/O | `apps/marketing/scripts/verify-build.mjs` | exact |

## Pattern Assignments

### `apps/marketing/src/app.tsx` (component, request-response)

**Analog:** `apps/marketing/src/app.tsx`

**Imports pattern** (`apps/marketing/src/app.tsx:1-3`):
```typescript
import type { Signal } from '@preact/signals';
import { getHero, getSupportedPlatforms, getNextPhase } from './data/site-content';
import { t } from './i18n/index';
```

**Core section assembly pattern** (`apps/marketing/src/app.tsx:8-23`):
```typescript
export function App({ locale }: AppProps) {
  const hero = getHero();
  const platforms = getSupportedPlatforms();
  const nextPhase = getNextPhase();

  return (
    <div class="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-base)]">
      <header class="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 class="text-3xl font-bold text-[var(--color-ink-strong)]">{hero.title}</h1>
        <p class="mt-4 text-lg text-[var(--color-ink-muted)]">{hero.subtitle}</p>
        <a
          href="https://github.com/nichochar/web2chat"
          class="mt-8 inline-block rounded-[var(--radius-soft)] bg-[var(--color-accent)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          {hero.cta}
        </a>
```

**Conditional title / mapped list pattern** (`apps/marketing/src/app.tsx:26-39`):
```typescript
<section class="mx-auto max-w-3xl px-6 pb-16">
  <h2 class="mb-6 text-xl font-semibold text-[var(--color-ink-strong)]">
    {platforms[0] && t('supportedPlatforms.title')}
  </h2>
  <ul class="space-y-3">
    {platforms.map((p) => (
      <li
        key={p.key}
        class="rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3"
      >
        {p.label}
      </li>
    ))}
  </ul>
</section>
```

**Locale toggle interaction pattern** (`apps/marketing/src/app.tsx:47-64`):
```typescript
<footer class="border-t border-[var(--color-rule)] py-6 text-center text-sm text-[var(--color-ink-faint)]">
  <button
    type="button"
    class="underline hover:text-[var(--color-ink-muted)]"
    onClick={() => {
      const next = locale.value === 'en' ? 'zh_CN' : 'en';
      locale.value = next;
      void import('./i18n/index')
        .then((m) => m.setLocale(next))
        .then(() => {
          window.dispatchEvent(new CustomEvent('locale-changed'));
        });
    }}
  >
```

**Apply in Phase 15:** 保留 `App({ locale })` 顶层组装模式，但用 8 个 section 全量替换当前 Hero / platforms / nextPhase 骨架；继续从 `site-content.ts` 拉数据，不把文案散落进 JSX。

---

### `apps/marketing/src/data/site-content.ts` (utility, transform)

**Analog:** `apps/marketing/src/data/site-content.ts`

**Imports + typed interfaces pattern** (`apps/marketing/src/data/site-content.ts:1-16`):
```typescript
import { t } from '../i18n/index';

export interface HeroContent {
  title: string;
  subtitle: string;
  cta: string;
}

export interface PlatformEntry {
  key: string;
  label: string;
}
```

**Getter pattern** (`apps/marketing/src/data/site-content.ts:18-39`):
```typescript
export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    cta: t('hero.cta'),
  };
}

export function getSupportedPlatforms(): PlatformEntry[] {
  return [
    { key: 'openclaw', label: t('supportedPlatforms.openclaw') },
    { key: 'discord', label: t('supportedPlatforms.discord') },
    { key: 'slack', label: t('supportedPlatforms.slack') },
    { key: 'telegram', label: t('supportedPlatforms.telegram') },
  ];
}
```

**Apply in Phase 15:** 继续扩展 typed getter。新增 use cases、payload example、mockup metadata、trust facts、known limits、CTA links、flow steps 时，优先用 `interface + getter + t()`，并把平台 truth / 风险标签固化在这里。

---

### `apps/marketing/src/i18n/locales/en.json` (config, transform)

**Analog:** `apps/marketing/src/i18n/locales/en.json`

**Flat key naming pattern** (`apps/marketing/src/i18n/locales/en.json:1-11`):
```json
{
  "hero.title": "Capture any page. Send to any chat.",
  "hero.subtitle": "One click to deliver structured page metadata with your prompt into IM or AI Agent sessions.",
  "hero.cta": "View project source",
  "supportedPlatforms.title": "Supported Platforms",
  "supportedPlatforms.openclaw": "OpenClaw — self-hosted AI Agent platform"
}
```

**Apply in Phase 15:** 延续 `section.field` 扁平 key；所有新增 Hero / Use cases / Payload / Platforms / Flow / Trust / Limits / CTA / Mockup metadata 文案都保持扁平命名，便于 `t()` 和 coverage 校验。

---

### `apps/marketing/src/i18n/locales/zh_CN.json` (config, transform)

**Analog:** `apps/marketing/src/i18n/locales/zh_CN.json`

**Locale parity pattern** (`apps/marketing/src/i18n/locales/zh_CN.json:1-11`):
```json
{
  "hero.title": "抓取任意网页，投递到任意聊天。",
  "hero.subtitle": "一键将页面结构化信息与自定义 prompt 投递到 IM 或 AI Agent 会话。",
  "hero.cta": "查看项目源码",
  "supportedPlatforms.title": "支持的平台",
  "supportedPlatforms.openclaw": "OpenClaw — 自部署 AI Agent 平台"
}
```

**Apply in Phase 15:** `zh_CN` 与 `en` 必须 100% 同 key 同结构；mockup 标签、风险标签、按钮辅助文案也不能漏。

---

### `apps/marketing/src/components/section-shell.tsx` (component, request-response)

**Analog:** `apps/marketing/src/app.tsx`

**Section container pattern** (`apps/marketing/src/app.tsx:26-39`):
```typescript
<section class="mx-auto max-w-3xl px-6 pb-16">
  <h2 class="mb-6 text-xl font-semibold text-[var(--color-ink-strong)]">
    {platforms[0] && t('supportedPlatforms.title')}
  </h2>
  <ul class="space-y-3">
```

**Top-level page shell pattern** (`apps/marketing/src/app.tsx:13-16`):
```typescript
return (
  <div class="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink-base)]">
    <header class="mx-auto max-w-3xl px-6 py-20 text-center">
```

**Apply in Phase 15:** `section-shell.tsx` 应只是把既有 `max-w-* + px-6 + py-* + h2` 模式抽到轻量组件，不新增复杂状态或上下文。背景交替、宽度差异、section heading 都走 props。

---

### `apps/marketing/src/components/cta-button.tsx` (component, request-response)

**Analog:** `entrypoints/options/components/Select.tsx`

**Focusable control token pattern** (`entrypoints/options/components/Select.tsx:140-156`):
```typescript
<button
  ref={buttonRef}
  id={props.id}
  type="button"
  role="combobox"
  ...
  class="w-full flex items-center justify-between bg-transparent border-0 border-b-[1.5px] border-[var(--color-border-strong)] ... focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-[var(--color-accent)] transition-[border-color] duration-[var(--duration-snap)]"
>
```

**Primary action token pattern** (`entrypoints/popup/components/SendForm.tsx:348-363`):
```typescript
<button
  type="button"
  class={
    confirmEnabled
      ? 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] ... text-white px-5 py-2 rounded-[var(--radius-soft)] ...'
      : 'bg-[var(--color-surface-subtle)] text-[var(--color-ink-faint)] cursor-not-allowed ...'
  }
```

**Apply in Phase 15:** Hero CTA 和底部 CTA primary/secondary 复用同一按钮组件；重点复制 token 使用方式、focus-visible、hover/active 状态，不必照搬 popup 的 disabled 逻辑。

---

### `apps/marketing/src/components/proof/asset-label.tsx` (component, request-response)

**Analog:** `entrypoints/popup/components/primitives.tsx`

**Label primitive pattern** (`entrypoints/popup/components/primitives.tsx:17-25`):
```typescript
export function FieldLabel({ id, label }: { id: string; label: string }) {
  return (
    <label
      for={id}
      class="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--color-ink-muted)]"
    >
      {label}
    </label>
  );
}
```

**Apply in Phase 15:** `asset-label.tsx` 可直接复用“低调、小字、uppercase/metadata”语气，渲染 `mockup` 标签与 `source/status/version` metadata row。该组件不应引入业务逻辑，只处理展示。

---

### `apps/marketing/src/components/proof/popup-mockup.tsx` (component, transform)

**Analog:** `entrypoints/popup/components/CapturePreview.tsx`

**Imports pattern** (`entrypoints/popup/components/CapturePreview.tsx:25-27`):
```typescript
import { t } from '@/shared/i18n';
import type { ArticleSnapshot } from '@/shared/messaging';
import { FieldLabel, textareaClass } from './primitives';
```

**Grid field/value layout pattern** (`entrypoints/popup/components/CapturePreview.tsx:67-145`):
```typescript
<div class="flex flex-col gap-3" data-testid="capture-success">
  <div class="grid grid-cols-[14px_auto_1fr] items-start gap-x-2 gap-y-0">
    <PropertyRow icon={<TypeIcon />} labelFor="field-title" label={t('capture_field_title')}>
      <textarea ... data-testid="capture-field-title" rows={1} />
    </PropertyRow>
    <PropertyRow icon={<LinkIcon />} label={t('capture_field_url')}>
      <output class="block px-2 py-1 text-[12px] leading-snug font-mono ..." data-testid="capture-field-url">
        {props.snapshot.url}
      </output>
    </PropertyRow>
```

**Metadata divider + content block pattern** (`entrypoints/popup/components/CapturePreview.tsx:127-144`):
```typescript
<hr class="border-0 border-t border-[var(--color-rule)]" />
<div class="flex flex-col gap-1">
  <FieldLabel id="field-content" label={t('capture_field_content')} />
  <textarea
    id="field-content"
    class={textareaClass}
    style="min-height:9rem"
```

**Accessibility / decorative icon pattern** (`entrypoints/popup/components/CapturePreview.tsx:189-199`):
```typescript
const ICON_PROPS = {
  width: '14',
  height: '14',
  ...
  'aria-hidden': true,
};
```

**Apply in Phase 15:** payload example 与 popup proof mockup 直接参考这种“字段标签 + mono value + divider + content preview”的结构，换成只读营销演示版；字段顺序必须固定为 `title / url / description / create_at / content / prompt`。

---

### `apps/marketing/src/components/proof/target-mockup.tsx` (component, transform)

**Analog:** `entrypoints/popup/components/PopupChrome.tsx`

**Compact chrome / metadata header pattern** (`entrypoints/popup/components/PopupChrome.tsx:15-24`):
```typescript
export function PopupChrome({ showSettings = false, onToggleSettings }: PopupChromeProps) {
  const tooltip = showSettings
    ? t('popup_chrome_back_tooltip')
    : t('popup_chrome_settings_tooltip');
  return (
    <div
      class="flex items-center justify-between px-3 pt-3 pb-2 border-b border-[var(--color-border-strong)]"
      data-testid="popup-chrome"
    >
```

**Decorative icon accessibility pattern** (`entrypoints/popup/components/PopupChrome.tsx:41-71`):
```typescript
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  ...
  aria-hidden="true"
>
```

**Apply in Phase 15:** target chat mockup 的顶部栏、边框、低对比 chrome、装饰 SVG 都可以复制这一类写法；所有纯装饰 icon/shape 继续标 `aria-hidden`。

---

### `apps/marketing/src/components/flow/stepper.tsx` (component, request-response)

**Analog:** `entrypoints/options/components/Select.tsx`

**Interactive list item pattern** (`entrypoints/options/components/Select.tsx:178-231`):
```typescript
<ul
  id={listboxId}
  role="listbox"
  aria-label={props.ariaLabel}
  class="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] ..."
>
  {props.options.map((opt, i) => {
    const isSelected = opt.value === props.value;
    const isActive = i === activeIdx;
    return (
      <li
        key={opt.value}
        role="option"
        aria-selected={isSelected}
        class={`flex items-center gap-2 min-h-9 px-3 py-2 ...`}
      >
```

**Apply in Phase 15:** 虽然 stepper 不是 combobox，但可以沿用 `flex/grid + tokenized border + responsive gap + explicit semantics` 的组织方式。若 stepper 纯展示，则不要硬套 `role=listbox`；只复制布局和 token 使用。

---

### `tests/unit/marketing/site-content.spec.ts` (test, transform)

**Analog:** `tests/unit/scripts/marketing-verify-build.spec.ts`

**Vitest structure pattern** (`tests/unit/scripts/marketing-verify-build.spec.ts:27-77`):
```typescript
describe('verify-build assertBuildOutput — D-13 smoke verifier', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'marketing-verify-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });
```

**Pure function assertion pattern** (`tests/unit/scripts/marketing-verify-build.spec.ts:38-76`):
```typescript
const { assertBuildOutput } = await loadVerifier();
const errors: string[] = [];
assertBuildOutput(distDir, errors);
expect(errors).toEqual([]);
```

**Apply in Phase 15:** `site-content.spec.ts` 也应以纯 getter 为目标，直接断言平台列表、payload 字段、trust facts、CTA URL；避免依赖 DOM。

---

### `tests/unit/marketing/app-sections.spec.tsx` (test, request-response)

**Analog:** `tests/unit/options/select.spec.tsx`

**Render + flush pattern** (`tests/unit/options/select.spec.tsx:18-59`):
```typescript
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});

async function renderSelect(...) {
  const { Select } = await import('@/entrypoints/options/components/Select');
  ...
  await act(async () => {
    render(<Select ... />, container);
  });
```

**Behavior assertion pattern** (`tests/unit/options/select.spec.tsx:81-113`):
```typescript
button.click();
await flush();
expect(container.querySelector('[role="listbox"]')).toBeTruthy();
...
expect(container.querySelector('[role="listbox"]')).toBeFalsy();
```

**Apply in Phase 15:** `app-sections.spec.tsx` 用同样的 `render + container.querySelector* + async flush` 断言 8 个 section 顺序、单个 `h1`、多个 `h2`、Hero CTA 与 bottom CTA 存在。

---

### `tests/unit/marketing/proof-labels.spec.tsx` (test, request-response)

**Analog:** `tests/unit/options/granted-origins-section.spec.tsx`

**Dynamic import render helper pattern** (`tests/unit/options/granted-origins-section.spec.tsx:34-38`):
```typescript
async function renderSection() {
  const mod = await import('@/entrypoints/options/components/GrantedOriginsSection');
  render(<mod.GrantedOriginsSection />, container);
  await new Promise((r) => setTimeout(r, 10));
}
```

**DOM assertion pattern** (`tests/unit/options/granted-origins-section.spec.tsx:40-53`):
```typescript
await renderSection();
const removeBtn = container.querySelector('[data-testid="..."]') as HTMLButtonElement;
expect(removeBtn).toBeTruthy();
...
const dialog = container.querySelector('[data-testid="confirm-dialog"]');
expect(dialog).toBeTruthy();
```

**Apply in Phase 15:** proof-labels 测试直接查 `mockup` 可见文本、metadata row、`source:` / `status:` / `version:` 字段；优先依赖稳定 selector 或文本，而不是脆弱样式。

---

### `apps/marketing/scripts/verify-build.mjs` (utility, file-I/O)

**Analog:** `apps/marketing/scripts/verify-build.mjs`

**Pure assertion + CLI guard pattern** (`apps/marketing/scripts/verify-build.mjs:24-40,45-62`):
```javascript
export function assertBuildOutput(distDir, errors) {
  if (!existsSync(distDir)) {
    errors.push(`dist directory does not exist: ${distDir}`);
    return;
  }

  const files = readdirSync(distDir);
  if (files.length === 0) {
    errors.push(`dist directory is empty (no files): ${distDir}`);
    return;
  }

  const indexHtml = resolve(distDir, 'index.html');
  if (!existsSync(indexHtml)) {
    errors.push(`dist/index.html not found in: ${distDir}`);
  }
}

const isDirectInvocation =
  !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectInvocation) {
  ...
  if (errors.length) {
    console.error('[verify:build] FAIL:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }

  console.log('[verify:build] OK — marketing build output valid');
}
```

**Apply in Phase 15:** 如果要增强站点 smoke verifier，继续保持“纯断言函数可单测 + CLI 外壳只负责 exit code”的模式；不要把文件系统检查写死在测试里。

---

## Shared Patterns

### 数据源分层
**Source:** `apps/marketing/src/data/site-content.ts:18-39`
**Apply to:** `app.tsx` 与所有新增 marketing 组件
```typescript
export function getHero(): HeroContent {
  return {
    title: t('hero.title'),
    subtitle: t('hero.subtitle'),
    cta: t('hero.cta'),
  };
}
```
营销页所有公开内容都先进入 `site-content.ts`，再由 JSX 消费。不要在组件里写死文案、平台状态或 CTA URL。

### i18n 访问模式
**Source:** `apps/marketing/src/i18n/index.ts:20-29`
**Apply to:** `site-content.ts`, `app.tsx`, 新增 proof/flow/button 组件
```typescript
export async function setLocale(locale: string): Promise<void> {
  await loadLocale(locale);
  currentLocale = locale;
}

export function t(key: LocaleKey): string {
  const dict = (dictionaries as Record<string, Record<string, string>>)[currentLocale];
  if (dict) return dict[key] ?? key;
  return (dictionaries.en as Record<string, string>)[key] ?? key;
}
```
所有用户可见字符串都继续走 `t()`；locale 文件保持平铺 key。

### 入口初始化模式
**Source:** `apps/marketing/src/main.tsx:6-15`
**Apply to:** locale 相关实现假设、App 重新渲染约束
```typescript
const locale = signal('en');

async function init(): Promise<void> {
  const browserLang = navigator.language.replace('-', '_');
  const supported = ['en', 'zh_CN'];
  const detected = supported.includes(browserLang) ? browserLang : 'en';
  locale.value = detected;
  await setLocale(detected);
  render(<App locale={locale} />, document.getElementById('app')!);
}
```
新增文案与 section 组件都默认在这个 signal 驱动的 locale 模型下运行，不需要再引入新状态库。

### Token 化按钮 / focus-visible
**Source:** `entrypoints/options/components/Select.tsx:155-156`, `entrypoints/popup/components/SendForm.tsx:350-363`
**Apply to:** Hero CTA、bottom CTA、locale toggle、任何 marketing 页交互控件
```typescript
class="... focus-visible:outline-none focus-visible:border-b-2 focus-visible:border-[var(--color-accent)] ..."
```
```typescript
'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)] ... rounded-[var(--radius-soft)] ...'
```
继续使用 design token，不创建营销页专属颜色体系。

### Proof mockup 的字段排版
**Source:** `entrypoints/popup/components/CapturePreview.tsx:67-145`
**Apply to:** payload example、popup mockup
```typescript
<div class="grid grid-cols-[14px_auto_1fr] items-start gap-x-2 gap-y-0">
  <PropertyRow ...>
    <output class="... font-mono ...">...</output>
  </PropertyRow>
</div>
<hr class="border-0 border-t border-[var(--color-rule)]" />
```
字段名 + 字段值 + mono 内容区域的视觉语言直接可复用到营销 proof 模块。

### 装饰性图形无障碍
**Source:** `entrypoints/popup/components/CapturePreview.tsx:189-199`, `entrypoints/popup/components/PopupChrome.tsx:41-71`
**Apply to:** stepper 圆形数字、箭头连接线、mockup 装饰 icon
```typescript
'aria-hidden': true,
```
纯装饰 SVG/shape 必须 `aria-hidden`，把真实语义留给标题、描述、visible label、metadata text。

### Vitest DOM 测试结构
**Source:** `tests/unit/options/select.spec.tsx:18-59`, `tests/unit/options/granted-origins-section.spec.tsx:34-38`
**Apply to:** `tests/unit/marketing/*.spec.tsx`
```typescript
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  render(null, container);
  container.remove();
});
```
marketing 组件测试继续走轻量容器渲染，不引入额外测试框架包装。

### Build verifier 纯函数模式
**Source:** `apps/marketing/scripts/verify-build.mjs:24-40`
**Apply to:** `apps/marketing/scripts/verify-build.mjs` 任何 Phase 15 扩展
```javascript
export function assertBuildOutput(distDir, errors) {
  ...
}
```
若验证项扩充，继续追加到 `errors` 数组，保持测试友好。

## No Analog Found

无完全缺失 analog 的目标文件；但以下文件只有部分匹配，需要优先沿用 marketing skeleton + popup token 组合，而不是期待一对一现成实现：

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/marketing/src/components/proof/popup-mockup.tsx` | component | transform | 仓库里有真实 popup 预览组件，但没有“营销页 proof mockup”现成版本 |
| `apps/marketing/src/components/proof/target-mockup.tsx` | component | transform | 仓库里没有聊天结果 mockup 组件，只能参考 popup chrome / token 模式 |
| `apps/marketing/src/components/flow/stepper.tsx` | component | request-response | 仓库里没有营销页 stepper；只存在可复用的 token 化可交互列表组件 |
| `tests/unit/marketing/app-sections.spec.tsx` | test | request-response | 当前没有 marketing 组件渲染测试，只能参考 options/popup 的 Preact DOM 测试模式 |

## Metadata

**Analog search scope:**
- `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/src`
- `/Users/seven/data/coding/projects/seven/web2chat/apps/marketing/scripts`
- `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/popup/components`
- `/Users/seven/data/coding/projects/seven/web2chat/entrypoints/options/components`
- `/Users/seven/data/coding/projects/seven/web2chat/tests/unit`

**Files scanned:** 16
**Pattern extraction date:** 2026-06-02
