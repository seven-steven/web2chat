# 项目调研总结 (Project Research Summary)

**项目：** Web2Chat
**领域：** Chrome MV3 网页剪藏 + 多 IM 投递自动化
**调研时间：** 2026-04-28
**置信度：** 高

## 摘要 (Executive Summary)

Web2Chat 是一款 Chrome MV3 扩展，它抓取结构化的页面元数据，并将其与用户自定义的 prompt 组合后，通过 content script 的 DOM 注入投递到 IM 或 AI-Agent 的聊天会话中。该品类已有成熟的实现模式（Mozilla Readability 用于内容抽取、WXT 用于 MV3 脚手架、Preact 用于轻量级 popup UI），但投递这一半是任何现有剪藏类工具都未曾做到的：Web2Chat 的动词不是"保存到知识库"，而是"投递到一个会话"。`send_to` ↔ `prompt` 的绑定——切换目标时自动切换关联 prompt——是其 UX 护城河，没有任何竞品实现了这一点。

推荐方案：WXT 0.20.x 作为扩展框架（Vite 原生、MV3 优先、类型化 i18n、内建 storage），Preact 用于 popup，`@mozilla/readability` 用于内容抽取，加上一个强类型的 `IMAdapter` 接口，由按平台拆分的 content script bundle 支撑——它们仅在投递时被程序化注入。service worker 充当唯一的特权枢纽——popup 与 content script 之间从不直接通信。所有状态都存放在 `chrome.storage.local`（或在投递生命周期进行中时使用 `.session`）；任何模块作用域里的内容都不能在 SW 重启后存活。

主要风险有：(1) 在加载缓慢的 SPA 标签页中，SW 可能在投递中途死亡；(2) React 受控或 Lexical/Slate 编辑器会静默丢弃注入的文本；(3) 因过宽的 `host_permissions` 被 Chrome Web Store 拒绝。这三者都有充分文档化的缓解方案，必须从第 1 阶段就嵌入，而非事后补救。

---

## 关键发现 (Key Findings)

### 推荐技术栈 (Recommended Stack)

WXT 是 2026 年 MV3 开发的明确首选。它生成 manifest，为所有入口点提供 HMR，附带类型化的 storage 与 i18n 层，并具备一流的 Playwright E2E 测试集成。Preact 让 popup 保持在约 100 KB 预算之下（4 KB 运行时 vs React 的约 30 KB）。`@wxt-dev/i18n` 是必备项：它是唯一能本地化 `manifest.json` 字段、生成类型化消息键、且无需异步初始化的方案。

**核心技术栈：**

- `wxt@^0.20.25` — 扩展框架（manifest 生成、HMR、storage、i18n、Playwright 配线）
- `vite@^7` (传递依赖) — 打包器；不要直接安装
- `typescript@^5.6` — 类型化的适配器契约；WXT 自动生成 `.wxt/` 类型
- `preact@^10.29.1` + `@preact/signals@^2` — popup UI 与响应式状态；4 KB 运行时
- `@wxt-dev/i18n@^0.2.5` — 类型化的 `chrome.i18n` 包装；优先于 i18next（后者无法本地化 manifest 字段）
- `@mozilla/readability@^0.6.0` — 主内容抽取；传入 `document.cloneNode(true)`，绝不传 live document
- `defuddle@^0.17.0` — 用于非文章页面（Reddit、YouTube、GitHub）的补充抽取器；浏览器 bundle 中零依赖
- `dompurify@^3.2.0` — 在存储前对 Readability/Defuddle 输出做净化；Readability 本身不做净化
- `turndown@^7.2.0` + `turndown-plugin-gfm` — HTML 转 Markdown 用于 IM payload
- `zod@^3.24.0` — 对所有跨上下文消息 payload 做运行时校验
- `WxtStorage` (内置) — 类型化的 `chrome.storage.local` 包装；使用 `storage.defineItem<T>`
- `vitest@^3.2.4` + `happy-dom@^15` — 单元测试；WXT 附带 `wxt/testing/fake-browser`
- `@playwright/test@^1.58.0` — 通过 `chromium.launchPersistentContext + --load-extension` 进行 E2E 测试
- `tailwindcss@^4` — popup 样式（置信度：中；安全回退是原生 CSS modules）

**不要使用：** Plasmo（基于 Parcel，速度慢）、`webextension-polyfill`（WXT 已捆绑 `@wxt-dev/browser`）、`i18next`（异步初始化、无法本地化 manifest）、用于编辑器注入的 `innerText=` 或 `document.execCommand`、`<all_urls>` host 权限、popup 中的 `localStorage`。

### 预期功能 (Expected Features)

**必备项 — 基本款（v1.0）：**

- 点击弹出 popup 并预览元数据：通过 Readability 得到 `title`、`url`、`description`、`create_at`、`content`
- `send_to` 输入框，按 URL 模式识别并显示平台图标（适配器注册表，而非硬编码 if/else）
- `send_to` 历史记录的 MRU 自动补全下拉框（混合"最近 + 频次"排序）
- `prompt` 输入框，独立的历史自动补全
- `send_to` ↔ `prompt` 绑定：切换目标时自动切换 prompt
- OpenClaw 适配器：`http://localhost:18789/chat?session=agent:<a>:<s>`（普通 input 注入）
- Discord 适配器：`https://discord.com/channels/<g>/<c>`（Slate/React 受控编辑器）
- 投递确认与优雅失败：`canDispatch` 探测、错误原因、重试按钮
- 键盘快捷键（`commands` API，用户可重新绑定）
- i18n：从第一天起支持 `en` + `zh_CN`（`@wxt-dev/i18n`，无任何硬编码字符串）
- 所有状态存于 `chrome.storage.local`，并带 schema 版本号

**应有项 — 差异化（验证后的 v1.x）：**

- 按目的地的消息模板，支持 `{{title}}`、`{{url}}`、`{{content}}`、`{{prompt}}` 变量
- 投递失败时的队列 + 重试（持久化到 `chrome.storage.local`，由 `chrome.alarms` 唤醒）
- 多目标分发（顺序、最多 5 个、每两次发送之间间隔 ≥1.5 秒——避开 Discord 的限流防护）
- 页面区域剪藏（选区 + 元素选择器）
- 历史批量导出（JSON / Markdown blob 下载）
- 诊断页面（"为什么没发送出去？"——按每次投递呈现结构化错误码）
- 按检测到的页面类型给出智能 prompt 建议（Schema.org `@type` + URL 启发式，全部本地完成）

**推迟到 v2+：**

- Tier-A IM 平台（已确认可 DOM 注入）：Telegram Web、Slack（Quill 编辑器）、Zalo
- Tier-B IM 平台（尽力而为 / 易碎）：Microsoft Teams、Google Chat、Feishu/Lark、Nextcloud Talk
- 仅深链平台：WhatsApp（`https://wa.me/...?text=`——DOM 注入存在被封风险）、LINE（无真正的 web 客户端）
- 不支持（需说明原因）：Signal（设计上无 web 客户端）、WeCom（web 已废弃）、QQ（无 web 聊天）
- 用于社区贡献平台的适配器 SDK
- Firefox/Edge 移植（在完成 WebExtension 兼容性审计之后）
- 自定义模板编辑器 UI、历史搜索、配置导入/导出

**反功能（明确的非目标）：**

- 云同步 / 用户账号 — 本地优先是隐私定位
- 扩展内的 AI 摘要 — 这是下游 Agent 的工作
- 服务端 Bot API / OAuth token 管理 — 永远不要后端
- OCR / 图片附件抽取 — 最早 v2 才考虑
- RSS / 定时剪藏 — 超出范围，属于不同的产品品类
- 向联系人 CSV 批量广播 — 垃圾信息风险，被 Web Store 下架风险

### 架构方案 (Architecture Approach)

架构是单枢纽 service worker 充当特权协调者，负责两条流水线：(1) 抓取（popup → SW → `executeScript(extractor)` → `ArticleSnapshot`）和 (2) 投递（popup → SW → 打开/激活 tab → 等待 `onUpdated: complete` → `executeScript(adapter)` → `tabs.sendMessage` → 组合并发送 → 返回结果）。popup 是 `chrome.storage.local` 之上的薄视图——它不持有任何必须在关闭后存活的状态。content script 在投递时程序化注入（不在 `content_scripts` 中声明），让每个适配器保持隔离，并使 `host_permissions` 保持窄范围。

**IMAdapter 契约（规范的 TypeScript 接口）：**

```ts
export interface IMAdapter {
  readonly id: PlatformId;
  match(url: string): boolean;
  waitForReady(timeoutMs?: number): Promise<void>;
  compose(message: string): Promise<void>;
  send(): Promise<void>;
}
```

**主要组件：**

1. `background/service-worker.ts` — 仅做顶层监听器注册；所有异步工作放在 handler 内部
2. `background/capture-pipeline.ts` — 编排抽取器注入与快照返回
3. `background/dispatch-pipeline.ts` — tab 打开/激活、`onUpdated` 等待、适配器注入、结果转发；使用 `chrome.storage.session` 在 SW 重启后存活
4. `background/adapter-registry.ts` — `{ id, match(url), scriptFile, hostMatches }` 数组；SW 永远不直接 import 适配器 bundle
5. `content/extractor.ts` — 注入到源 tab 的独立 IIFE；在 `document.cloneNode(true)` 上运行 Readability
6. `content/adapters/<platform>.ts` — 每个平台一个 bundle，实现 `IMAdapter`；仅在投递时注入
7. `shared/` — 纯 TS 类型、类型化消息包装、storage 仓库、`t()` i18n 门面；模块顶层不出现 `chrome.*`
8. `popup/` — Preact SPA；通过 `onChanged` 从 storage 读取，通过 RPC 调用 SW 进行抓取和投递

**权限（v1）：** `activeTab` + `scripting` + `storage` + 每个适配器精确的 `host_permissions`。绝不使用 `<all_urls>`。

### Top 5 陷阱 (Top 5 Pitfalls)

1. **React 受控 input 的 setter** — `input.value =` 不会触发任何 `onChange`。预防方法：使用 `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text)`，然后派发 `new Event('input', { bubbles: true })`。把它放进每个适配器都使用的共享 `dom-injector` helper。

2. **Lexical/Slate 编辑器忽略 DOM 变更（Discord）** — 直接对 `textContent` 赋值会被 reconcile 掉。预防方法：派发 `new ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })`，并通过 `dt.setData('text/plain', text)` 设置内容。在宣告 compose 完成之前，通过 `MutationObserver` 验证注入在一个 rAF tick 之后仍然存在。永远不要只信任单一手段——级联使用 paste → InputEvent → main-world 桥接。

3. **service worker 在投递中途死亡** — SW 在约 30 秒空闲后会终止；进行中的闭包随之消失。预防方法：在打开 tab 之前，将投递 payload 以 `tabId` 为键写入 `chrome.storage.session`。每次 SW 唤醒都在模块顶层重新注册所有监听器。延迟工作使用 `chrome.alarms`，绝不使用 `setInterval`。

4. **SW 中的顶层 `await`** — 在 MV3 SW 中被禁用；会导致静默注册失败或在第一次事件时出现竞态。预防方法：每次唤醒都把 SW 视为无状态；在 handler 内部从 storage 读取，而不是在模块作用域；将共享初始化包在一个 memoize 的 `getReady()` 后面，并在每个监听器函数体中 await。

5. **Discord 上的 SPA 路由竞态** — `chrome.tabs.onUpdated` 不会为 `history.pushState` 导航触发；适配器在频道状态就绪之前就注入了。预防方法：`waitForReady` 必须通过 `MutationObserver` 等待一个频道特定的锚点（例如 `[data-list-id="chat-messages-<channelId>"]`），而不是仅仅等输入框元素。使用 `chrome.webNavigation.onHistoryStateUpdated` 来检测 SPA 跳转。

**附加 — Web Store 拒绝** — `<all_urls>`、缺失隐私政策、或任何远程代码路径都会触发拒审。预防方法：抓取使用 `activeTab` + 每个适配器显式的 `host_permissions` + 从第一天起的隐私政策（声明仅在本地抓取页面 URL/标题/描述/正文，仅通过用户选择的直接导航发送到 IM，不做其他传输）。

---

## 对路线图的影响 (Implications for Roadmap)

### 阶段 1：扩展骨架 (Extension Skeleton)

**理由：** 一切都依赖正确连线的 MV3 骨架。SW 生命周期陷阱（陷阱 3、4）必须在任何功能代码堆叠在其上之前就设计规避；事后修复需要重写每一个监听器注册点。
**交付：** WXT 脚手架、带 `activeTab + scripting + storage` 的 manifest、顶层监听器注册模式、类型化消息协议、storage schema v1、配置好 `en` + `zh_CN` 的 `@wxt-dev/i18n`、能成功通过 RPC 调用 SW 并从 storage 回读的 popup hello-world。
**规避：** 陷阱 4（顶层 await）、陷阱 9（过宽权限）、陷阱 11（i18n 后期改造）。

### 阶段 2：抓取流水线 (Capture Pipeline)

**理由：** 核心价值的"popup 显示页面"那一半必须能独立交付且可独立测试，然后再去构建投递。Readability 抽取与 OG/Schema.org 元数据解析风险低、文档充分，并且可以验证 popup ↔ SW ↔ content script 的消息链路。
**交付：** `content/extractor.ts`（Readability + DOMPurify + Turndown）、`capture-pipeline.ts`、popup 元数据预览（含 `title / url / description / create_at / content`）、抽取逻辑的 Vitest 单元测试。
**使用：** `@mozilla/readability`、`defuddle`、`dompurify`、`turndown`。

### 阶段 3：投递核心 + Popup UI (Dispatch Core + Popup UI)

**理由：** 投递流水线与 popup 表单互相依赖：popup 发送投递 RPC；投递流水线必须处理 tab 打开/激活、可在 SW 重启后存活的状态、幂等性、登录墙检测以及优雅失败。同时构建 popup 的 `send_to` + `prompt` 表单可以锁定基于 storage 的草稿持久化模式（陷阱 10）以及 `send_to` ↔ `prompt` 绑定（核心价值）。
**交付：** 带有 `chrome.storage.session` 状态机和幂等键的 `dispatch-pipeline.ts`、`adapter-registry.ts`、`SendForm` + `HistoryDropdown` + `PromptPicker` 组件、通过 `@preact/signals` 实现的 `send_to` ↔ `prompt` 绑定、popup 重新打开时基于 storage 的草稿恢复、工具栏图标上的投递生命周期角标。
**规避：** 陷阱 3（SW 死亡）、陷阱 7（登录墙）、陷阱 8（重复发送）、陷阱 10（popup 状态丢失）。

### 阶段 4：OpenClaw 适配器 (OpenClaw Adapter)

**理由：** OpenClaw 是用户自管的，使用普通的 textarea/input，并且有稳定的 URL 模式——是最简单的投递目标。先把它发布出来可以端到端验证完整的"抓取 → 投递 → 确认"链路，然后再去攻克 Discord 的复杂编辑器。它为后续所有适配器奠定选择器层级和 `canDispatch` 探测模式。
**交付：** `content/adapters/openclaw.ts`、`_base.ts` 中的"property-descriptor setter + 冒泡 input 事件"helper、覆盖完整发送链路的 Playwright E2E 测试、带"服务未运行"错误状态的 `canDispatch` 探测。
**调研标记：** 无 — OpenClaw 是用户自管的；URL 模式已记录在 PROJECT.md 中。

### 阶段 5：Discord 适配器 (Discord Adapter)

**理由：** Discord 是 MVP 中最难的目标（Slate 驱动的编辑器、混淆的 class、SPA 路由、登录墙、自助 bot 违反 ToS）。它独占一个阶段，因为它需要 DOM fixture 抓取、合成 paste 验证、以及 SPA 路由变化处理——这些会稀释阶段 4 的关注点。
**交付：** 使用 ClipboardEvent paste 注入的 `content/adapters/discord.ts`、ARIA 优先的选择器层级、SPA `onHistoryStateUpdated` 处理、发送后的 DOM 验证、5 秒硬超时与结构化错误、限流保护（小于 5 秒间隔的请求拒绝）、README 中 Discord 特定的风险披露。
**规避：** 陷阱 2（Lexical/Slate 注入）、陷阱 5（SPA 竞态）、陷阱 6（class 易碎性）、陷阱 12（Discord ToS）。
**调研标记：** Discord 每周发版；适配器选择器在发布前应基于最新 DOM 快照重新验证。

### 阶段 6：打磨、i18n 加固与无障碍 (Polish, i18n Hardening, and Accessibility)

**理由：** i18n 在阶段 1 就已搭建，但所有 UI 文案都必须依据 `__MSG_*__` HTML 限制（陷阱 11）和"无复数规则"约束做一次审计。首次运行引导、错误信息人性化、键盘快捷键冲突检查、popup 布局打磨都属于这一阶段。
**交付：** 基于 JS 的 `data-i18n` 替换 helper、用于运行时 zh↔en 切换的自定义 locale 加载器、禁止 JSX 中硬编码字符串的 ESLint 规则、首次运行引导界面、所有适配器错误码的人类可读错误信息、action-icon 角标状态。

### 阶段 7：分发 (Distribution)

**理由：** Web Store 提交要求 manifest 正确、已发布的隐私政策以及供审核员使用的测试环境——这些都无法在提交后再补救。
**交付：** 本地验证过的打包 `.zip`、隐私政策（声明 URL/标题/描述/正文仅在本地抓取，从不传输）、附带测试服务器凭据的 Web Store 上架信息、manifest 中为未来 v2 平台预留的 `optional_host_permissions`、来自 PITFALLS.md §Pitfall 9 的提交前 checklist。
**规避：** 陷阱 9（Web Store 拒绝）。

### 阶段 8+：v2 平台 (V2 Platforms)

**理由：** 在 MVP 经过验证之后，按顺序加入 Tier-A 平台（Telegram Web、Slack、Zalo）——每个都需要自己的适配器文件、host 权限和 DOM fixture 集合。Tier-B（Teams、Google Chat、Feishu/Lark）在投入之前需要范围明确的调研。
**Slack 编辑器冲突说明：** FEATURES.md 有源代码证据（Slack Markdown Proxy 扩展）表明 Slack 使用 Quill，而非别处所述的 Lexical。按 Quill 来做（在 MAIN world 中调用 `editor.clipboard.dangerouslyPasteHTML` 或 `editor.insertText`）。

### 阶段排序理由 (Phase Ordering Rationale)

- **共享类型与 storage schema 优先** — 每一层都会 import 它们；后期变更 schema 会强迫所有上下文都做迁移代码。
- **i18n 在阶段 1 就接好，而不是事后加装** — 后期改造 i18n 意味着要碰每一个 UI 字符串；PITFALLS.md 与 PROJECT.md 都明确点出了这一点。
- **OpenClaw 先于 Discord** — 在最难的 DOM 目标之前，先用一个友好的目标来验证完整的投递链路。
- **Discord 独占一个阶段** — Slate 注入问题、SPA 竞态以及 ToS 披露三者合在一起足以证明独立化是合理的。
- **分发放最后，但 manifest 从阶段 1 起就要正确** — `host_permissions` 架构必须从第一天就对；哪怕只是临时使用 `<all_urls>` 也会要求对存量用户弹出权限升级提示（卸载率会飙升）。

### 调研标记 (Research Flags)

需要在规划阶段做更深入调研的阶段：

- **阶段 5（Discord 适配器）：** 实施前需基于全新的 Discord DOM 验证当前选择器层级。Discord 每周发版。在规划时刻抓取一份 fixture HTML。
- **阶段 8+ Tier-B（Teams、Google Chat、Feishu/Lark）：** FEATURES.md 中三者都被标为高复杂度；每一个在路线图承诺前都需要专项调研冲刺。

具有标准模式的阶段（可跳过调研阶段）：

- **阶段 1（骨架）：** WXT 脚手架、MV3 manifest、监听器注册——在 WXT 与 Chrome 文档中已有完整文档。
- **阶段 2（抓取）：** Readability + OG 抽取——成熟、文档充分、无未知量。
- **阶段 4（OpenClaw）：** 用户自管的应用；URL 模式已知；普通 input 注入已有文档。
- **阶段 7（分发）：** Chrome Web Store 流程文档充分；按提交前 checklist 走即可。

---

## 置信度评估 (Confidence Assessment)

| Area   | Confidence                   | Notes                                                                                        |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| 技术栈 | 高                           | 所有版本在 30 天内通过 npm 与 Context7 核验；WXT/Preact/Vitest/Playwright 是社区无争议的共识 |
| 功能   | 高 (MVP) / 中 (v2 IM 可行性) | 基本款与差异化项均有充分依据；按平台的 DOM 可行性取决于厂商 DOM 变更                         |
| 架构   | 高                           | Chrome MV3 API 是权威依据；SW 生命周期、消息传递与适配器模式均有官方文档支撑                 |
| 陷阱   | 高                           | 所有关键陷阱均来自官方 Chrome 文档、已核实的 GitHub issue 以及多方独立确认                   |

**总体置信度：** MVP 范围置信度高；v2 IM 平台具体细节置信度中（DOM 契约会漂移）。

### 待解决的缺口 (Gaps to Address)

- **OpenClaw 编辑器类型：** PROJECT.md 写的是"很可能为 contenteditable / textarea"——在阶段 4 规划时通过审视实际 OpenClaw Web UI 源码加以确认。如果是 React 受控 input，应用 property-descriptor setter；如果是普通 textarea，标准的 `.value=` + `Event('input')` 即可。
- **Discord 适配器选择器：** 必须在阶段 5 规划时基于 live 的 Discord DOM 快照重新核验。ARCHITECTURE.md 的 fixture 模式（将 DOM 快照抓取到 `tests/unit/adapters/discord.fixture.html`）是恰当的缓解。
- **Tailwind v4 稳定性：** 置信度中——若在阶段 1 脚手架阶段出现集成问题，可零返工地回退到原生 CSS modules。
- **Slack 编辑器（Quill 还是 Lexical）：** FEATURES.md 中有支持 Quill 的源代码证据（Slack Markdown Proxy）。v2 的 Slack 适配器按 Quill 做。在适配器 README 中注明。

---

## 来源 (Sources)

### 一手来源 (Primary，置信度：高)

- Chrome MV3 官方文档 — service worker 生命周期、消息传递、scripting API、activeTab、storage、i18n
- `/wxt-dev/wxt` (Context7) — entrypoints、storage、i18n、testing 插件
- `/mozilla/readability` (Context7) — parse API、document clone 要求
- `/microsoft/playwright` (Context7) — `launchPersistentContext` MV3 fixture 模式
- `/facebook/lexical` (Context7) — paste handler、ClipboardEvent.clipboardData 要求
- npm registry (2026-04) — 所有锁定包的版本核验

### 二手来源 (Secondary，置信度：中)

- Slate GitHub issues #5603、#5721 — InputEvent 与剪贴板模拟模式
- Slack Markdown Proxy 扩展源码 — 确认 Slack 使用 Quill，而非 Lexical
- 框架对比文章 (2025-2026) — WXT vs Plasmo vs CRXJS 共识
- `defuddle@^0.17.0` (Context7/kepano) — 与 Obsidian Web Clipper 用例对齐

### 三手来源 (Tertiary，依赖具体语境)

- 各 IM 平台可行性评估 — 基于社区扩展与逆向；DOM 契约会漂移，必须每个阶段重新核验

---

_调研完成时间：2026-04-28_
_是否可进入路线图：是_
