# 陷阱研究 — v1.1 多渠道适配 + 投递鲁棒性

**领域：** 为现有 web2chat Chrome MV3 扩展添加多个 IM 平台适配器，同时改善投递链路鲁棒性
**研究日期：** 2026-05-09
**置信度：** HIGH（基于 v1 代码审查 + 多源平台分析）/ MEDIUM（各平台 DOM 细节 — 会随版本漂移）
**前提：** v1.0 已交付 OpenClaw + Discord 两个适配器。本文聚焦于 v1.1 新增适配器时**新增的**风险，不重复 v1 已识别并已防范的通用陷阱（见 `milestones/v1.0-phases/` 归档的 v1 陷阱文档）。

---

## 新增关键陷阱

### 陷阱 N1：假设所有平台都能用同一套注入技术

**问题表现：**
开发者基于 Discord 适配器的经验（ISOLATED world 请求 SW 桥接到 MAIN world 做 ClipboardEvent paste），把同样的模式直接复制到 Slack / Telegram / Feishu 适配器。结果：Slack 的 Quill 编辑器完全忽略合成 paste 事件；Telegram 自定义编辑器的 DataTransfer 在 ISOLATED→MAIN 跨界后变成空。

**原因：**
每个 IM 平台使用不同的富文本编辑器框架，每个框架对合成事件的响应不同：

| 平台 | 编辑器框架 | 注入策略 | 关键差异 |
|------|-----------|---------|---------|
| Discord | Slate（自 fork） | MAIN world ClipboardEvent paste | DataTransfer 必须在 MAIN world 创建；Slate 只读 clipboardData |
| OpenClaw | 原生 `<textarea>` | property-descriptor setter + `input` event | 最简单；直接 DOM 操作即够 |
| Slack | Quill.js | 需要获取 Quill 实例 + `quill.insertText()` API，或 `document.execCommand('insertText')` | Quill 有自己的 Delta 数据模型；合成 paste 事件**不可靠**——Quill 的 clipboard module 会检查是否为原生浏览器事件 |
| Telegram Web K | 自定义 contenteditable | ClipboardEvent paste 或 `document.execCommand('insertText')` | 无第三方框架依赖；但编辑器行为在不同 Web K / Web Z 版本间不一致 |
| Telegram Web Z | 自定义 contenteditable | 同上 | 独立的代码库（Ajaxy/telegram-tt），DOM 结构与 Web K 完全不同 |
| Feishu / Lark | 类 ProseMirror 自研 | 可能需要 MAIN world 桥接 + paste | 飞书有严格的 CSP；编辑器可能检测非用户操作的 DOM 变更 |
| WhatsApp Web | Lexical（Meta） | ClipboardEvent paste（同 Discord 理论可行） | **高风险平台**——WhatsApp 有 Code Verify 功能，会检测非官方扩展的 DOM 修改；账号会被封禁 |
| Microsoft Teams | 自研（基于 Fluent UI + React） | 待研究 | Teams web 版有额外的 Microsoft 身份验证层；编辑器技术栈不公开 |

**如何避免：**
- **不要抽象出单一的"注入策略"。** `_base.ts` 应该提供注入工具函数（paste、setter、execCommand），但每个适配器必须自行选择和组合策略。
- 在适配器文件头注释中**显式记录**该平台的编辑器框架和选用的注入策略。
- `shared/dom-injector.ts` 已经提供了 `setInputValue`（setter 方式），但需要扩展以支持更多模式：
  - `simulatePaste(el, text, world)` — ClipboardEvent paste
  - `execCommandInsertText(el, text)` — `document.execCommand('insertText', false, text)`
  - `insertViaEditorAPI(accessor, text)` — 获取编辑器实例后直接调 API

**预警信号：**
- 适配器在开发环境（固定版本）工作，上线几周后平台更新导致失败。
- 同样的 paste 策略在平台 A 有效，平台 B 完全无效。
- 注入后文本闪现一帧就消失。

**应处理阶段：** 每个新适配器的开发阶段——在写第一行适配器代码前先调研目标平台的编辑器框架。

---

### 陷阱 N2：Slack Quill 编辑器不接受合成 paste —— 需要不同策略

**问题表现：**
Slack 适配器使用 Discord 的 ClipboardEvent paste 策略。Quill 的 clipboard module 确实监听 `paste` 事件，但它内部检查 `e.clipboardData` 是否为浏览器原生对象——合成事件的 `clipboardData` 虽然不为 null，但 Quill 对其读取行为可能与真实 paste 不一致。文本可能注入成功但 Quill 的 Delta 模型不更新，导致发送时消息为空。

**原因：**
Quill.js 维护一个 Delta（操作型 JSON 文档模型）作为真实数据源。DOM 是 Delta 的投影。Quill 的 clipboard module 在 `onPaste` 中读取 `clipboardData` 后会执行 `convert()` + `setContents()` 走自己的管道。如果合成的 `DataTransfer` 在跨 V8 隔离边界后（ISOLATED → MAIN）属性丢失（如 Discord 已发现的），Quill 的 convert 会产出空 Delta。

**如何避免：**
- **策略优先级（Slack 专用）：**
  1. 获取 Quill 实例：`Quill.find(document.querySelector('.ql-editor'))` — 在 MAIN world 执行，直接调用 `quill.insertText(0, text, 'user')`。这是最可靠的路径。
  2. 回退：在 MAIN world 执行 `document.execCommand('insertText', false, text)` — Quill 的 selection module 监听 `selection-change`，execCommand 会触发它。
  3. 最后手段：合成 paste — 仅在前两者都失败时使用，且必须在 MAIN world 创建 DataTransfer。
- Quill 实例获取需要在 MAIN world 中执行（因为 `Quill` 是页面 JS 全局变量），所以 Slack 适配器也需要 MAIN world 桥接。

**预警信号：**
- Slack 编辑器视觉上有文本，但发送按钮未启用。
- Quill 的 `text-change` 事件未触发。
- `quill.getContents()` 返回不含注入文本的 Delta。

**应处理阶段：** Slack 适配器开发——需要独立的编辑器策略调研。

---

### 陷阱 N3：WhatsApp Web 的 Code Verify 和账号封禁风险

**问题表现：**
用户安装 web2chat 后向 WhatsApp Web 投递消息。WhatsApp 的 Code Verify 功能检测到非官方扩展正在修改 WhatsApp Web 的 DOM，弹出警告。更严重的情况：WhatsApp 的机器学习模型标记用户账号为自动化行为，账号被永久封禁。2025 年已有 131 个 Chrome 扩展因自动化 WhatsApp 被标记。

**原因：**
- WhatsApp Web 运行 integrity check（代码完整性验证），检测页面 DOM 是否被非预期修改。
- WhatsApp 的反滥用系统使用 ML 模型，综合考虑消息频率、发送模式、DOM 修改痕迹等。
- WhatsApp 的 ToS 明确禁止通过非官方客户端/工具自动化消息发送。
- WhatsApp 是 E2E 加密客户端，对输入完整性的强制更严格——任何自动化输入都可能被视为安全威胁。

**如何避免：**
- **将 WhatsApp 标记为"高风险/研究性"适配器。** v1.1 如果包含 WhatsApp，必须在 README 和 Web Store listing 中**明确声明风险**。
- 考虑 WhatsApp 适配器作为 **opt-in 功能**：不在默认安装中启用，用户需在选项页主动开启，并确认了解风险。
- **绝不批量发送**（已有的限流机制已覆盖），但 WhatsApp 可能连单次自动注入都检测。
- 替代路径：WhatsApp 的官方 Business API（付费）或 deep link（`https://wa.me/?text=...`）—— 后者不自动发送，只打开带预填文本的聊天窗口。

**预警信号：**
- WhatsApp Web 弹出"检测到非官方浏览器扩展"警告。
- 用户报告使用 web2chat 后 WhatsApp 账号被暂停。
- WhatsApp Web 的 DOM 结构在扩展激活后与不激活时不同（可能检测到 content script 注入）。

**应处理阶段：** WhatsApp 可行性调研阶段——在写任何代码前先做风险评估。如果风险不可接受，WhatsApp 适配器应推迟或改为 deep-link-only 模式。

---

### 陷阱 N4：ISOLATED vs MAIN world 的 DataTransfer 跨界问题（已有但易忽视）

**问题表现：**
新适配器开发者在 ISOLATED world 中创建 `new DataTransfer()` 并 `setData('text/plain', text)`，然后 dispatch ClipboardEvent。粘贴到编辑器后，编辑器读取 `clipboardData` 为 null 或空——DataTransfer 对象在跨 V8 隔离边界时属性丢失。

**原因：**
Chrome 的 content script ISOLATED world 和页面的 MAIN world 运行在不同的 V8 上下文中。它们共享 DOM，但不共享 JS 对象（`window`、原型链、构造函数）。`DataTransfer` 在 ISOLATED world 创建的实例在 MAIN world 的编辑器事件处理器中不可读——这是一个已知的 Chrome 扩展限制。

Discord 适配器已经通过 MAIN world 桥接解决了这个问题（`injectMainWorldPaste` 函数通过 `chrome.runtime.connect` port 请求 SW 在 MAIN world 执行 paste）。**但新适配器开发者可能不了解这个原因，直接复制 ISOLATED world 代码。**

**如何避免：**
- **所有需要 ClipboardEvent paste 的适配器都必须在 MAIN world 中创建 DataTransfer。**
- 将 MAIN world 桥接模式从 Discord 适配器中**提取到共享工具**（`shared/main-world-bridge.ts`），避免每个适配器重复实现。
- 在 `_base.ts` 中提供 `bridgePasteToMainWorld(editor, text): Promise<boolean>` 工具函数。
- 代码审查清单：任何适配器中出现 `new DataTransfer()` 时，确认其执行 world。

**预警信号：**
- 注入的文本包含 "¬" 或乱码字符（Discord v1 调试中已遇到的经典症状）。
- 编辑器的 paste handler 收到事件但 `clipboardData.getData()` 返回空字符串。
- 同样的 paste 代码在 `world: 'MAIN'` 的 `executeScript` 中工作，在 `world: 'ISOLATED'` 中不工作。

**应处理阶段：** 适配器架构重构——在第一个新适配器开发前将 MAIN world 桥接提取为共享工具。

---

### 陷阱 N5：Telegram Web K 与 Web Z 的 DOM 完全不同

**问题表现：**
开发者基于 Telegram Web K（`web.telegram.org/k/`）的 DOM 结构编写适配器，测试通过。但用户实际使用的是 Telegram Web Z（`web.telegram.org/a/`），DOM 结构完全不同，适配器找不到编辑器。或反过来。

**原因：**
Telegram 同时维护两个独立的 web 客户端：
- **Telegram Web K**（`github.com/morethanwords/tweb`）— 基于 Webogram 的社区 fork
- **Telegram Web Z**（`github.com/Ajaxy/telegram-tt`，也称 telegram-tt）— 独立的社区实现

两者使用不同的代码库、不同的 DOM 结构、不同的自定义 contenteditable 编辑器实现。URL 路径模式也不同（`/k/` vs `/a/`）。

**如何避免：**
- **注册为两个独立的适配器**（`telegram-k` 和 `telegram-z`），或作为一个适配器但内含两套完全独立的 DOM 选择器和注入策略。
- 适配器的 `match()` 函数区分 URL 中的 `/k/` 和 `/a/` 路径。
- 两套 DOM fixture 测试，各自维护。
- 如果 DOM 差异过大，拆成两个适配器文件是更干净的选择。

**预警信号：**
- 用户报告 "Telegram 不工作" 但开发者自己的测试环境正常。
- bug 报告中截图的 DOM 结构与开发者的 fixture 不匹配。
- URL 模式只匹配了 `/k/` 或 `/a/` 其中一个。

**应处理阶段：** Telegram 适配器设计——先调研两个客户端的 DOM 差异再决定适配器数量。

---

### 陷阱 N6：Feishu / Lark 的多域名和国际化变体

**问题表现：**
开发者只匹配 `feishu.cn` 域名。但用户使用 Lark 国际版（`larksuite.com`），适配器不识别。或者飞书使用了多个子域名（`xxx.feishu.cn`、`xxx.larksuite.com`），匹配逻辑遗漏。

**原因：**
Feishu（国内版）和 Lark（国际版）使用不同的主域名和不同的 URL 结构：
- 国内版：`xxx.feishu.cn/chat/<chat_id>` 或 `xxx.feishu.cn/messenger/`
- 国际版：`xxx.larksuite.com/chat/<chat_id>` 或类似路径
- 两者共享大部分前端代码但域名完全不同

**如何避免：**
- `match()` 函数同时匹配 `feishu.cn` 和 `larksuite.com` 域名（包括子域名）。
- `host_permissions` 需要包含 `https://*.feishu.cn/*` 和 `https://*.larksuite.com/*`。
- 考虑使用 `optional_host_permissions` 让用户 opt-in，因为不是所有用户都使用飞书。
- 适配器内的 DOM 选择器应对两个版本通用（前端代码相同）。

**预警信号：**
- 国际用户报告飞书适配器不工作。
- `host_permissions` 缺少 `larksuite.com` 导致 `executeScript` 权限错误。

**应处理阶段：** Feishu/Lark 适配器注册——确保 `match()` 和 `host_permissions` 覆盖两个域名。

---

### 陷阱 N7：适配器之间的共享代码导致 bundle 膨胀和耦合

**问题表现：**
开发者将多个工具函数（paste bridge、Quill API 访问器、登录检测器）放入 `shared/` 模块，所有适配器共享。结果每个适配器的 content script bundle 都包含了所有平台的工具代码——Discord bundle 里包含了 Quill 相关代码（完全无用），Slack bundle 包含了 Slate 相关代码。bundle 体积膨胀。

**原因：**
每个 IM 适配器是独立的 content script bundle（通过 `chrome.scripting.executeScript` 按需注入）。Vite/WXT 的 tree-shaking 只能移除未引用的导出，但如果 `shared/dom-injector.ts` 导出了 `simulatePaste`、`insertViaQuillAPI`、`insertViaSlateAPI` 等函数，而适配器 import 了整个模块，所有函数都会被打包。

**如何避免：**
- **平台特定的工具函数放在对应适配器文件内部**，不要放入 `shared/`。
- `shared/dom-injector.ts` 只放**通用且所有适配器都需要**的工具（如 `setInputValue`）。
- MAIN world 桥接代码（如 Discord 的 port 通信模式）可以作为共享工具，因为多个适配器可能需要。
- Quill API 访问器、Slate fiber 遍历器等**平台特定代码**留在适配器内部或 `shared/adapters/<platform>-*.ts` 文件中。
- 使用 `import { specificFunction } from '...'` 具名导入，确保 tree-shaking 生效。

**预警信号：**
- 单个适配器 bundle 体积超过 50KB。
- 构建产物中 Discord bundle 包含 "quill" 字符串。
- 修改一个平台的工具函数导致其他平台的 bundle hash 变化。

**应处理阶段：** 适配器架构设计——在新适配器开发开始时明确 shared vs adapter-local 的代码边界。

---

### 陷阱 N8：`host_permissions` 膨胀触发 Web Store 审核摩擦

**问题表现：**
每新增一个 IM 适配器就在 `host_permissions` 中添加一条。v1 有 `https://discord.com/*` 和 `http://localhost:18789/*`。添加 Feishu、Slack、Telegram、WhatsApp、Teams 后，`host_permissions` 变成 7+ 条，覆盖大量域名。Chrome Web Store 审核员标记为"过度权限"，或安装时用户被吓到（"访问你的飞书、Slack、Telegram、WhatsApp 数据"）。

**原因：**
Chrome Web Store 的审核标准对 `host_permissions` 越来越严格。每一条都需要有明确的用户可见理由。v1.0 用了 `optional_host_permissions` 来动态授权 OpenClaw 的任意 origin——这个模式应该扩展到更多平台。

**如何避免：**
- **默认 `host_permissions` 只保留 Discord**（v1 已有，用户已接受）。
- **所有新平台走 `optional_host_permissions`**：用户首次使用某平台时，通过 `chrome.permissions.request({ origins: [...] })` 动态获取权限。
- 用户在选项页可以管理已授权的平台 origin。
- `dispatch-pipeline.ts` 中已有 OpenClaw 的动态权限检查逻辑——扩展为通用模式（对所有 `hostMatches.length === 0` 的适配器都检查动态权限）。
- Web Store listing 中按平台列出权限理由。

**预警信号：**
- Web Store 审核要求解释每条 `host_permissions` 的用途。
- 用户安装时因权限列表过长而放弃。
- 审核耗时从 2 天增长到 7+ 天。

**应处理阶段：** 适配器架构——在第一个新适配器注册时就决定 `optional_host_permissions` 模式。

---

### 陷阱 N9：适配器数量增长后的 MutationObserver 泄漏

**问题表现：**
用户使用 Telegram 适配器发送消息。适配器中的 `waitForReady` 创建了 `MutationObserver`，但在某些错误路径下没有 `disconnect()`。后续每次 SPA 路由变化都触发旧的 observer 回调。随着适配器数量增加，累积泄漏的 observer 越来越多，最终导致目标平台 tab CPU 100%。

**原因：**
v1.0 的 Discord 和 OpenClaw 适配器已经正确实现了 observer 清理（`settled` flag + `disconnect()` + `clearTimeout`）。但当适配器数量从 2 个增长到 6-8 个，每个适配器都可能有自己的 observer，错误路径也更复杂。

**如何避免：**
- **将 `waitForElement` 和 `waitForNewMessage` 提取到 `_base.ts`**，确保所有适配器使用同一个经过验证的实现。v1.0 的两个适配器各自有重复的 `waitForElement` 实现——应合并。
- 强制使用 `try/finally` 或 `AbortController` 模式确保 observer 一定被 disconnect。
- 添加运行时 canary：适配器注入后记录 observer 数量，完成后验证数量回落。
- CI 测试：验证适配器注入前后 `MutationObserver` 的数量没有净增长。

**预警信号：**
- Chrome DevTools Performance tab 显示长时间的 DOM mutation 回调。
- 用户报告 IM 平台 tab 越用越卡。
- `Performance Observer` 条目中看到大量 `MutationRecord` 处理。

**应处理阶段：** 适配器基础设施重构——在新适配器开发前先合并和加固 `_base.ts` 中的共享 observer 工具。

---

### 陷阱 N10：新适配器的 `waitForReady` 未考虑 SPA 冷启动 vs 热切换的差异

**问题表现：**
Telegram 适配器的 `waitForReady` 只等编辑器出现。用户第一次打开 Telegram Web tab（冷启动）：整个 React 应用需要 5-8 秒挂载，编辑器出现时 Vue/React 路由还没完全绑定事件处理器，注入成功但 Enter 键发送无反应。用户在同一 tab 切换聊天（热切换）：URL 通过 pushState 变化，编辑器 DOM 复用但频道上下文已切换，注入到了错误的聊天。

**原因：**
冷启动和热切换对 `waitForReady` 的要求完全不同：

| 场景 | 等什么 | 超时 |
|------|--------|------|
| 冷启动（新 tab） | 应用框架挂载 + 编辑器渲染 + 事件绑定完成 | 10-15s |
| 热切换（同 tab 不同频道） | URL 变更 + 频道数据加载 + 编辑器重新绑定到新频道 | 5-8s |
| 已打开的 tab（无需导航） | 编辑器已有，直接可用 | 1-2s |

Discord 适配器通过 `extractChannelId` 比对 URL 和 DOM 中的频道 ID 来处理热切换。新适配器需要类似的**频道/会话级别的锚点验证**，而不仅仅等编辑器元素出现。

**如何避免：**
- `waitForReady` 必须等待**频道/会话特定的标识符**（如 Telegram 的 chat ID 对应的消息列表容器属性），不仅仅是编辑器。
- 使用 `chrome.webNavigation.onHistoryStateUpdated` 检测 SPA 路由变化（`tabs.onUpdated` 不触发 pushState）。
- 适配器在 compose 前验证当前 URL 仍然匹配预期（防止 SPA 路由在等待期间切换）。
- 不同场景使用不同超时值。

**预警信号：**
- "消息发到了错误的聊天/频道。"
- "冷启动时发送失败，刷新页面后成功。"
- "快速连续发两次消息，第一次成功第二次失败。"

**应处理阶段：** 每个新适配器的 `waitForReady` 实现——必须包含频道级锚点验证。

---

## 投递鲁棒性改进的陷阱

### 陷阱 R1：重试机制可能放大双发问题

**问题表现：**
v1.1 添加了投递失败后的自动重试队列。但重试与现有幂等性机制的交互出了问题：第一次发送实际上成功了（只是确认超时），重试又发了一次。用户收到两条重复消息。

**原因：**
v1.0 的幂等性通过 `dispatchId` + `chrome.storage.session` 状态机实现。但"发送成功但确认超时"是一个模糊状态——适配器认为超时（返回 TIMEOUT），但实际上消息已经到达服务器。重试机制在这个模糊状态下不能简单地重发。

**如何避免：**
- **重试前必须先做 post-send 验证**——检查目标聊天中是否已经存在匹配的消息。
- 如果无法验证（如平台不提供可查询的消息 API），重试应该要求用户**手动确认**（"上次发送可能已成功，是否重试？"），而不是自动重试。
- 幂等性状态机需要增加一个 `maybe_sent` 状态：适配器返回 TIMEOUT 时，记录为 `maybe_sent` 而不是 `error`。
- `maybe_sent` 状态的 dispatch 只能被用户手动重试，不能自动重试。

**预警信号：**
- 重试后用户收到重复消息。
- 日志显示 TIMEOUT 错误但实际上消息已发送成功。
- 重试队列在"发送成功但确认失败"的边界情况下循环。

**应处理阶段：** 投递鲁棒性改进——重试队列设计必须与幂等性状态机协同。

---

### 陷阱 R2：`chrome.webNavigation` 需要额外权限且不适用于所有场景

**问题表现：**
为解决 SPA 路由检测问题，开发者在 manifest 中添加 `webNavigation` 权限。Chrome Web Store 审核员要求解释为什么需要这个权限。更严重的是：`webNavigation.onHistoryStateUpdated` 在某些场景下不触发（如 hash 变化、某些 SPA 框架的 replaceState 用法）。

**原因：**
v1.0 的 `dispatch-pipeline.ts` 使用 `tabs.onUpdated` 检测导航完成。但 SPA 的 pushState 不触发 `tabs.onUpdated`。`webNavigation.onHistoryStateUpdated` 可以检测 pushState，但：
- 需要 `"webNavigation"` 权限（额外的审核摩擦）
- 对于已经使用 `tabs.onUpdated` 的项目，两者需要协调以避免重复处理
- 某些 SPA（如飞书）使用 replaceState 或 hash 变化来导航，`onHistoryStateUpdated` 可能不覆盖

**如何避免：**
- **首选方案：不在 manifest 中添加 `webNavigation` 权限。** 而是在适配器的 content script 内部监听 `popstate` 事件 + 覆写 `history.pushState/replaceState`。
- 适配器在 `waitForReady` 中设置 URL 监控，如果检测到 URL 变化偏离目标，提前返回错误。
- 仅在上述方案不够时才考虑 `webNavigation` 权限，并在 Web Store listing 中提供明确理由。
- 保持 `tabs.onUpdated` 作为主检测通道（已实现且已验证），SPA 路由变化在适配器内部处理。

**预警信号：**
- Web Store 审核员要求解释 `webNavigation` 权限的必要性。
- `onHistoryStateUpdated` 和 `onTabComplete` 对同一事件产生竞态。

**应处理阶段：** 投递鲁棒性改进——优先使用 content script 内部的 SPA 检测方案。

---

### 陷阱 R3：post-send 验证（confirm）的策略因平台而异

**问题表现：**
v1.0 的 Discord 适配器通过检查编辑器内容清空（`(editor.textContent ?? '').trim().length === 0`）来确认发送成功。OpenClaw 通过 MutationObserver 等待消息列表中新增子节点。开发者将 Discord 的"编辑器清空"策略应用到 Slack，但 Slack 的 Quill 编辑器在发送后不清空——它保持了一个新的空段落节点，`textContent` 不为空字符串，而是包含 `\n`。

**原因：**
不同平台在消息发送成功后的 DOM 行为完全不同：

| 平台 | 发送后 DOM 变化 | 确认策略 |
|------|---------------|---------|
| Discord | Slate 编辑器内容清空 | 检查 `textContent === ''` |
| OpenClaw | 消息列表新增节点 | MutationObserver 计数 |
| Slack | Quill 编辑器重置为空段落（含 `\n`） | 检查 `textContent.trim() === ''` |
| Telegram | 编辑器清空 + 新消息气泡出现 | MutationObserver 等新消息 + 编辑器清空 |
| Feishu | 编辑器清空 + 新消息节点 | 类似 Telegram |

**如何避免：**
- **每个适配器自行实现确认逻辑**，不共享具体实现。
- `_base.ts` 提供确认工具函数（`waitForEditorClear`、`waitForNewMessage`），但适配器选择使用哪个。
- 确认逻辑必须在 **MAIN world 或 ISOLATED world 中都能工作**（取决于编辑器是否跨 world 读取）。
- 确认超时不应过长（5s 足够），超时时返回 `maybe_sent` 而不是 `error`。

**预警信号：**
- 确认逻辑误判：发送成功但报告超时，或未发送却报告成功。
- 不同平台上确认的延迟差异导致用户体验不一致。

**应处理阶段：** 每个新适配器的确认逻辑实现。

---

## 平台特定的 ToS / 反自动化风险

### 陷阱 T1：各平台对浏览器扩展自动化的容忍度差异巨大

**问题表现：**
开发者认为"Discord 能用 paste 注入，其他平台也应该可以"。但不同平台对浏览器扩展操作其 web UI 的态度截然不同：

| 平台 | 风险等级 | 原因 | 建议 |
|------|---------|------|------|
| Discord | MEDIUM | ToS 禁止 selfbot；已有用户报告被封；但单次手动触发风险较低 | 保持 v1 的限流 + 风险披露 |
| Slack | LOW-MEDIUM | 未明确禁止浏览器扩展；但企业版管理员可能限制扩展安装 | 限流即可 |
| Telegram Web | LOW | 较宽容；官方提供了 Bot API 作为替代；Web 客户端开源 | 低风险，但仍需限流 |
| Feishu / Lark | MEDIUM | 企业 IM；管理员可能检测到非授权扩展；飞书有设备指纹 | 限流 + 企业用户风险提示 |
| WhatsApp | **HIGH** | Code Verify 检测；ML 模型封号；已有大规模封禁案例 | 考虑 deep-link-only 模式 |
| Microsoft Teams | MEDIUM | 企业环境；可能被 IT 管理员禁止 | 企业用户风险提示 |
| Signal | N/A | **无 web 客户端**（只有 Electron 桌面应用） | v1.1 不做 |

**如何避免：**
- 每个适配器附带一份**风险评估文档**（在适配器文件头注释中）。
- 高风险平台（WhatsApp）必须 opt-in 且有明确的风险确认 UI。
- 所有适配器保持 v1 的限流策略（5s per channel）。
- 在 README 和 Web Store listing 中按平台列出风险等级。

**应处理阶段：** 每个新适配器的可行性调研阶段。

---

## 集成陷阱汇总

| 集成点 | 常见错误 | 正确做法 |
|--------|---------|---------|
| Slack (Quill) | 使用 ClipboardEvent paste | 获取 Quill 实例调 `insertText()`，或 `execCommand('insertText')` |
| Telegram Web K | 假设 DOM 与 Web Z 相同 | 区分两个客户端，各自维护 DOM fixture |
| Telegram Web Z | 同上 | 同上 |
| Feishu / Lark | 只匹配 `feishu.cn` | 同时匹配 `larksuite.com` 和子域名变体 |
| WhatsApp Web | 直接 DOM 注入 | 评估是否仅用 deep link（`wa.me`）；若注入则需用户风险确认 |
| Microsoft Teams | 假设编辑器与 Discord 相同 | 独立调研编辑器框架和注入策略 |
| 多平台 MAIN world 桥接 | 每个适配器各自实现 | 提取到 `_base.ts` 共享工具 |
| `host_permissions` | 每加一个平台加一条静态权限 | 新平台走 `optional_host_permissions` 动态授权 |
| SPA 路由检测 | 添加 `webNavigation` 权限 | 优先在 content script 内部检测 URL 变化 |
| 重试队列 | 无条件自动重试 | 区分 `error` 和 `maybe_sent` 状态；高风险重试需用户确认 |

## 性能陷阱

| 陷阱 | 触发条件 | 症状 | 防范 |
|------|---------|------|------|
| 共享代码膨胀 bundle | 多个通用工具放入 `shared/` | 单适配器 bundle > 50KB | 平台特定代码留在适配器内部 |
| MutationObserver 累积泄漏 | 6+ 个适配器的错误路径未 disconnect | 目标平台 tab CPU 100% | 共享 `waitForElement` 实现 + `try/finally` 模式 |
| `chrome.storage.session` 吞吐量瓶颈 | 重试队列频繁轮询 dispatch 状态 | SW 冷启动延迟增加 | 按需读取，不轮询；用 `onChanged` 事件驱动 |

## 阶段特定的陷阱警告

| 阶段 | 最高风险陷阱 | 缓解措施 |
|------|------------|---------|
| 适配器基础设施重构 | N7（共享代码导致 bundle 膨胀） | 先重构 `_base.ts`，明确 shared vs adapter-local 边界 |
| MAIN world 桥接提取 | N4（DataTransfer 跨界问题） | 从 Discord 适配器提取桥接工具，为新适配器复用 |
| Slack 适配器 | N2（Quill 不接受合成 paste） | 独立调研 Quill 编辑器策略 |
| Telegram 适配器 | N5（Web K vs Web Z DOM 差异） | 设计阶段即决定单/双适配器方案 |
| Feishu/Lark 适配器 | N6（多域名变体） | `match()` 和 `host_permissions` 覆盖两个域名 |
| WhatsApp 可行性调研 | N3（封号风险） | 先做风险评估再决定是否开发 |
| `optional_host_permissions` 重构 | N8（权限膨胀） | 将动态权限模式从 OpenClaw 扩展到所有新平台 |
| 投递重试队列 | R1（重试放大双发） | 增加 `maybe_sent` 状态 |
| SPA 路由改进 | R2（webNavigation 权限问题） | 优先使用 content script 内部方案 |
| Post-send 确认统一 | R3（确认策略因平台而异） | 提供工具函数但适配器自行选择策略 |

## 来源

**平台编辑器框架：**
- [Liveblocks: Which Rich Text Editor Framework Should You Choose in 2025?](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025) — MEDIUM（编辑器框架对比，确认 Slack 使用 Quill、Discord 使用 Slate）
- [Vice: Slack's New Rich Text Editor Shows Why Markdown Still Scares People](https://www.vice.com/en/article/slacks-new-rich-text-editor-shows-why-markdown-still-scares-people/) — MEDIUM（确认 Slack 使用 Quill.js）
- [Hacker News: Slack's WYSIWYG editor is Quill-based](https://news.ycombinator.com/item?id=21589647) — MEDIUM
- [morethanwords/tweb — Telegram Web K](https://github.com/morethanwords/tweb) — HIGH（确认 Telegram Web K 使用自定义 contenteditable 编辑器）
- [Ajaxy/telegram-tt — Telegram Web Z](https://github.com/Ajaxy/telegram-tt) — HIGH（确认独立的代码库和 DOM 结构）
- [Discord Slate fork](https://github.com/discord/slate) — HIGH（确认 Discord 使用 Slate 的自 fork 版本）
- [Quill.js API docs](https://quilljs.com/docs/api) — HIGH（Quill 的 `insertText` API 是 Slack 注入的最可靠路径）

**WhatsApp 风险：**
- [The Hacker News: 131 Chrome Extensions Caught Hijacking WhatsApp Web](https://thehackernews.com/2025/10/131-chrome-extensions-caught-hijacking.html) — HIGH（确认 WhatsApp 对自动化扩展的检测和封禁）
- [Malwarebytes: Over 100 Chrome Extensions Break WhatsApp's Anti-Spam Rules](https://www.malwarebytes.com/blog/news/2025/10/over-100-chrome-extensions-break-whatsapps-anti-spam-rules) — HIGH
- [WhatsApp Help: Seeing Browser Extension Warning](https://faq.whatsapp.com/1519454798524881) — HIGH（WhatsApp 官方文档确认 Code Verify 功能）

**Chrome 扩展技术：**
- [Chrome Extensions Docs — chrome.scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) — HIGH（ISOLATED vs MAIN world 执行环境）
- [Chrome Extensions Docs — Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) — HIGH
- [Stack Overflow: How to insert content script when page was changed via pushState](https://stackoverflow.com/questions/13806307/how-to-insert-content-script-in-google-chrome-extension-when-page-was-changed-vi) — MEDIUM
- [Making Chrome Extension Smart By Supporting SPA Websites](https://medium.com/@softvar/making-chrome-extension-smart-by-supporting-spa-websites-1f76593637e8) — MEDIUM

**编辑器注入技术：**
- [Slate Discussion #5721: Programmatic text insertion via clipboard simulation](https://github.com/ianstormtaylor/slate/discussions/5721) — MEDIUM
- [Slate Discussion #5003: How to change Editor state from outside of React with DOM](https://github.com/ianstormtaylor/slate/discussions/5003) — MEDIUM（与 Grammarly 等浏览器扩展交互的方式）
- [React #1152: Trigger change events on programmatic value changes](https://github.com/facebook/react/issues/1152) — HIGH

**v1 代码库（已验证的现有实现）：**
- `entrypoints/discord.content.ts` — Discord 适配器（MAIN world 桥接 + Slate 注入）
- `entrypoints/openclaw.content.ts` — OpenClaw 适配器（property-descriptor setter）
- `shared/dom-injector.ts` — 通用注入工具
- `shared/adapters/registry.ts` — 适配器注册表
- `background/dispatch-pipeline.ts` — 投递状态机 + 幂等性
- `shared/adapters/discord-login-detect.ts` — 登录墙检测

---

_陷阱研究：web2chat v1.1 多渠道适配器 + 投递鲁棒性改进_
_研究日期：2026-05-09_
_基于 v1.0 代码库审查 + 多平台 DOM/editor 生态调研_
