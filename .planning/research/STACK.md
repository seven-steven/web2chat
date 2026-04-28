# Stack 调研

**领域：** Chrome MV3 Web Clipper 扩展，通过 content-script DOM 操作将格式化的页面内容 + 用户 prompt 注入到第三方 IM / AI-Agent 网页聊天 UI 中
**调研时间：** 2026-04-28
**置信度：** 高（所有框架 / 库版本均在过去 30 天内对照 npm + Context7 完成核验）

---

## TL;DR — 2026 标准技术栈

> **WXT + Vite + TypeScript + Preact + @wxt-dev/i18n + @mozilla/readability + Vitest + Playwright**

这是 Web2Chat 的规范化技术栈。下文给出选型理由、备选方案以及"不要使用"的清单。

---

## 推荐技术栈

### 核心技术

| Technology           | Version                       | Purpose                                                                                                           | Why Recommended                                                                                                                                                                                                                                 |
| -------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WXT**              | `^0.20.25`                    | 扩展框架 —— 基于文件的 entrypoints、MV3 manifest 生成器、Vite 原生 HMR、跨浏览器 polyfill、`wxt prepare` 类型生成 | 2025–2026 公认的 MV3 开发体验领跑者。基于 Vite 构建，从带类型的 entrypoints 生成 `manifest.json`，自带 `browser.*` polyfill（基于 Promise），为 popup/content/background 提供 HMR，并配套有官方 storage / i18n / messaging 模块生态。置信度：高 |
| **Vite**             | `^7.0.0` (transitive via WXT) | 打包器 + 开发服务器                                                                                               | Vite 是 WXT、CRXJS 以及现代扩展工具链统一选择的构建引擎（Plasmo 依赖 Parcel 是其落后的主要原因）。无需直接安装 —— WXT 已锁定版本。置信度：高                                                                                                    |
| **TypeScript**       | `^5.6.0`                      | 为 popup、background、content scripts、共享模块提供静态类型                                                       | 适配器契约的强制要求（每个 IM 平台 = 一个强类型适配器）；WXT 默认使用 TS 并自动生成 `.wxt/` 类型。置信度：高                                                                                                                                    |
| **Preact**           | `^10.29.1`                    | popup UI 渲染                                                                                                     | popup 总打包体积要 <100 KB（logo + i18n + UI + Readability 共用预算）。Preact 10.x 稳定，已应用 2026 年 1 月安全补丁（10.28.2+），暴露与 React 一致的 JSX/hooks API，且运行时只有 4 KB。WXT 提供官方 Preact 模板。置信度：高                    |
| **@preact/signals**  | `^2.0.0`                      | popup 状态（send_to 历史、prompt 绑定、语言）                                                                     | Signals 避免了 PROJECT.md "send_to / prompt 绑定" 需求中 prompt↔send_to 联动带来的整页重渲染。对于 3 屏的 popup，比 Zustand 更轻量。置信度：高                                                                                                  |
| **@wxt-dev/browser** | `^0.1.40`                     | 基于 `@types/chrome` 的跨浏览器 `browser.*` 命名空间                                                              | 与 WXT 一并发布；在 Chrome 上提供基于 Promise 的 API，v1（仅 Chrome）下无需单独安装 `webextension-polyfill`。置信度：高                                                                                                                         |

### 配套库

| Library                   | Version          | Purpose                                                                                                                   | When to Use                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **@wxt-dev/i18n**         | `^0.2.5`         | 对 `chrome.i18n.getMessage` 的类型化封装，从单一来源文件生成 `_locales/{lang}/messages.json` + `wxt-i18n-structure.d.ts`  | PROJECT.md "i18n 国际化：至少支持 zh / en" 强制要求。同步加载、无额外打包体积，类型化键名可在编译期捕获缺失翻译。优先于 i18next。置信度：高                                                                                                                        |
| **@mozilla/readability**  | `^0.6.0`         | 从当前活动标签页的 DOM 中抽取主要文章的 `title`、`content`、`excerpt`、`byline`、`publishedTime`                          | 成熟、零依赖、由 Mozilla 维护，算法与 Firefox Reader View 一致。在 content script 中针对 `document.cloneNode(true)` 运行以保留实时 DOM。置信度：高                                                                                                                 |
| **defuddle**              | `^0.17.0`        | 备选内容抽取器，提供更丰富的元数据（schema.org、favicon、图片、语言）以及站点专用抽取器（YouTube、Reddit、X、HN、GitHub） | 当抽取目标常常涉及更丰富元数据或非文章页面（Reddit 帖子、YouTube 字幕）时，推荐作为 Readability 的**回退 / 配套**方案。它最初是为 Obsidian Web Clipper 创建的 —— 与 Web2Chat 同样的使用场景。在 content script 中使用 `defuddle` 核心 bundle（无依赖）。置信度：高 |
| **DOMPurify**             | `^3.2.0`         | 在存储或为 IM 格式化前对 Readability/Defuddle 输出的 HTML 进行清洗                                                        | 关键：Readability 不做清洗。即便我们从不在 popup 中重新渲染该 HTML，序列化前清洗仍能确保历史数据安全，并避免格式将来切换为 HTML 预览时意外传播脚本。置信度：高                                                                                                     |
| **turndown**              | `^7.2.0`         | 将抽取的 HTML 转换为 Markdown 作为 IM payload                                                                             | OpenClaw 与 Discord 都渲染 Markdown。以 Markdown 形式存储抽取内容可保持 payload 既可读又紧凑。`turndown-plugin-gfm` 增加表格 / 删除线支持。置信度：中（库本身知名度高，但需要锁定版本以验证与 Readability 输出的兼容行为）                                         |
| **WxtStorage (built-in)** | bundled with WXT | 为 `chrome.storage.local` 提供类型化封装，含 `defineItem`、`watch`、`defaultValue`、`migrations`                          | 对所有持久化配置项使用 `storage.defineItem<T>('local:send_to_history', { fallback: [] })`。满足 PROJECT.md "全部配置 ... `chrome.storage.local`" 要求，并便于后续迁移适配器历史。置信度：高                                                                        |
| **zod**                   | `^3.24.0`        | 校验持久化配置以及 popup ↔ background ↔ content script 间的消息 payload                                                   | 适配器契约必须具备防御性 —— content script 运行在外部页面中，必须对入站消息进行校验。Zod schema 同时充当运行时守卫与 TS 类型。置信度：高                                                                                                                           |
| **clsx**                  | `^2.1.1`         | popup 中的条件 className 工具                                                                                             | 体积小、用法符合直觉、零观点。置信度：高                                                                                                                                                                                                                           |
| **tailwindcss**           | `^4.0.0`         | popup 样式                                                                                                                | Tailwind v4（Oxide）原生支持 Vite，零配置。可让 popup CSS 行为可控并限制在 popup HTML 根（content script 使用 Shadow DOM 或不使用 CSS）。置信度：中（Tailwind v4 较新 —— 备选：原生 CSS Modules）                                                                  |

### 开发工具

| Tool                  | Purpose   | Notes                                                                                                                                        |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vitest**            | `^3.2.4`  | 工具代码（URL 解析、历史去重、prompt 绑定逻辑、按 URL 选择适配器）的单元测试                                                                 | WXT 自带 `wxt/testing/vitest-plugin` + `wxt/testing/fake-browser`（内存版 `chrome.storage` / `chrome.runtime`）。使用 `environment: 'happy-dom'`。当前先锁定 Vitest 3.2.x；v4 较新。 |
| **happy-dom**         | `^15.0.0` | Vitest 的 DOM 实现                                                                                                                           | 比 jsdom 更快；足以覆盖 Readability 与 popup 组件测试。                                                                                                                              |
| **Playwright**        | `^1.58.0` | E2E 测试 —— 通过 `chromium.launchPersistentContext` 配合 `--load-extension` 加载 unpacked 扩展，串联 popup → content-script → 目标标签页流程 | 官方推荐的 MV3 测试路径。WXT 文档明确将 E2E 路由到 Playwright，并把构建产物输出到 `.output/chrome-mv3` 用于 `--load-extension`。                                                     |
| **@playwright/test**  | `^1.58.0` | 测试运行器，使用 Playwright 文档推荐的 fixture 模式（`context`、`extensionId` fixture）                                                      | 在面向真实 Discord / OpenClaw 页面或其本地 HTML fixture 进行行为断言时必备。                                                                                                         |
| **eslint**            | `^9.20.0` | 使用 flat config 进行 lint                                                                                                                   | WXT 推荐的 lint 方案为 `@antfu/eslint-config` 或纯 `typescript-eslint`，二选其一。                                                                                                   |
| **typescript-eslint** | `^8.20.0` | 具有 TS 感知能力的 lint 规则                                                                                                                 | 保持启用 `no-floating-promises` —— 扩展中的异步路径很容易泄漏。                                                                                                                      |
| **prettier**          | `^3.4.0`  | 格式化                                                                                                                                       | 使用默认配置；通过 `eslint-config-prettier` 与 eslint 集成。                                                                                                                         |
| **web-ext**           | `^8.5.0`  | （可选）用于 lint manifest，并在 v2 引入 Firefox 时对 Firefox 构建签名                                                                       | v1（仅 Chrome）不需要，先放进延期的 Firefox 移植路线图备忘录。                                                                                                                       |

---

## 安装

```bash
# Scaffold
pnpm dlx wxt@latest init web2chat -t preact-ts
cd web2chat

# Core (WXT pulls Vite/Preact/TS in via the template)
pnpm add @wxt-dev/i18n @preact/signals
pnpm add @mozilla/readability defuddle dompurify turndown turndown-plugin-gfm
pnpm add zod clsx

# Dev
pnpm add -D vitest happy-dom @playwright/test
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add -D eslint typescript-eslint prettier eslint-config-prettier
pnpm add -D @types/dompurify @types/turndown
```

安装完成后，运行 `pnpm wxt prepare` 以生成 `.wxt/` 类型与 `wxt-i18n-structure.d.ts`。

---

## 技术栈接线说明（Web2Chat 专属）

### MV3 Entrypoints（WXT 文件约定）

```
entrypoints/
  background.ts               # service worker — message broker between popup and content scripts
  popup/
    index.html
    main.tsx                  # Preact mount point
  content-scripts/
    extract.content.ts        # runs on the SOURCE tab (host_permissions ['<all_urls>']) → Readability/Defuddle
    discord.content.ts        # matches: ['https://discord.com/channels/*'] → Slate adapter
    openclaw.content.ts       # matches: ['http://localhost:18789/chat*'] → injects into OpenClaw input
```

### 向 React 编辑器（Slate / Lexical / contenteditable）注入 content script

对 Discord 适配器至关重要 —— 不能使用 `innerText = ...`，因为 Slate 的状态保存在 React 中而非 DOM。

**必需模式：**

1. 聚焦编辑器元素
2. 将 `Selection`/`Range` 设置到光标位置
3. 派发一个真实的 `InputEvent`，`inputType: 'insertText'` + `data`（Slate 的 `onDOMBeforeInput` 仅识别原生 InputEvent 实例）
4. 对粘贴式插入（多行 payload 推荐方式），派发携带已填充 `DataTransfer` 的 `ClipboardEvent('paste')` —— Lexical 的粘贴处理器明确检查 `event.clipboardData`
5. 然后派发合成的 `KeyboardEvent('keydown', { key: 'Enter', ... })` 触发发送（Discord），或点击平台的发送按钮

该模式应进入共享的 `packages/dom-injector/` 模块 —— 每个 IM 适配器都会调用它。

### i18n 边界（依据 PROJECT.md 约束 "禁止硬编码字符串"）

- 真值来源：`locales/en.yml`、`locales/zh_CN.yml`（YAML —— `@wxt-dev/i18n` 支持）
- 生成产物：`public/_locales/{lang}/messages.json` + `wxt-i18n-structure.d.ts`（在 `wxt prepare` 时重新生成）
- manifest 字段使用 `__MSG_extName__` 语法；popup 代码使用 `i18n.t('extName')` 并具备完整类型安全
- ESLint 规则：禁止 JSX children 中匹配 `/[一-龥]|[A-Z][a-z]+ [A-Z]/` 的字符串字面量（自定义规则或 `eslint-plugin-i18n-keys`）

### 存储层

```ts
// shared/storage.ts
import { storage } from "#imports";
export const sendToHistory = storage.defineItem<SendToEntry[]>(
  "local:send_to_history",
  { fallback: [] },
);
export const promptBindings = storage.defineItem<Record<string, string>>(
  "local:prompt_bindings",
  { fallback: {} },
);
export const language = storage.defineItem<"en" | "zh_CN">("local:language", {
  fallback: "en",
});
```

所有持久化状态都通过 `defineItem` 流转，适配器永不直接接触原始 `chrome.storage.local`。

---

## 已考虑的备选方案

| Recommended                           | Alternative                            | When to Use Alternative                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WXT**                               | **CRXJS Vite plugin**                  | 当你想手写 `manifest.json` 并自掌文件结构时。CRXJS 是更薄的一层 —— 适合对扩展布局已有强烈主张的人。WXT 帮你做的更多。                                                                   |
| **WXT**                               | **Plasmo**                             | 2026 年的新项目应避开。Plasmo 使用 Parcel（HMR 更慢、插件生态更小），且其维护节奏相对 WXT 已放缓。仅当你确实需要 Plasmo 的"React 组件即 content UI"工效，且能接受 Parcel 包袱时才选它。 |
| **WXT**                               | **手搓 Vite + manifest.json**          | 不要这么做。你将不得不重新实现 content script HMR、manifest 生成与跨浏览器 polyfill，得不到任何收益。                                                                                   |
| **Preact**                            | **React 19**                           | 仅当你需要某个 React-19 专属库时使用（如 `use()` hook、server components —— 本项目都不适用）。React 比 Preact 多 ~30 KB gz。popup 性能预算不允许。                                      |
| **Preact**                            | **Svelte 5**                           | Svelte 5 配合 runes 表现优异，在某些场景下打包体积小于 Preact。仅当团队已熟悉 Svelte 时选用。WXT 支持它（`-t svelte`）。默认选择 Preact 是因为 React 生态的图标 / 组件库更丰富。        |
| **Preact**                            | **原生 TS + lit-html**                 | 在极端 bundle 预算（popup <20 KB）下可行。会给带历史 / prompt 表单的多屏 popup 带来摩擦。                                                                                               |
| **@wxt-dev/i18n**                     | **i18next 26.x**                       | 仅在 `@wxt-dev/i18n` 尚未补齐复数形式（如阿拉伯语 few/many）之前你就需要这些功能时选用。代价：i18next 把数据打入 popup bundle，无法本地化 manifest 字段，并需要异步初始化。             |
| **@mozilla/readability**              | **defuddle（单独使用）**               | Defuddle 容错更好且自带更丰富元数据。如果 MVP 测试页面集中在 Reddit / YouTube / X，可作为主抽取器。两者并行运行成本低 —— Readability 用于"文章"模式，Defuddle 用于"页面"模式。          |
| **@mozilla/readability**              | **postlight/parser (Mercury Parser)**  | 基本停止维护，需要 Node 风格的 fetch。不要用。                                                                                                                                          |
| **WxtStorage (`storage.defineItem`)** | **@webext-core/storage**               | 等价的类型化封装，但未与 WXT 一同发布。仅在非 WXT 项目中使用。                                                                                                                          |
| **WxtStorage**                        | **Zustand (`charltoons/wxt-zustand`)** | 当 popup 状态扩张到需要跨标签页同步与多窗口响应式订阅时使用。对 v1 来说过度设计。                                                                                                       |
| **Vitest + Playwright**               | **Jest + Puppeteer**                   | 不要这么做。Jest 与 Vite/ESM 兼容性较差；Puppeteer 在 MV3 扩展上的表现落后于 Playwright。                                                                                               |

---

## 不要使用

| Avoid                                                                    | Why                                                                                                                                                  | Use Instead                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Manifest V2** (`"manifest_version": 2`)                                | 已在 2024 年中从 Chrome Stable 中移除。无法通过 Web Store 审核。                                                                                     | MV3 —— `service_worker` background、`chrome.action`、`chrome.scripting.executeScript`                                                                                                         |
| **持久后台页面** (`"background": { "page": "...", "persistent": true }`) | 仅 MV2；MV3 中不存在。                                                                                                                               | MV3 service worker（`background.service_worker`）—— 非持久，被设计为按事件唤醒。周期性任务使用 `chrome.alarms`，永远不要用 `setInterval`。                                                    |
| **`chrome.tabs.executeScript`**（MV2 API）                               | 已废弃。                                                                                                                                             | `chrome.scripting.executeScript({ target: { tabId }, func / files })`（MV3）—— 通过 WXT 的 `injectScript` helper 暴露。                                                                       |
| **`chrome.extension.getBackgroundPage()`**                               | MV3 service worker 没有持久化全局对象；该调用返回 `null`。                                                                                           | 通过 `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` 传递消息，或将 `chrome.storage.local` 作为真值来源。                                                                           |
| **`webextension-polyfill`（npm 包，手动安装）** 用于仅 Chrome 的 v1      | 为一个 WXT 已通过 `@wxt-dev/browser` 解决的问题增加运行时 + 包体。同时存在已知限制（`tabs.executeScript` 在 Chrome 上对 Promise 返回 `undefined`）。 | `@wxt-dev/browser` —— 由 WXT 间接安装。在 v2 引入 Firefox 时再重新评估 `webextension-polyfill`。                                                                                              |
| **Plasmo Framework**                                                     | 基于 Parcel，HMR 更慢、插件生态更小、维护放缓。在 2025–2026 框架对比中被记录为相对 WXT/CRXJS 累积技术债。                                            | WXT                                                                                                                                                                                           |
| **`postlight/parser` (Mercury)**                                         | 维护基本停滞，基于 Node fetch，不适合 content-script DOM 抽取场景。                                                                                  | Readability + Defuddle                                                                                                                                                                        |
| **`element.innerText = "..."` 注入到 Slate / Lexical / Discord 输入框**  | 绕过 React 的受控组件模型；编辑器内部状态保持为空、发送按钮一直禁用、Ctrl-Z 失效。                                                                   | 在聚焦并设置 Selection 后派发真实 `InputEvent({ inputType: 'insertText', data })`。多行情况下，派发携带 `DataTransfer` 的 `ClipboardEvent('paste')`。详见上文"Content-Script Injection"章节。 |
| **`document.execCommand('insertText', ...)`** 作为唯一机制               | 已废弃，在不同 React 编辑器中行为不一致，可能随时失效。                                                                                              | 仅作为某个平台 InputEvent 派发失败时的*回退*，不要作为主路径。                                                                                                                                |
| **从 popup 向 Discord/OpenClaw 窗口发送 `postMessage`** 触发发送         | 同源策略 + Discord 的 CSP 会阻止。popup 是 `chrome-extension://`，IM 会话是 `discord.com`。                                                          | 在目标 origin 注册 content script，并在打开 / 激活标签页后从 background 使用 `chrome.tabs.sendMessage`。                                                                                      |
| **将配置存入 `localStorage`**（popup origin）                            | 每扩展级别的 `localStorage` 可用，但无法在 popup/background/content-script 上下文间同步，且没有 `watch()` API。                                      | 仅使用 `chrome.storage.local`，通过 `storage.defineItem` 访问。                                                                                                                               |
| **i18next + `react-i18next` 用于 popup**                                 | 异步初始化、bundle 更大、无法本地化 `manifest.json` 字段，且与 `chrome.i18n` 重复。                                                                  | `@wxt-dev/i18n`                                                                                                                                                                               |
| **content script 中使用 `postlight/parser` + jsdom**                     | jsdom 是 Node 模块，在浏览器环境无法运行；如果硬塞会引入 ~3 MB bundle。                                                                              | 直接使用实时 `document` 配合 Readability/Defuddle（两者都以浏览器为先）。                                                                                                                     |
| **针对 IM 平台使用 `chrome.identity` / OAuth**                           | 超出 PROJECT.md 范围（"不使用平台官方 Bot API"）。                                                                                                   | 通过标签页注入策略完全规避了 token。                                                                                                                                                          |

---

## 按变体分类的技术栈模式

**如果目标 IM 使用 Slate（Discord）：**

- 在 contentEditable 根元素上派发 `InputEvent('beforeinput', { inputType: 'insertText', data })`，再派发 `InputEvent('input', ...)`
- 多段落内容优先使用 `ClipboardEvent('paste')` 配合 `DataTransfer.setData('text/plain', ...)`
- 等待 `[data-slate-editor="true"]` 出现（SPA 导航）—— 使用 `MutationObserver`，不要使用 `setTimeout`

**如果目标 IM 使用 Lexical（Meta 系应用，可能在 v2 平台中出现）：**

- 同样使用 `InputEvent` 模式，但 Lexical 的粘贴路径*要求* `event.clipboardData` 必须是真实 `DataTransfer`（不可为 null）→ Lexical 始终使用 ClipboardEvent
- 选择器：`[contenteditable="true"][data-lexical-editor="true"]`

**如果目标 IM 使用普通 `<textarea>` 或 `<input>`（OpenClaw —— 概率很大）：**

- 设置 `.value`，再派发 `Event('input', { bubbles: true })`，让 React 的 `onChange` 触发
- 对受 React 控制的输入框，先用 `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, text)` 再派发，否则 React 的 tracker 会吞掉变更

**如果 MVP 范围扩展到 Firefox（按 PROJECT.md 延期）：**

- WXT 已能从同一份源码处理 MV2/MV3 + Chrome/Firefox 构建；只有当非 WXT helper 需要时再加入 `webextension-polyfill`
- 加入 `web-ext` 用于 Firefox AMO 签名

**如果 popup 增长到 ~5 屏以上：**

- 加入路由 —— 选 `wouter`（~1 KB，hooks API，兼容 Preact）而非 `preact-iso`。跳过 React Router（过重）。

---

## 版本兼容性

| Package A                     | Compatible With                                                           | Notes                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `wxt@^0.20.25`                | `vite@^7`, `typescript@^5.6`, `node@>=20.19`                              | WXT pre-1.0：minor (0.X.0) 升级可能 break —— 锁 caret-minor 而非 caret-major。                                 |
| `@wxt-dev/i18n@^0.2.5`        | `wxt@^0.20.0`                                                             | 通过 `wxt prepare` 生成类型；作为 WXT 模块集成。                                                               |
| `@mozilla/readability@^0.6.0` | Browser DOM, jsdom, happy-dom                                             | 传入 `document.cloneNode(true)` —— `parse()` 会改写树。使用 DOMPurify 清洗输出。                               |
| `defuddle@^0.17.0`            | Browser, Node 20+ via `defuddle/node` (linkedom now preferred over jsdom) | 在 content script 中使用 `defuddle` 浏览器 bundle —— 零依赖。                                                  |
| `preact@^10.29`               | `@preact/signals@^2`, `@preact/preset-vite`                               | Preact 11 beta 已存在但截至 2026 年 4 月尚未达到生产可用 —— 留在 10.x。应用 2026 年 1 月安全补丁（10.28.2+）。 |
| `vitest@^3.2.4`               | `wxt/testing/vitest-plugin`, `happy-dom@^15`                              | Vitest 4 较新 —— 等一个版本周期再升级。                                                                        |
| `@playwright/test@^1.58`      | Chromium channel via `chromium.launchPersistentContext`                   | `--load-extension` 需要带头 Chromium；不能在 headless 模式下运行。                                             |
| `tailwindcss@^4`              | `@tailwindcss/vite`, Vite 7                                               | v4 的 Oxide 引擎放弃了 postcss 插件路径。不要混用 v3 + v4 配置。                                               |

---

## 信息来源

### Context7（过去 30 天内核验）

- `/wxt-dev/wxt` —— WXT entrypoints、background、content scripts、storage、i18n、testing（Vitest 插件 + Playwright E2E 指南）
- `/websites/wxt_dev` —— `@wxt-dev/i18n` 类型化翻译 API，版本说明
- `/crxjs/chrome-extension-tools` —— CRXJS Vite 插件 manifest 模式，content-script `world: 'MAIN' | 'ISOLATED'`
- `/mozilla/readability` —— `Readability(document).parse()` API 表面与返回结构
- `/kepano/defuddle` —— Defuddle 解析 API、浏览器 / Node bundle、元数据字段
- `/mozilla/webextension-polyfill` —— 已知 Chrome 限制（`tabs.executeScript` 的 Promise 处理）
- `/microsoft/playwright` —— `chromium.launchPersistentContext` + `--load-extension` MV3 fixture 模式，service worker 发现以获取 `extensionId`
- `/preactjs/preact` —— Preact 10 hooks API + signals 集成
- `/i18next/i18next` —— 作为不推荐备选方案的背景资料
- `/facebook/lexical` —— 编辑器架构（状态驱动，粘贴处理器依赖 `ClipboardEvent.clipboardData`）

### 官方文档

- [Chrome MV3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate) —— service worker 要求、已废弃 API（用于核验"不要使用"清单）
- [WXT — Next-gen Web Extension Framework](https://wxt.dev/) —— 主要框架文档
- [WXT i18n module](https://wxt.dev/i18n) —— `@wxt-dev/i18n` 集成
- [Playwright — Chrome Extensions](https://playwright.dev/docs/chrome-extensions) —— `launchPersistentContext` MV3 fixture 模式

### npm 注册表（版本核验时间 2026-04）

- [`wxt`](https://www.npmjs.com/package/wxt) —— 0.20.25，调研时 <1 天前发布
- [`@wxt-dev/browser`](https://www.npmjs.com/package/@wxt-dev/browser) —— 0.1.40，约 12 天前
- [`@wxt-dev/i18n`](https://www.npmjs.com/package/@wxt-dev/i18n) —— 0.2.5
- [`@mozilla/readability`](https://www.npmjs.com/package/@mozilla/readability) —— 0.6.0
- [`defuddle`](https://www.npmjs.com/package/defuddle) —— 0.17.0，<1 天前发布
- [`preact`](https://www.npmjs.com/package/preact) —— 10.29.1；已应用 2026 年 1 月安全补丁（10.28.2+）
- [`@types/chrome`](https://www.npmjs.com/package/@types/chrome) —— 0.1.40
- [`i18next`](https://www.npmjs.com/package/i18next) —— 26.0.8（备选）
- [`vitest`](https://www.npmjs.com/package/vitest) —— 3.2.4（4.0.7 也已发布）
- [`playwright`](https://www.npmjs.com/package/playwright) —— 1.58.2

### WebSearch（交叉核验；框架对比类断言为中等置信度，版本号为高置信度）

- [The 2025 State of Browser Extension Frameworks (Plasmo vs WXT vs CRXJS)](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/) —— 确立 WXT 为 2026 领跑者
- [Building AI-Powered Browser Extensions With WXT (Marmelab, 2025-04)](https://marmelab.com/blog/2025/04/15/browser-extension-form-ai-wxt.html)
- [What's New in Preact for 2026](https://blog.openreplay.com/whats-new-preact-2026/) —— Preact 10 vs 11 beta 现状
- [Slate.js Editable docs](https://docs.slatejs.org/libraries/slate-react/editable) + [Slate issue #5603 (`onInput` not fired at offset 0)](https://github.com/ianstormtaylor/slate/issues/5603) —— 确认 Slate（Discord）需要原生 InputEvent
- [Lexical issue #4595 (keyboard events not registering)](https://github.com/facebook/lexical/issues/4595) —— 确认 Lexical 粘贴需要 ClipboardEvent + DataTransfer 模式

---

## 置信度汇总

| Recommendation                                          | Confidence | Rationale                                                                                |
| ------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------- |
| 选择 WXT 作为框架                                       | **高**     | 已通过 Context7 + npm + 多篇 2025–2026 框架对比文章核验                                  |
| popup 使用 Preact 10.x                                  | **高**     | 版本 + 安全补丁已在 npm 与 Preact 自身的 2026 changelog 中核验                           |
| 选择 `@wxt-dev/i18n` 而非 i18next                       | **高**     | WXT 官方推荐，唯一能本地化 manifest + CSS 且无需异步初始化的方案                         |
| `@mozilla/readability` + `defuddle` 双抽取              | **高**     | 两者均为当前版本；Defuddle 正是为相同场景（Obsidian Web Clipper）创建                    |
| Slate/Lexical 注入使用 InputEvent + ClipboardEvent 派发 | **高**     | 通过 Slate 源码、Lexical 源码、GitHub issue 与编辑器框架对比文章交叉核验                 |
| Vitest + WxtVitest 插件 + Playwright fixture            | **高**     | WXT 官方文档 + Playwright 官方文档                                                       |
| popup 使用 Tailwind v4                                  | **中**     | v4 较新（2025）；回退到原生 CSS Modules 是安全备选                                       |
| 使用 Turndown 实现 HTML→Markdown                        | **中**     | 库本身成熟，但提交前需验证 Readability HTML 的输出质量                                   |
| v1 不要使用 `webextension-polyfill`                     | **高**     | WXT 已捆绑 `@wxt-dev/browser`，在仅 Chrome 构建中替代它；polyfill 在 Chrome 上有已知限制 |
| 新项目不要使用 Plasmo                                   | **中-高**  | 多篇 2025–2026 对比文章意见趋同；Plasmo 并非不安全，只是势头下降                         |

---

_Stack research for: Chrome MV3 Web Clipper extension with content-script DOM injection into third-party IM web UIs_
_Researched: 2026-04-28_
