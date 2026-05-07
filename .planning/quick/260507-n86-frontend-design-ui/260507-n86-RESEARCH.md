---
name: 260507-n86-RESEARCH
description: Editorial / data-dense 风格在 Web2Chat popup + options 上的具体实施研究 — token 体系、应用模式、微交互、anti-AI-cliche 技巧
type: quick-research
status: ready-for-planning
date: 2026-05-07
---

# Quick Task 260507-n86: 设计研究 — Editorial / data-dense 实施方案

> 由 `frontend-design:frontend-design` skill 指导生成。坚持 0 KB 新增依赖，纯 Tailwind v4 `@theme` token + 自写 CSS。

---

## 1. Token 体系建议

### 1.1 字体 (Type — 系统字体栈，0 KB)

| Token | 用途 | Stack |
|---|---|---|
| `--font-display` | h1/h2、关键 heading、capture title | `ui-serif, Iowan Old Style, "Apple Garamond", Baskerville, "Times New Roman", "Source Serif Pro", Georgia, serif` |
| `--font-body` | body/form/UI 默认 | `ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif` |
| `--font-mono` | URL、timestamp、dispatchId、host chip、code | `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", "JetBrains Mono", monospace` |

**关键决策：** 显式抛弃 Tailwind 默认 Inter 引用 — Inter 是 AI-generated UI 的最常见 cliche。改用 `ui-sans-serif` 让 macOS 用 SF、Windows 用 Segoe UI Variable，自然区分平台。Display 使用 serif 给 Editorial 印刷感。

### 1.2 Type Scale（modular 1.25 — major third）

| Token | px | line-height | weight | tracking | 用途 |
|---|---|---|---|---|---|
| `--text-display` | 22 | 1.2 | 600 | -0.015em | options page heading |
| `--text-title` | 16 | 1.3 | 600 | -0.01em | popup title bar、card heading |
| `--text-heading` | 14 | 1.35 | 600 | -0.005em | section heading |
| `--text-body` | 13 | 1.5 | 400 | 0 | body / form text |
| `--text-meta` | 12 | 1.4 | 400 | 0.005em | timestamp、URL、help |
| `--text-label` | 11 | 1.3 | 600 | 0.06em | UPPERCASE form labels (Editorial 关键签名) |
| `--text-micro` | 10 | 1.2 | 600 | 0.08em | chip / badge text |

**重点：** label 用 11px UPPERCASE + tracking-wider — print/editorial 经典处理，瞬间摆脱 AI 通用感。

### 1.3 色板（Stone neutral + Rust accent）

抛弃 Tailwind 默认 `slate`（偏冷蓝灰），换成 **stone**（暖灰，paper-like），accent 从 `sky-600` 换成 **rust orange-700**（温暖、品牌呼应 lobster、与 destructive red 视觉可区分）。

**Surface tokens：**
| Token | Light | Dark |
|---|---|---|
| `--canvas` | `#FAFAF7` (warm off-white) | `#0C0C0B` (warm carbon) |
| `--surface` | `#FFFFFF` | `#16161A` |
| `--surface-subtle` | `#F5F5F1` (stone-100 warmer) | `#1F1F23` |
| `--surface-sunken` | `#EFEFE9` (stone-150) | `#0A0A0A` |
| `--border-strong` | `#E7E5DE` (stone-200 warm) | `#2E2E33` |
| `--border-soft` | `#F0EFE9` (stone-150) | `#27272A` |
| `--rule` | `#1A1A17` 8% alpha | `#FAFAF7` 12% alpha |

**Ink tokens：**
| Token | Light | Dark |
|---|---|---|
| `--ink-strong` | `#0F0F0E` | `#FAFAF7` |
| `--ink-base` | `#3F3F3A` | `#D6D3CB` |
| `--ink-muted` | `#6B6B62` | `#9A968B` |
| `--ink-faint` | `#9A968B` | `#6B6B62` |

**Accent (single distinctive brand signal — 替换所有 sky-600/sky-400)：**
| Token | Value |
|---|---|
| `--accent` | `#C2410C` (orange-700, "rust") |
| `--accent-hover` | `#9A330A` (orange-800) |
| `--accent-active` | `#7C2D12` (orange-900) |
| `--accent-soft` | `#FED7AA` (orange-200) — 用于 hover bg |
| `--accent-on-dark` | `#FB923C` (orange-400) |
| `--accent-soft-dark` | `rgba(251, 146, 60, 0.12)` |

**Status tokens：**
| Token | Light | Dark |
|---|---|---|
| `--danger` | `#B91C1C` (red-700) | `#F87171` (red-400) |
| `--danger-soft` | `#FEE2E2` (red-100) | `rgba(248, 113, 113, 0.12)` |
| `--warn` | `#A16207` (yellow-700) | `#FBBF24` (amber-400) |
| `--success` | `#15803D` (green-700) | `#4ADE80` (green-400) |
| `--info` | `#0F766E` (teal-700) | `#5EEAD4` (teal-300) |

**抛弃约束：** `text-sky-*` / `bg-sky-*` 全量替换；`text-slate-*` / `bg-slate-*` 全量替换为新 token 或 `stone-*`；保留 `red-*` 作 destructive（但与 accent rust 视觉可区分：rust 偏暖橙，red 偏冷红）。

### 1.4 Radii（克制、印刷感）

| Token | Value | 用途 |
|---|---|---|
| `--radius-sharp` | `2px` | chip、badge |
| `--radius-soft` | `4px` | input、button、textarea（替换 rounded-md 6px） |
| `--radius-card` | `6px` | options 卡片（替换 rounded-lg 8px） |
| `--radius-pill` | `9999px` | status pill |

### 1.5 Shadow / Edge（Editorial 偏好边线，不偏好阴影）

| Token | Value | 用途 |
|---|---|---|
| `--shadow-edge` | `inset 0 0 0 1px var(--border-strong)` | 卡片 — 替代 shadow |
| `--shadow-pop` | `0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.06)` | modal/dropdown 唯一允许阴影 |
| `--ring-focus` | `0 0 0 3px rgb(194 65 12 / 0.18)` light / `0 0 0 3px rgb(251 146 60 / 0.24)` dark | focus ring（替换 ring-sky） |

### 1.6 Motion tokens

| Token | Value | 用途 |
|---|---|---|
| `--duration-instant` | `120ms` | hover color change |
| `--duration-snap` | `180ms` | input focus, button press |
| `--duration-base` | `240ms` | dropdown open, transition |
| `--duration-state` | `360ms` | view state change（loading→success） |
| `--duration-pageload` | `560ms` | InProgressView entrance |
| `--ease-snap` | `cubic-bezier(0.32, 0.72, 0, 1)` | 主交互（snappy, slight overshoot end） |
| `--ease-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` | 进入动画（gentle out） |
| `--ease-edit` | `cubic-bezier(0.76, 0, 0.24, 1)` | 状态切换（in-out） |

---

## 2. Editorial / data-dense 应用模式

### 2.1 popup — PopupChrome（标题栏）

**当前：** 居中文字 + 右侧齿轮，平淡。

**新方案：**
- 左侧：title 用 serif display 字体，加微小 Web2Chat 字标
- 右侧：齿轮按钮，hover 时旋转 60deg（CSS transition）
- 底部：stone-200 实线 + 一道更细的 stone-100 上线（双线 rule，print 风格）

```html
<!-- 简化示意 -->
<header class="chrome">
  <h1 class="font-display text-title tracking-tight">Web2Chat</h1>
  <button class="gear-btn"><!-- gear --></button>
</header>
```

### 2.2 popup — CapturePreview（捕获预览）

**当前：** 5 个 textarea/output 平铺。

**新方案：「文章草稿」隐喻：**
- Title：serif display font，editable，feels like 编辑标题
- URL：mono 字体 + 前置 `[host]` chip（小写 host，stone-100 bg，2px radius）
- Description：italic body 或 sans，缩进显示，似副标题
- Captured at：mono + 「2026-05-07 16:32 · 5m ago」相对时间补充（不引入依赖，简单 if-then）
- Content：sans body，editable

**字段标签：** 全部改为 `text-label` (11px UPPERCASE tracking-wider)。

**字段间分隔：** 用 stone-150 hairline rule 替代 gap，得到「正文段落」感。

### 2.3 popup — SendForm（投递表单）

**当前：** Tailwind 默认 box input + sky-600 实心按钮。

**新方案：**
- Form labels: `text-label` 风格
- Input/Combobox: **底边线**（border-b 1.5px）替换全 box border — Bauhaus/editorial 经典
- Platform icon 左侧 + 1px stone-200 vertical divider 分割图标与输入
- Confirm button: 「press-block」风格 — rust accent solid，文字 semibold tracking-wider，active 状态 translateY(0.5px) + brightness 95%
- Soft-overwrite hint: 改为「sidenote」 — 左侧 2px rust stripe + 缩进 + italic mono 内容
- Discord ToS warning: 「footnote」 — 前置 `¹` 上标 marker，文字 muted ink

### 2.4 popup — InProgressView（投递中）

**当前：** Lucide loader-2 spinner + 文字 + 红框 cancel。

**新方案：**
- Spinner 改为「editorial arc」：24×24 SVG，1.5px stroke，rust 颜色，animate-spin 但 1.6s（更慢、更冷静）
- 入场动画：stagger reveal — spinner 0ms / heading 60ms / body 120ms / cancel 180ms / dispatchId 240ms（全部 320ms ease-quint translateY 4→0 + opacity 0→1）
- Cancel: outlined，danger 颜色（不是实心填充）— 让取消是「克制的次要操作」
- dispatchId 区域：mono pill 风格 — `ID  4f3a…` (label + value, mono, stone-100 bg, 2px radius)

### 2.5 popup — ErrorBanner（错误条）

**当前：** bg-red-50 + border-l-4 完整 banner。

**新方案：「margin note」风格：**
- 左侧 3px danger 实色 stripe（保留）
- 主体改为 transparent bg，hover 时浮现极淡 danger-soft tint（200ms ease-instant）
- Heading 用 serif，body 用 sans
- Retry 按钮: text-link 风格（underline + danger），不是大按钮
- Dismiss x: 极弱 muted ink，hover 转 strong

### 2.6 popup — LoadingSkeleton

**当前：** 5 个 pulsing rectangle.

**新方案：「activity rule」风格：**
- 5 条 dashed/light 水平线（1.5px height, stone-150）模拟「正在排版的版面」
- shimmer：linear-gradient sweep 1.6s infinite (stone-100 → stone-200 → stone-100，translateX -100% → 100%)
- 比 pulse 更克制，保留 layout shift 防护

### 2.7 popup — EmptyView / ErrorView

**当前：** lucide 图标 + heading + body。

**新方案：**
- 图标尺寸保留 24px，但 stroke-width 1.5 (更纤细)
- Heading 用 serif display
- Body 用 italic 强调
- 在 body 下方加「asterism」装饰 — 三个间距均匀的 stone-300 dot/asterisk（print 经典）
- Inline accent span 保留三段结构，accent 改为 rust

### 2.8 options — 全页

**当前：** 单列卡片，bg-slate-100 实色填充。

**新方案：**
- Page heading: serif display, 22px, tracking-tight
- 卡片：**edge-line 风格** — 透明 bg + 1px stone-200 border + 6px radius，**取消填充色**
- 卡片内 heading: serif，14px
- 卡片内 description: italic body 或 muted sans
- Section 之间用一道 stone-150 hairline 分割（如果不用 card 边框）

### 2.9 options — LanguageSection

- `<select>`: 底边线 + 自定义箭头（CSS bg 实现）
- 选中时 rust ring focus

### 2.10 options — ResetSection

- 主按钮：rust outline (不是 red 实心) — 默认状态克制
- Hover 转 danger 颜色 + danger-soft bg → 强烈警示。
- ConfirmDialog 内 confirm 才用 danger 实心。

### 2.11 options — GrantedOriginsSection

**当前：** card list，每条一个 row。

**新方案：「table-like row」：**
- 每行: index `01` (mono, muted) + origin (mono) + remove (text-link, danger)
- 行间 hairline rule
- Empty state: italic, centered, with asterism

---

## 3. 关键微交互（CSS-only, 0 KB）

| # | 触发点 | 动作 | 实现 |
|---|---|---|---|
| 1 | Settings gear hover | 旋转 60deg | `transition: transform 200ms var(--ease-snap); &:hover { transform: rotate(60deg) }` |
| 2 | Confirm button active | press 反馈 | `&:active { transform: translateY(0.5px); filter: brightness(0.96); }` |
| 3 | Input focus | 底线变粗 + rust slide-in | `border-bottom: 1px → 2px`, `box-shadow: inset 0 -2px 0 var(--accent)` |
| 4 | Combobox listbox open | fade + slide 4px | `@keyframes listbox-open { from { opacity: 0; transform: translateY(-4px) } }` 240ms ease-quint |
| 5 | Listbox option hover | 左侧 2px rust 滑入 | `&::before { content: ''; width: 0; transition: width 180ms; }, &:hover::before { width: 2px }` |
| 6 | InProgressView entrance | stagger reveal 5 子元素 | `animation-delay: 0/60/120/180/240ms` + `@keyframes editorial-rise` |
| 7 | ErrorBanner enter | slide + fade | `@keyframes margin-note-in { from { opacity: 0; transform: translateY(-6px) } }` 200ms |
| 8 | LoadingSkeleton | linear-gradient sweep | `background: linear-gradient(...); animation: sweep 1.6s infinite ease-in-out` |
| 9 | ConfirmDialog open | scale 0.96→1 + fade | overlay `fade-in 240ms`, dialog `scale + fade 240ms ease-quint` |
| 10 | Toast dismiss | scale 0.96 + fade | `@keyframes toast-out` 200ms |
| 11 | Settings page reveal | stagger sections | options page mount: 3 sections delay 0/80/160ms |
| 12 | Soft-overwrite hint | sidenote 进入 | margin-note 同样 200ms |
| 13 | Combobox option active (kbd) | rust 左 bar + bg-soft | 替换现有 sky bg-50 |
| 14 | Cancel/destructive hover | bg-soft fade in | 200ms ease-instant |
| 15 | EmptyView icon | 微飘 4s 循环 | `@keyframes drift { 0,100% { translateY(0) } 50% { translateY(-2px) } }` |

**Reduced motion 处理：** 所有动画包裹 `@media (prefers-reduced-motion: no-preference)`，符合 a11y 默认值（已是 `frontend-design` 推荐）。

---

## 4. 摆脱 AI 通用感的具体技巧

| # | 技巧 | 替换前 (AI cliche) | 替换后 (Editorial) |
|---|---|---|---|
| 1 | 抛弃 sky-600 蓝 | `bg-sky-600 text-white` | `bg-[var(--accent)]` rust |
| 2 | Stone 暖灰替换 slate 冷灰 | `text-slate-500` | `text-[var(--ink-muted)]` |
| 3 | Display 用 serif | `font-sans` h1 | `font-display` (ui-serif) h1/h2 |
| 4 | 抛弃 Inter | Tailwind 默认 `font-sans` 含 Inter | 改 `@theme` 让 `font-sans` → `ui-sans-serif` only |
| 5 | UPPERCASE labels | `text-xs ... text-slate-500` | `text-[11px] uppercase tracking-[0.06em] font-semibold` |
| 6 | 底边线 input | `border border-slate-200 rounded-md` | `border-0 border-b-[1.5px] rounded-none` |
| 7 | 元数据全 mono | `<output>{snapshot.url}</output>` 用默认 sans | `<output class="font-mono">` |
| 8 | Edge-line cards (无填充) | `bg-slate-100 rounded-lg` | `bg-transparent border border-[var(--border-strong)] rounded` |
| 9 | Asterism 装饰 | EmptyView 干净留白 | EmptyView 末尾 `* * *` decoration |
| 10 | Footnote ¹ marker | Discord ToS 大段 amber 文字 | 前置 `¹` 上标 + muted body |
| 11 | Sidenote 边注 | Soft-overwrite 当 button | 缩进 + 左 stripe + italic mono |
| 12 | host chip | URL 完整露出 | `[github.com]` chip + 完整 URL 弱化 |
| 13 | Tabular nums | 时间戳常规字符 | `font-variant-numeric: tabular-nums` |
| 14 | Press-style button | bg-sky-600 + shadow | 实色 + active translate + brightness |
| 15 | 双线 chrome rule | 单 border-b | 主 border-b + 上 1px hairline 间距 |
| 16 | 慢 spinner (1.6s) | 0.8s 默认 spin | 1.6s ease-in-out（"冷静" feel） |
| 17 | Stagger reveal | 全部同时出现 | InProgressView/options stagger 0/80/160ms |
| 18 | 抛弃 drop shadow | `shadow-lg` 卡片 | `border` 卡片，仅 modal 用 shadow-pop |

---

## 5. 实施技术策略

### 5.1 Token 注入

WXT 项目结构：每个 entrypoint 有自己的 `style.css` (含 `@import 'tailwindcss'`). 需在两个 style.css 中都注入 `@theme` 定义。

**方案：** 创建 `entrypoints/_shared-tokens.css`（不是 entrypoint，是辅助文件），里面包含 `@theme inline` token 定义；popup 与 options 的 style.css 都 `@import './_shared-tokens.css'`。

**或：** 直接在 `popup/style.css` 与 `options/style.css` 中分别声明同一份 `@theme inline { ... }`（牺牲一点 DRY，但避免新文件）。

> Decision: 使用 `entrypoints/_shared-tokens.css` 单一来源，被两个 entrypoint 引用 — 单一来源原则，避免 token drift。

### 5.2 Tailwind v4 `@theme` 语法

```css
@import 'tailwindcss';

@theme inline {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable Text", sans-serif;
  --font-serif: ui-serif, "Iowan Old Style", Baskerville, Georgia, serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --color-canvas: #FAFAF7;
  --color-surface: #FFFFFF;
  --color-accent: #C2410C;
  /* ... */
}

@theme inline {
  /* dark mode override via media + .dark scope */
}
```

Tailwind v4 把 `@theme inline` 中的变量自动暴露为 utility（如 `text-accent`, `bg-canvas`）。同时也作为 CSS variable 可用于自写 CSS。

### 5.3 Dark mode

Tailwind v4 用 `prefers-color-scheme` 默认；为暗色 token 写：

```css
@media (prefers-color-scheme: dark) {
  @theme inline {
    --color-canvas: #0C0C0B;
    --color-accent: #FB923C;
    /* ... */
  }
}
```

### 5.4 Animation keyframes

`_shared-tokens.css` 同文件声明全局 keyframes（可被 utility 引用 via `animate-[name]`）：

```css
@keyframes editorial-rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer-sweep { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
@keyframes margin-note-in { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
/* ... */
```

### 5.5 对组件改动的边界

- 全部组件改动**仅 className + 极少新增 SVG 装饰**
- 不重排 DOM
- 不增删 i18n key
- 不改 Storage / messaging / adapter
- 不改 data-testid / role / aria-* / id / for=

### 5.6 测试维持

- Vitest unit tests: 不依赖 className，应继续通过
- Playwright e2e: 依赖 data-testid + 文案；className 改不影响
- 类型检查、lint：不受影响
- Tailwind v4 `@theme` 语法：项目已用过（`entrypoints/popup/style.css` line 1 `@import 'tailwindcss'`），兼容

---

## 6. Anti-pitfall 清单

| 风险 | 缓解 |
|---|---|
| Tailwind v4 token 名与 Tailwind 默认冲突 | 使用 `@theme inline { }` 显式覆盖；为自定义命名加前缀 `--color-canvas` 等 |
| Dark mode 切换 token 漏一个状态 | 一次性 grep `dark:bg-` `dark:text-` 全量替换 |
| 现有 `sky-*` 引用残留 | grep `text-sky` `bg-sky` `ring-sky` `border-sky` 全量替换 |
| 现有 `slate-*` 引用残留 | 大部分应改为 `stone-*` 或新 token；grep `text-slate` `bg-slate` `border-slate` `dark:bg-slate` `dark:text-slate` |
| Discord/OpenClaw brand 色被 token 化覆盖 | PlatformIcon openclaw 用 hardcoded gradient，不会被 Stone 替换；保留 |
| 字体替换影响原有 `font-sans` 隐式预期 | `@theme inline { --font-sans: ... }` 改 ui-sans-serif，仍兼容；不需要改组件 |
| 新增 keyframe 名冲突 | 全部带 `editorial-` / `margin-note-` 前缀 |
| `prefers-reduced-motion` 没处理 | 所有 keyframe 引用包裹 media query |
| Confirm 按钮在 disabled 视觉差异丢失 | 保留 disabled style（仅替换颜色） |

---

## 7. 推荐文件改动列表（PLAN 阶段细化）

新增（1 个）：
- `entrypoints/_shared-tokens.css` — 全部 tokens + keyframes

修改（约 14 个）：
- `entrypoints/popup/style.css` — import shared tokens
- `entrypoints/options/style.css` — import shared tokens
- `entrypoints/popup/index.html` — body class（颜色 token）
- `entrypoints/options/index.html` — body class
- `entrypoints/popup/App.tsx` — LoadingSkeleton / EmptyView / ErrorView className
- `entrypoints/popup/components/PopupChrome.tsx`
- `entrypoints/popup/components/SendForm.tsx`
- `entrypoints/popup/components/CapturePreview.tsx`
- `entrypoints/popup/components/Combobox.tsx`
- `entrypoints/popup/components/InProgressView.tsx`
- `entrypoints/popup/components/ErrorBanner.tsx`
- `entrypoints/popup/components/PlatformIcon.tsx` (微调 unsupported/mock 颜色 token)
- `entrypoints/popup/components/primitives.tsx` (textareaClass / inputClass / FieldLabel)
- `entrypoints/options/App.tsx`
- `entrypoints/options/components/LanguageSection.tsx`
- `entrypoints/options/components/ResetSection.tsx`
- `entrypoints/options/components/GrantedOriginsSection.tsx`
- `entrypoints/options/components/ConfirmDialog.tsx`

不修改：
- 所有 background / content scripts
- 所有 shared/ 目录
- locales/*.yml
- wxt.config.ts、package.json

---

## 8. 验证策略 (must_haves derive)

| Must-have | 验证方法 |
|---|---|
| 全部 Vitest 单测通过 | `pnpm test` 退出码 0 |
| 全部 Playwright e2e 通过 | `pnpm e2e` (headed 由用户跑) |
| Type check 通过 | `pnpm typecheck` 退出码 0 |
| Lint 通过 | `pnpm lint` 退出码 0 |
| Build 通过 | `pnpm build` 退出码 0 |
| 全部 data-testid 保留 | grep 各组件 data-testid count 与 git base 比对 |
| ARIA 属性保留 | grep `role=` `aria-` 各组件 count 与 base 比对 |
| `t(...)` 文案保留 | grep `t('...')` count 与 base 比对 |
| sky-* 完全清除 | grep `text-sky\|bg-sky\|ring-sky\|border-sky` 应为 0 |
| 0 KB 新增依赖 | `package.json` 不变；`pnpm-lock.yaml` 不变 |
| 暗色模式覆盖 | 所有新 className 含暗色等价物或使用自适应 token |

---

## RESEARCH COMPLETE

Output: `.planning/quick/260507-n86-frontend-design-ui/260507-n86-RESEARCH.md`
