# 陷阱研究

**领域：** Chrome MV3 扩展 + content script 注入到 16 个 IM/AI Web UI（MVP：OpenClaw + Discord）+ 仅本地存储 + i18n
**研究日期：** 2026-04-28
**置信度：** HIGH（Context7 等价的 Chrome 官方文档 + 多个已验证来源）

> Web2Chat 的主链路天然脆弱：单次点击必须 (a) 唤醒 SW，(b) 抓取页面快照，(c) 打开/激活 tab，(d) 等待 SPA 聊天 UI 挂载，(e) 注入文本到第三方富文本编辑器，(f) 触发发送 —— 跨越 DOM 每周变化的异构平台。下面的多数陷阱都关于该链路如何静默失败。

---

## 关键陷阱

### 陷阱 1：在 React 受控输入上设置 `input.value =`（不会触发 `onChange`）

**问题表现：**
适配器设置 `inputElement.value = "Hello"`，看到文本显示，然后"发送"静默地投递了空字符串。React 的受控输入将键入的 DOM 值视为与组件状态不同步，并在下一次 reconcile 时丢弃它。

**原因：**
React 在 `HTMLInputElement.prototype` 上 monkey-patch 了原生 value setter 来追踪变化。直接的属性赋值绕过了 React 的追踪器，所以 React 认为"没有发生变化"，永远不触发 `onChange`。DOM 更新是真实的，但对 React 状态机不可见。

**如何避免：**
使用原生 setter 原型描述符，然后投递一个冒泡的 input 事件：

```js
const setter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  "value",
).set;
setter.call(inputEl, text);
inputEl.dispatchEvent(new Event("input", { bubbles: true }));
```

对 `<textarea>` 改用 `HTMLTextAreaElement.prototype`。对 checkbox 使用 `checked` 描述符和 `click` 事件。不要在模块加载时缓存描述符 —— 部分应用会遮蔽（shadow）原型。

**预警信号：**

- "输入框可视化填充了，但发送按钮保持禁用。"
- React DevTools 显示组件状态仍持有旧/空值。
- 切走焦点再切回会把输入重置为空。

**应处理阶段：** Dispatch Core（共享注入工具）—— 适配器写入 `<input>` / `<textarea>` 的唯一路径必须是这个 helper。

---

### 陷阱 2：Lexical / Slate / Draft.js 编辑器完全忽略 DOM 变更（Discord）

**问题表现：**
Discord 适配器聚焦聊天输入，设置 `textContent`，投递 keypress，并可视化地填充了 contenteditable —— 但 Lexical 立即把 DOM reconcile 回它内部的 `EditorState`，抹掉注入的文本。或更糟：文本仍然可见，但按 Enter 发送的是空消息。

**原因：**
Lexical 的真实数据源是它内存中的 `EditorState`，不是 DOM。DOM 是状态的函数，通过 reconciliation 计算而来。任何在 `editor.update()` 之外做的 DOM 变更，都会在下一次渲染 tick 被覆盖。Slate（Notion、Hex、Linear 使用）和 Draft.js（旧版 Reddit、旧版 Facebook）同样适用。

**如何避免：**
两种可行策略，按偏好排序：

1. **合成 paste（在 Lexical/Slate/Draft 上最可靠）：**

   ```js
   editorEl.focus();
   const dt = new DataTransfer();
   dt.setData("text/plain", text);
   editorEl.dispatchEvent(
     new ClipboardEvent("paste", {
       clipboardData: dt,
       bubbles: true,
       cancelable: true,
     }),
   );
   ```

   `@lexical/rich-text` 和 Slate 的默认插件都原生处理 `paste` 事件。

2. **`beforeinput` + `input` 序列，使用 `inputType: 'insertFromPaste'`**（短内容用 `'insertText'`）。构造真正的 `InputEvent`，而不是泛型 `Event`。

3. **最后手段 —— 主世界桥接：** 从隔离的 content script 注入 `<script>`，在编辑器元素上定位 React fiber（`editorEl.__reactFiber$<hash>`），向上遍历找到 Lexical `editor` 实例，然后调用 `editor.update(() => { /* $insertText */ })`。在 Discord 各发布版本间脆弱，但是唯一确定性的路径。

绝不要只信任单一技术 —— 适配器应先尝试 paste，通过 `MutationObserver` 验证文本进入了编辑器的数据模型（轮询 `aria-label`、字符数 badge 或发送按钮启用状态），然后回退。

**预警信号：**

- 尽管文本可见，"发送"按钮始终不启用。
- 文本闪现一帧后消失。
- 发送的消息携带的是旧草稿内容，而不是新注入的内容。
- Discord 控制台显示 `Lexical: editor.update() must be used` 警告。

**应处理阶段：** Discord Adapter —— 并在 Adapter Architecture 文档中作为规范模式记录，被所有 v2 平台适配器（Slack、Telegram、Lark 都使用富文本编辑器）参考。

---

### 陷阱 3：service worker 在 dispatch 中途死亡；tab 已打开但消息未发送

**问题表现：**
用户点击"发送"。SW 通过 `chrome.tabs.create({ url, ... })` 创建 tab，注册 `chrome.tabs.onUpdated` 监听器以便完成时注入，然后变为空闲。30 秒后（Discord 冷加载慢 + ML 编译），SW 被终止。监听器消失。tab 加载完成但 content script 永远不运行。

**原因：**
MV3 SW 在空闲 30 秒后、活动 5 分钟后或某个事件耗时超过 5 分钟时会被终止。WebSocket 不会保持 SW 存活。模块作用域变量（"in-flight dispatch"映射）在 SW 死亡时消失，唤醒后返回 `undefined`。

**如何避免：**

- **状态放在 `chrome.storage.session`**（内存中，浏览器会话内 SW 重启可保留）。在打开 tab 之前按 `tabId` 写入 dispatch payload。
- **在 SW 脚本顶层同步重新注册监听器**，每次唤醒都注册。在 `async` 回调内部附加的监听器在下次唤醒时会被静默丢失。
- **让 dispatch 幂等且可恢复：** SW 的 `chrome.tabs.onUpdated` 监听器应通过 `chrome.storage.session.get(tabId)` 查找待处理 payload，而不是依赖闭包。
- **使用 `chrome.scripting.executeScript` 编程式注入**，不要使用模块作用域队列。每次唤醒都重新绑定到最新 payload。
- 避免流行的 keepalive 黑科技（`chrome.runtime.connect` ping 循环）—— Chrome 团队已表明会收紧执行；依赖它们既脆弱又会被 Web Store 标记。

**预警信号：**

- 仅当用户在 popup 点击与目标 tab 加载之间有另一个长时间任务时才能复现 bug。
- 在开发环境工作（DevTools 让 SW 保持存活），生产构建失败。
- 日志显示 `chrome.tabs.onUpdated` 已注册但从未为 dispatch tab 触发。
- 偶发 "Could not establish connection. Receiving end does not exist."

**应处理阶段：** Dispatch Core —— 必须从第 1 天就设计为事件驱动的状态机；后期改造痛苦。

---

### 陷阱 4：SW 中的顶层 `await` 和 `importScripts` 陷阱

**问题表现：**
开发者在 `service-worker.js` 顶部写 `const config = await chrome.storage.local.get('settings')` 用作"干净"的初始化。SW 注册失败并报神秘错误，或初始化与第一个事件竞态，所以 `onMessage` 触发时 `config` 为 `undefined`。

**原因：**

- 扩展 SW 中故意禁用了顶层 `await`。
- SW 是 module 时（manifest 中 `"type": "module"`）禁止 `importScripts()`；二选一（ES modules 或 `importScripts`）。
- 不支持 `import()`（动态导入）。
- 第一次事件循环之后调用 `importScripts()` 会以 "after init" 错误失败。

**如何避免：**

- **将 SW 视为每次唤醒都是无状态的**。在事件处理器内部读取所需内容，而不是在模块顶层读取。
- 对共享初始化（如加载适配器注册表），用 memoized 的 `getReady(): Promise<State>` 包裹，并在每个监听器函数体内 `await` 它 —— 永远不在模块作用域。
- 在 manifest 中一次性决定 ESM 还是 `importScripts` 并坚持下去。ESM 是现代路径；`importScripts` 用于把所有内容打包进单文件的工作流。
- 把适配器打包进 SW 包内 —— 永远不要从远程 URL 加载（也违反 Web Store，见陷阱 9）。

**预警信号：**

- `chrome://extensions` 中显示 `Service worker registration failed. Status code: 15`。
- 第一次事件以空/未初始化的状态触发，后续事件正常工作。
- ESLint 干净，但扩展在生产中静默失败。

**应处理阶段：** Extension Skeleton（阶段 1）—— 在任何特性写入之前先把 SW 模式设置正确。

---

### 陷阱 5：SPA 路由切换与 content script 注入竞态

**问题表现：**
扩展把 Discord tab 导航到 `https://discord.com/channels/<id>/<id>`。该 tab 已经在 `discord.com`（不同频道），所以 Chrome 不会触发带 `status: 'complete'` 的 `onUpdated` —— URL 是通过 Discord React router 的 `history.pushState` 改变的。content script 永远不会重新运行。或者它运行了，但旧频道的聊天输入元素仍在 DOM 中；注入落到了错误的房间。

**原因：**

- `chrome.tabs.onUpdated` 仅在顶层导航触发，不在 SPA 路由变化触发。
- Discord（以及 Slack、Telegram、Linear）虚拟化消息列表并跨频道复用输入元素 —— `querySelector` 在频道状态追上之前就找到它。
- React 异步 reconcile；输入可能存在但尚未绑定到新频道的 send handler。

**如何避免：**

- 始终通过 `MutationObserver` 等待 **频道特定的锚点**（如 Discord 上的 `[data-list-id="chat-messages-<channelId>"]`），不仅仅是输入元素。
- 使用 `chrome.webNavigation.onHistoryStateUpdated` 检测 SPA pushState 导航并重新触发注入。
- 适配器暴露 `waitForReady(targetUrl): Promise<HTMLElement>`，仅当 (a) URL 匹配预期，(b) 频道特定标识符在 DOM 中，(c) 输入可聚焦时才 resolve。加上硬超时（≥10s）和结构化错误。
- 注入后通过"后置条件"observer 验证 dispatch（如在 N 秒内 DOM 中出现匹配文本的新消息气泡）才宣告成功。

**预警信号：**

- "有时会发到错误的频道。"
- "冷 tab 时工作，从另一频道切换时失败。"
- 浏览器启动后第一次注入正常；快速第二次发送失败。

**应处理阶段：** Dispatch Core（路由感知的注入契约）+ 各 Adapter（频道特定锚点）。

---

### 陷阱 6：DOM class 脆弱性 —— 选择器在 Discord/Slack 每周发布时失效

**问题表现：**
适配器选择 `[class*="textArea-"]` 作为 Discord 输入。两周后 Discord 发布重构；class 现在变成 `chatInput__abc12`。在下一次发布之前，适配器对所有用户静默失败。最坏情况：选择器匹配到不同元素（侧边栏搜索），扩展把搜索查询当成消息发送出去。

**原因：**
Discord、Slack、Telegram、WhatsApp Web 出货带 hash class 名的 CSS modules，每周轮换。`aria-*` 和 `role` 属性更稳定，但开发者很少作为首选。

**如何避免：**

- **选择器优先级：** `role="textbox"` + `aria-label`（i18n 感知）> 稳定 `data-*` 属性 > tag + role > class 片段（最后手段）。
- 每个元素编码多个 fallback，按稳定性排序：
  ```ts
  const SELECTORS = [
    '[role="textbox"][data-slate-editor]', // Slate editor variant
    'div[role="textbox"][contenteditable="true"]',
    '[class*="slateTextArea"]', // last-resort fragment
  ];
  ```
- **快照测试适配器**，针对每个平台保存的 DOM fixture，每季度刷新。任何匹配 >1 个元素的选择器都是 bug。
- 把每个平台的选择器集中在一个文件，附带版本注释 —— 该文件的 diff 显示 Discord 何时发布了改版。
- 构建一个 **canary 检查**：注入前在运行时验证选择的元素唯一，且匹配稳定形态（具备预期 ARIA 属性）。用结构化错误快速失败。

**预警信号：**

- bug 报告聚集在某个特定日期（Discord 发布日）。
- `querySelector` 对聊天输入返回 `null`，但 `document.body` 内有大量 `contenteditable` div。
- 适配器开始注入到错误元素（如 DM 搜索栏）。

**应处理阶段：** OpenClaw Adapter / Discord Adapter —— 在第一个适配器中确立选择器层级和 canary 模式，并将其编码为所有 v2 适配器的契约。

---

### 陷阱 7：登录墙 —— 目标 tab 重定向到 `/login?redirect_to=...`

**问题表现：**
用户向 Discord dispatch。tab 在 `https://discord.com/channels/123/456` 打开，立刻重定向到 `https://discord.com/login?redirect_to=/channels/123/456`。适配器永远等待那个永远不会出现的聊天输入。用户在 popup 看到冻结的进度指示；再点 send；最终登录后收到两份消息（或四份 —— 见陷阱 8）。

**原因：**
Discord（以及每个会话 token 鉴权模型的 IM）会把未认证用户重定向到登录页面，并保留目的地。适配器看到了它期待的 URL，然后盯着永远不会匹配其锚点的 DOM。

**如何避免：**

- **显式检测登录 URL。** 每个适配器声明 `loginUrlPatterns: RegExp[]`，Dispatch Core 在导航后检查 tab URL。
- 检测到登录时：在 popup 显示明确状态（"请登录 Discord，然后再次点击发送"），并 **持久化草稿**，让用户不必重新输入。
- **登录后不要自动重试。** 在认证状态变化时静默重试正是产生重复发送 bug 的根源。要求显式的用户操作。
- 硬超时（陷阱 5）兜底所有情况 —— 如果 N 秒内既未检测到登录也未检测到输入，以"无法到达聊天"错误中止。

**预警信号：**

- "我清完 cookie 后发送一直挂起。"
- "今天第一次发送失败，第二次成功。"
- popup spinner 永不结束；用户以为坏了。

**应处理阶段：** Dispatch Core（登录检测生命周期 hook）+ 各 Adapter（URL 模式）。

---

### 陷阱 8：重试时双发 —— 用户点击两次，消息发送两次

**问题表现：**
用户点击发送。Discord 加载缓慢。3 秒无反馈后，用户再次点击发送。现在有两个排队的 dispatch；两者最终都触发，聊天收到消息两次。更糟的是：在途重试与成功的第一次尝试重叠，产生难以归因的重复。

**原因：**

- dispatch 没有幂等性 key。
- popup 关闭时 popup 状态丢失；"in-flight"指示消失。
- SW dispatch 跟踪器存储在模块作用域，在两次点击之间 SW 重启时丢失。

**如何避免：**

- 点击时生成 `dispatchId`（UUID），按 `tabId` 存入 `chrome.storage.session`。
- 适配器在注入前检查 `chrome.storage.session.get(dispatchId)` —— 如果状态为 `'sent'` 或 `'sending'`，拒绝重新注入。
- 点击注册后立刻禁用 popup 发送按钮；从 `chrome.storage.session` 反映"in-flight"状态，使按钮即使 popup 重新打开也保持禁用。
- 注入成功后写入 `dispatchId: 'sent'`，60 秒后清理。
- 提供 **post-send 验证** 步骤 —— 观察聊天消息列表中是否出现新消息后才宣告成功。如果验证失败，用户可以重试而不冒重复风险（因为之前的 dispatchId 仍是 'sending'，仅在已知间隔后超时）。

**预警信号：**

- 用户报告"我只发送一次但收到两条消息。"
- 日志显示几秒内对同一 tab 有两次 `executeScript` 调用。

**应处理阶段：** Dispatch Core（幂等性契约 + popup 状态同步）。

---

### 陷阱 9：Web Store 拒绝 —— 宽泛的 `host_permissions`、缺失隐私政策、远程代码

**问题表现：**
经过 5–14 天审核等待后被拒绝。常见原因：(a) 请求 `host_permissions: ["<all_urls>"]` 但理由薄弱，(b) 处理用户数据（页面快照、配置的 prompt）但未链接隐私政策，(c) 任何远程代码路径（从 URL 加载适配器逻辑、eval、动态 Function），(d) 权限相对实际使用过度。

**原因：**
2025 年的审核员对远程代码和混淆零容忍。他们对照已展示的用途审视每一项 `host_permissions`。他们阅读隐私政策并对照 manifest 权限和 dashboard 的"data usage"披露。

**如何避免：**

- **不要请求 `<all_urls>`。** 列出每个适配器的精确 host 模式：
  ```json
  "host_permissions": [
    "http://localhost:18789/*",
    "https://discord.com/*"
  ]
  ```
  适配器发布时新增。对 v2 平台使用 `optional_host_permissions`，让用户主动同意。
- **使用 `activeTab` 用于页面快照抓取** —— 它在用户手势（图标点击）时授予临时权限，无需 `host_permissions`。结合从 SW 编程式调用 `chrome.scripting.executeScript`。
- **每个适配器都打包进扩展包内。** 没有 `fetch().then(eval)`，没有 `new Function()`，没有远程 `<script src>`。Web Store 把远程代码视为自动拒绝。
- **`extension_pages` 的默认 CSP 不容妥协。** 不要尝试放宽；不能在那里添加 `unsafe-eval` 或 `unsafe-inline`。如果某个库需要 `eval`，将其隔离在 `isolated_world` CSP 放宽下，而非 `extension_pages`。
- **必须有隐私政策。** Web2Chat 抓取页面内容（URL、title、description、body）—— 这触发政策要求。发布最低限度的政策，说明：仅在图标点击时抓取数据；本地存于 `chrome.storage.local`；除用户选择的 IM 目的地（通过浏览器直接导航）外不传输给任何第三方。
- **提交前清单：**
  - [ ] 在提交前本地测试打包好的 `.zip` 构建。
  - [ ] dashboard 表单中每个权限都有理由。
  - [ ] 为 OpenClaw / Discord 提供审核员测试凭据（测试服务器）。
  - [ ] 隐私实践 tab 与实际代码行为匹配。

**预警信号：**

- 拒绝邮件引用 "Yellow Magnesium"（一般行为不匹配）或 "Blue Argon"（权限过度）。
- 一个老账号的审核耗时 >7 天 → 他们在仔细审查。

**应处理阶段：** Distribution / Pre-Release —— 但 manifest 设计必须在阶段 1 就正确；后期改造 host 权限通常需要对存量用户提示权限升级（这会拉高卸载率）。

---

### 陷阱 10：popup 状态丢失 —— 草稿和 dispatch 进度在失焦时消失

**问题表现：**
用户打开 popup，输入一段长 prompt，不慎点到别处。popup 关闭。重新打开 popup —— 空白。或：点击发送后再次打开 popup 查看状态；popup 空白，没有"in-flight"指示。

**原因：**
每次用户点击 action 图标时 popup HTML 都会全新加载。模块作用域变量、React 状态全部消失。`localStorage` 在 popup 中可用，但对 SW 不可用（Web Storage API 与 SW 不兼容）。

**如何避免：**

- **每次 popup 输入变化时持久化到 `chrome.storage.local`**（debounce 100–250ms）。挂载时恢复。
- **在 `chrome.storage.session` 中按 `dispatchId` 跟踪 dispatch 生命周期**。popup 通过 `chrome.storage.onChanged` 订阅。
- **任何地方都不用 `localStorage`。** 使用 `chrome.storage` 保证 popup ↔ SW ↔ content script 一致性。
- 把 popup 视为 **存储状态的视图**，而非有状态组件。每次渲染都从存储读取。

**预警信号：**

- "我点开别处后丢了我的草稿。"
- "我点击了发送，但重新打开 popup 像什么都没发生。"
- bug 仅在慢机器上复现（popup 重挂载与写入完成的竞态）。

**应处理阶段：** Popup UI（阶段 2/3）—— 在功能扩展前确立基于存储的模式。

---

### 陷阱 11：i18n —— popup HTML body 不支持 `__MSG_*__`，没有复数规则

**问题表现：**
开发者在 `popup.html` 写入 `<button>__MSG_send__</button>`，期待 Chrome 替换。结果按字面渲染。或：开发者写 `chrome.i18n.getMessage('files_moved', [count])` 用于"{count} file moved"，发现 Chrome 没有复数支持 —— 输出读为 "1 file moved" / "5 file moved"。

**原因：**

- Chrome 的 `__MSG_*__` 替换在 `manifest.json` 和 CSS 中工作，但 **在 HTML body 内容中不工作**。（文档说"未来可能支持" —— 当前不支持。）
- `chrome.i18n` 故意不实现 CLDR 复数规则。官方指引是"使用复数中性表述"（如"Files moved: 1"）。
- `getMessage()` 仅支持位置 `$1`–`$9` 替换，最多 9 个，没有命名占位符，没有数字/日期格式化。
- 不支持运行时切换 locale —— Chrome 把 locale 锁定为浏览器 UI 语言。

**如何避免：**

- **挂载时通过 JS 填充 popup HTML：** `document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = chrome.i18n.getMessage(el.dataset.i18n))`。把这个 helper 放在一个文件里。
- **复数中性表述是约束** —— 把所有 UI 文案写成"Items: 5"而非"5 items"。在 i18n 风格指南中记录这一点。
- 对 **运行时 locale 切换**（popup 内 zh ↔ en），不要依赖 `chrome.i18n`。自行实现一个轻量加载器，通过 `fetch(chrome.runtime.getURL(...))` 获取 `_locales/<lang>/messages.json`，并把用户选择存储在 `chrome.storage.local`。
- 数字/日期格式化使用原生 `Intl.NumberFormat` / `Intl.DateTimeFormat`。不要试图在 `__MSG_*__` 字符串中嵌入数字。
- **lint 强制禁止硬编码的面向用户字符串。** 添加一条 ESLint 规则禁止 JSX/HTML 中不通过 i18n helper 的字符串字面量。

**预警信号：**

- popup 显示字面 `__MSG_send__` 文本。
- 复数字符串在 zh 或 en 中读起来都别扭。
- 在扩展设置中切换 locale 没有效果（因为 Chrome 的 locale 锁定到浏览器 UI）。

**应处理阶段：** i18n 阶段 —— 在任何 UI 字符串出现之前确立基于 JS 的替换 + 自定义 locale loader 模式。

---

### 陷阱 12：Discord ToS —— 自动化用户账号有封禁风险

**问题表现：**
Web2Chat 把消息注入用户的 Discord 会话。Discord 基于 ML 的垃圾检测标记重复发送；用户账号被暂停。用户怪扩展。

**原因：**
Discord 的 ToS 明确禁止用户账号自动化（"selfbots"）。它们的检测考虑节奏、消息相似度和用户举报。即使不频繁的自动化也可能在与其他信号（多账号、VPN、新账号）结合时被标记。

**如何避免：**

- **将扩展行为定位为用户主动、单次 dispatch。** 每次 dispatch 都需要显式 popup 点击 —— 永远不按计划自动触发，永远不批量排队。
- **防御性限流。** 即使用户愿意等待，对快于每 5 秒 1 次的 dispatch 也以 UI 信息拒绝。重复快速发送是最强的垃圾信号。
- 在 README 和 Web Store listing 中 **记录风险**："Web2Chat 每次点击发送一条消息。Discord 可能标记超过正常使用的账号。"设定用户预期。
- 在可行的地方，鼓励用户 **发送到 OpenClaw / 自有 Agent 基础设施** 而非公共 Discord 频道。Discord 适配器适用于个人频道和小型服务器，而非广播。
- **不要为消息预先添加类似 bot 的签名**（"Sent via Web2Chat"）—— 这会增加垃圾分类器评分。
- v2：提供可选的 "use Discord Bot API" 路径，要求用户注册自己的 bot —— 把 dispatch 从用户账号上挪开。

**预警信号：**

- 用户报告"用了这个之后我的 Discord 被临时封了。"
- Discord 在消息发送路径上专门加了新的 captcha/挑战流程。

**应处理阶段：** Discord Adapter（限流 + 面向用户的风险披露）+ Distribution（README + listing 文案）。

---

## 技术债模式

看似合理但会造成长期问题的捷径。

| Shortcut                                                          | Immediate Benefit           | Long-term Cost                                                              | When Acceptable                                                    |
| ----------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 使用 `<all_urls>` host_permissions 来"省去每平台的 manifest 配置" | 阶段 1 原型更快             | 提交时 Web Store 拒绝或警告；用户信任受损；没有不弹权限升级提示就回退的路径 | 上架扩展永远不应使用                                               |
| SW 中的模块作用域状态（"只是一个 in-flight tab 的小 map"）        | 比 storage 往返更简单       | SW 重启时静默数据丢失；整条 dispatch 链路偶发崩溃                           | 任何必须存活到一个事件处理器之外的状态都不可使用                   |
| 没有 ARIA fallback 的 class 片段选择器（`[class*="textArea-"]`）  | 在迭代时写起来快            | 下一次 Discord 发布后适配器崩溃，毫无预警                                   | 仅限 dev fixture；在上架适配器中绝不作为主选择器                   |
| popup 中硬编码英文字符串（"以后再加 i18n"）                       | 阶段 2 popup 出货更快       | 每个回填字符串都是回归风险；翻译者得到的上下文不一致                        | 永远不可 —— 在写任何 UI 字符串之前先建立 i18n helper               |
| popup 中用 `localStorage` 做草稿持久化                            | 比异步 storage API 一行搞定 | popup ↔ SW 状态不同步（SW 读不到）；后续加同步时迁移痛苦                    | 永远不可（从第 1 天就用 `chrome.storage.local`）                   |
| 全局单一"send"按钮且无幂等性 key                                  | UX 简单                     | 双发 bug、难调试、支持工单堆积                                              | 任何 dispatch 路径都不可                                           |
| 跳过 post-send 验证（"`executeScript` resolve 了就当发出去了"）   | 省掉 1–2 秒等待             | 当 Lexical reconcile 抹除注入时静默失败                                     | OpenClaw（更简单的输入）可以；Discord/Slack/Lexical 类编辑器永不可 |
| MV3 keepalive ping 黑科技                                         | 在慢加载中保持 SW 存活      | Chrome 团队已表明会收紧；可能被 Web Store 标记                              | 永远不可作为设计内特性；仅在功能开关下作为应急                     |
| 在控制台记录完整页面内容 + 用户 prompt                            | 调试方便                    | 隐私自爆；CWS 审核员能在 `chrome://extensions` 控制台截图中看到 PII         | 在 `__DEV__` 守卫下 OK，构建时剥除                                 |

## 集成坑

连接外部服务时常见的错误。

| Integration                 | Common Mistake                                                     | Correct Approach                                                                                                           |
| --------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Discord Web                 | 把 `discord.com/channels/.../...` 当作稳定 URL —— 导航、等待、注入 | 检测登录重定向；等待频道特定锚点（不仅是输入元素）；通过 DOM observer 进行 post-send 验证                                  |
| Discord Lexical editor      | 设置 `textContent` 或 `value`，投递 `input` 事件                   | 使用合成的 `paste` ClipboardEvent + DataTransfer；或主世界桥接到 `editor.update()`                                         |
| OpenClaw localhost          | 信任 `http://localhost:18789` 始终可达                             | 在 dispatch 前用快速 `fetch` + 2 秒超时探测；本地服务未运行时给出明确错误                                                  |
| Slack / Telegram (v2)       | 因为"都是 React"就整体复用 Discord 适配器                          | 各自使用不同编辑器（Slack: Slate, Telegram: 自有 contenteditable）。选择器层级 + 注入技术必须按平台定制                    |
| WhatsApp Web (v2)           | 通过 DOM 注入                                                      | E2E 加密客户端对输入完整性的强制更严；编程式注入常常失败或触发安全警告。可能不可行 —— 标记为需研究                         |
| Signal (v2)                 | 同上                                                               | v2 里程碑 v1 大概率不可行 —— 记录为已知限制                                                                                |
| 页面元数据（`description`） | 仅读 `document.querySelector('meta[name="description"]').content`  | 依次回退到 `og:description` → `twitter:description` → 第一段；许多 SPA 客户端渲染 meta tag，所以要在初次绘制 **之后** 读取 |
| 页面 `content` 抓取         | 直接使用 `document.body.innerText`                                 | 修剪空白、规范化换行、限制合理大小（如原始 50KB → 发送约 8KB）以避免 Discord 2000 字符消息上限                             |
| `chrome.tabs.create`        | 不要传 `active: false` 还假设注入仍然可用                          | 部分平台（Discord）只在 tab 聚焦时才完整渲染。激活 tab 注入更可靠                                                          |

## 性能陷阱

小规模可行但用量增长后失败的模式。

| Trap                                                                           | Symptoms                                            | Prevention                                                                                  | When It Breaks                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 每次 storage 更新都对完整 settings 对象做 read-modify-write                    | 并发更新静默丢失（popup + content script 同时写入） | 按 key 写入；或通过 SW 单写者模式；将 history 结构化为 `history.<id>` 多 key 而非一个大数组 | 频繁使用下保存约 10 条 prompt/发送之后            |
| 把完整页面 `content`（50KB+）存入 `chrome.storage.local` 历史                  | 接近 10MB 配额；popup 挂载慢；存储警告              | 限制每条记录的存储内容；轮换历史（保留最近 N 条）；使用 `getBytesInUse()` 在 80% 时告警     | 抓取约 200 次内容密集页面之后                     |
| 每个适配器永远监听 `document.body` 的 `MutationObserver`（带 `subtree: true`） | 浏览器 tab CPU 满载；长时间 Discord 会话掉帧        | 找到元素后立刻断开 observer；观察最小稳定祖先；与一次性 promise 包装结合                    | SPA 路由切换后留下每次 dispatch 一个泄漏 observer |
| `waitForElement` 用紧密轮询循环而非 MutationObserver                           | CPU 高，特别是在虚拟化聊天列表上                    | 使用 MutationObserver 并在 resolve 时 `disconnect()`；紧密 `setInterval` 轮询仅作 fallback  | 在扩展激活的 Discord 打开几分钟内                 |
| 把整个 prompt 历史作为单一数组在每次新条目时整体重写                           | 二次方写入成本；竞态导致历史丢失 bug                | 每条记录用一个 storage key（`prompt-<id>`）；或追加日志                                     | 100+ 条历史项之后                                 |
| 草稿持久化没有 debounce（每次按键都写）                                        | storage 抖动；慢盘上的配额事件                      | debounce 100–250ms；多次按键合并为一次写                                                    | 长 prompt；慢 eMMC 的 Chromebook 用户             |
| 每平台一个 MutationObserver 始终在线（16 个适配器）                            | 所有 observer 在所有 tab 的每次 DOM 变更都触发      | 适配器基于活跃 dispatch 生命周期注册/注销 observer；绝不始终在线                            | v2 扩展超过 2 个平台时                            |

## 安全错误

通用 web 安全之外的领域特定安全问题。

| Mistake                                                           | Risk                                                                                                                                                      | Prevention                                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 把页面抓取的内容未经清洗直接注入到目标聊天                        | XSS 等价：恶意页面可以构造在注入为文本时在聊天中执行的"内容"（如 OpenClaw 的 Markdown 注入、Discord 的 mention 注入）                                     | 把页面抓取的内容当作纯文本。绝不作为 HTML 注入。发送到 Discord 时剥离 Discord mention 语法（`@everyone`、`<@id>`）；让用户显式 opt in 到带格式模式 |
| 信任 `document.title` / `document.querySelector('meta')` 而不转义 | 页面可以设置 `<title>](http://evil)</title>` —— 在聊天中显示为可点击链接                                                                                  | 当作原始文本处理；发送前转义 Markdown 关键字符；绝不在没有 `encodeURIComponent` 的情况下嵌入 URL 模板                                              |
| 把用户 prompt 存入 `chrome.storage.local` 而不视其为敏感          | 持有 `storage` 权限的其它扩展无法跨扩展读取，但任何获得调试器访问的（如其它持有 `debugger` 权限的扩展）可以读取。如果用户在 prompt 中放凭据，存在隐私风险 | 显式说明 prompt 可能含敏感内容；绝不向控制台记录 prompt（在 `__DEV__` 后门下）；提供"清除历史"选项                                                 |
| `host_permissions: ["<all_urls>"]` "保险起见"                     | 巨大的攻击面；审核拒绝；用户看到吓人的安装提示                                                                                                            | 仅特定模式；页面快照用 `activeTab`；新增平台通过可选权限 opt-in                                                                                    |
| 从远程 URL 加载任何代码                                           | Web Store 自动拒绝；CDN 被攻陷时存在任意代码执行风险                                                                                                      | 所有适配器代码都打包进包内。没有 `fetch().then(eval)`，没有远程 `<script>`，没有 `new Function(remoteString)`                                      |
| 跨扩展消息没有来源校验                                            | 其它扩展可以向 Web2Chat 的 SW 发送伪造消息                                                                                                                | 校验 `sender.id` 与扩展自身 ID 匹配；除非显式设计否则拒绝 `externally_connectable` 消息                                                            |
| 代码库任何位置出现 `eval` 或 `new Function`                       | CSP 拒绝；安全审核标记                                                                                                                                    | CI 中强制 ESLint `no-eval` + `no-new-func` 规则；如果依赖需要 eval，仅通过 `isolated_world` CSP 放宽来沙箱化                                       |
| 在错误报告中记录页面 URL                                          | URL 本身可能敏感（私密文档、query 中的 auth token）                                                                                                       | 错误报告剥除 query；让用户 opt-in"包含 URL"                                                                                                        |

## UX 陷阱

该领域常见的用户体验错误。

| Pitfall                                                                | User Impact                                                  | Better Approach                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 静默失败（dispatch "完成"但消息从未到达）                              | 用户毫无所知；首次发送失败就丧失信任                         | post-send 验证 observer；popup 中明确"已发送"/"失败"badge 与重试按钮                         |
| popup 关闭后没有"dispatch in flight"指示                               | 用户点到别处后无法确认是否已发送                             | dispatch 期间 action 图标 badge 显示文本（"..."）；完成时闪绿/红；保持到用户打开 popup       |
| 复用"send_to"历史而不显示目标预览                                      | 因为两个频道有相同友好名，用户发到错误频道                   | 下拉中显示频道 ID + 上次发送时间戳 + 平台图标；最近使用的固定置顶                            |
| prompt 与 send_to 漂移（历史搜索返回不匹配的对）                       | 用户在 send_to 选择"知识库 agent"，系统加载过时的通用 prompt | 把 prompt 与 send_to 绑成对；切换 send_to 同步换 prompt；显式"编辑 prompt"按钮               |
| SPA 重的站点页面快照显示坏掉的 `description`                           | 用户在发送前在 popup 看到垃圾内容                            | 通过 `requestIdleCallback` 等待 SPA 绘制后再快照；按 meta tag 链回退；让用户在发送前编辑字段 |
| popup 宽度不足以预览完整 URL                                           | 用户无法验证抓取的页面是否正确                               | URL 带 title-attribute tooltip；中间截断而非末尾（保留域名可见）                             |
| 键盘快捷键与目标页面冲突                                               | `Ctrl+Enter` 发送与 Discord 原生快捷键重叠                   | 使用独特组合（`Ctrl+Shift+Enter` 或 `Cmd+Enter`）；用户可配置；在 onboarding 中说明          |
| `send_to` URL 检测到的平台没有可见提示                                 | 用户粘贴 URL 后看不到任何变化，不知扩展是否识别该平台        | 用户输入时在 send_to 输入旁显示平台图标；显示"无法识别"状态以提示用户报问题                  |
| 缺失首次运行 onboarding                                                | 用户安装、打开 popup、看到空白 UI，卸载                      | 提供单屏 onboarding，指向 OpenClaw + Discord URL 示例；链接到文档                            |
| dispatch 错误文本技术化（"Error: cannot find element [data-list-id]"） | 用户无可操作建议                                             | 翻译为可操作："无法在 Discord 上找到聊天输入。请确保已登录并且频道页面已完整加载。"          |

## "看似完成但其实没"清单

看似完成但缺关键部分。

- [ ] **Discord adapter：** 经常缺 post-send 验证 —— 验证注入后 5 秒内 DOM 中出现带匹配前缀的新消息气泡。
- [ ] **Discord adapter：** 经常缺 Lexical 感知的注入 —— 验证文本能跨过一个 rAF tick（不被 reconcile 抹除）。
- [ ] **service worker：** 经常缺顶层事件监听器注册 —— 通过在 `chrome://extensions` 手动 kill SW 并复现 dispatch 路径来验证。
- [ ] **popup 状态：** 经常缺基于存储的恢复 —— 验证草稿能跨 popup 关闭/重开和浏览器重启持久化。
- [ ] **i18n：** 经常缺 HTML body 的 JS 替换 —— 验证用户选择 zh 时 popup 渲染 zh 字符串（而非字面 `__MSG_*__`）。
- [ ] **i18n：** 经常缺自定义 locale 加载器 —— 验证扩展内 zh ↔ en 切换确实改变 UI 而不需重启浏览器。
- [ ] **manifest：** 经常缺 v2 平台的 `optional_host_permissions` —— 验证用户可以仅授予 OpenClaw + Discord 权限完成安装。
- [ ] **manifest：** 经常缺最小 CSP —— 验证默认 CSP 未被放宽；任何地方都没有 `unsafe-eval`。
- [ ] **隐私政策：** 经常缺失或过时 —— 验证已发布政策提及每个抓取的数据字段（URL、title、description、content）和存储位置。
- [ ] **权限：** 经常 `host_permissions` 含未使用项 —— 验证每项映射到一个活跃的适配器；移除存在的 `<all_urls>`。
- [ ] **抓取流水线：** 经常缺 `description` 的回退 —— 验证抓取在客户端渲染 meta tag 的 SPA 上工作（如 Notion 公开页）。
- [ ] **抓取流水线：** 经常缺内容大小上限 —— 验证抓取大文章（>1MB body）不会塞满 `chrome.storage.local` 历史。
- [ ] **dispatch：** 经常缺幂等性 —— 验证快速双击发送恰好产生一条消息。
- [ ] **dispatch：** 经常缺登录墙处理 —— 验证未登录情况下向 Discord dispatch 时显示明确的"请登录"状态而非挂起。
- [ ] **测试：** 经常缺 SW 重启测试 —— 验证 Playwright 可以在测试中途 kill SW 而 dispatch 路径恢复。
- [ ] **distribution：** 经常缺审核员测试凭据 —— 验证 Web Store 提交注释包含 OpenClaw 测试 endpoint 和 Discord 测试服务器邀请。
- [ ] **快捷键：** 经常缺冲突检查 —— 验证 `commands` 快捷键不会在 popup 打开页面上覆盖 Discord/Slack 原生快捷键。

## 恢复策略

陷阱在防御后仍然发生时如何恢复。

| Pitfall                                     | Recovery Cost                                         | Recovery Steps                                                                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discord 发布 DOM 重构，所有用户的适配器崩溃 | MEDIUM                                                | 用新 ARIA fallback 热修复选择器层级；发布更新；用户在下次自动更新（1–24 小时）获得修复。添加运行时版本检查，当已知良好选择器全部失配时显示"适配器过时，请更新 Web2Chat" |
| 提交时 Web Store 拒绝                       | LOW（上架前）/ HIGH（上架后）                         | 阅读结构化拒绝代码；收紧权限；重新提交；如需申诉，提供权限逐项理由。上架前：损失 2–5 个工作日。上架后含用户：在单独审核队列上热修复                                     |
| service worker 在生产 dispatch 中途死亡     | 每用户 LOW（重试可行）/ 大规模 HIGH（看起来像不稳定） | 把状态从模块作用域迁移到 `chrome.storage.session`；添加可恢复状态机；发布更新。状态损坏的用户可以通过 post-send 验证失败检测到                                          |
| 本地 `chrome.storage.local` 配额超限        | LOW                                                   | 通过 `getBytesInUse()` 在 80% 显示"存储快满"警告；提供"清除超过 N 天的历史"UI 操作；新抓取限制内容大小                                                                  |
| 用户账号在 Discord 被封（selfbot 检测）     | HIGH（账号丢失永久）                                  | 无法恢复用户账号。通过限流、可选 v2 Bot API、明确 ToS 披露缓解。在 README 中说明这是任何用户账号自动化的已知风险                                                        |
| dispatch 双发已经发到聊天                   | LOW（单次重复）/ MEDIUM（级联重试）                   | 在更新中加入幂等性 key；下次打开 popup 时一次性致歉通知；用户报告时回溯日志检查                                                                                         |
| 隐私政策相对实际抓取数据已过时              | MEDIUM                                                | 更新政策 + Web Store 隐私实践 tab；提交更新。如果差距严重（抓取了未披露数据），临时下架 listing，修复后说明并重新提交                                                   |
| Lexical 注入技术被 Lexical 版本更新破坏     | MEDIUM                                                | 回退到替代技术（paste → input 事件 → 主世界桥接）；以级联方式发布更新。维护针对捕获 Lexical fixture HTML 的单元测试                                                     |

## 陷阱与阶段映射

roadmap 阶段应如何处理这些陷阱。

| Pitfall                        | Prevention Phase                   | Verification                                                                             |
| ------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------- |
| 1. React 受控输入 setter       | Dispatch Core                      | 单元测试：setter helper 在 React fixture 上产生触发 `onChange` 的更新                    |
| 2. Lexical / Slate 编辑器注入  | Discord Adapter（规范）            | 集成测试：合成 paste 跨过一个 rAF tick 并产生可发送的 Lexical 状态                       |
| 3. SW 生命周期 / dispatch 中断 | Extension Skeleton + Dispatch Core | 测试：通过 DevTools 在 dispatch 中途 kill SW；验证唤醒时从 `chrome.storage.session` 恢复 |
| 4. 顶层 await / importScripts  | Extension Skeleton                 | lint 规则 + manifest 校验；冷安装后 SW 无错注册                                          |
| 5. SPA 路由竞态                | Dispatch Core + 各 Adapter         | E2E 测试：Discord 上两次连续 dispatch 之间快速切换频道                                   |
| 6. DOM class 脆弱性            | OpenClaw Adapter / Discord Adapter | 双平台快照 fixture；运行时 canary 检查；强制选择器层级                                   |
| 7. 登录墙                      | Dispatch Core（生命周期 hook）     | E2E 测试：清除 cookie 后向 Discord dispatch；验证"请登录"状态                            |
| 8. 双发                        | Dispatch Core                      | 集成测试：快速双击恰好触发一次 `executeScript` 调用                                      |
| 9. Web Store 拒绝              | Distribution + 阶段 1 manifest     | 提交前清单；公开提交前的 staging 审核员反馈轮                                            |
| 10. popup 状态丢失             | Popup UI                           | E2E 测试：输入草稿、关闭 popup、重开；验证草稿和 dispatch 状态持久化                     |
| 11. i18n 限制                  | i18n 阶段                          | E2E 测试：扩展内切换 zh ↔ en；验证所有 UI 字符串（含动态）更新                           |
| 12. Discord ToS / 封号风险     | Discord Adapter + Distribution     | 代码审查：限流强制；README + listing 文案含明确披露                                      |

## 来源

**Chrome MV3 Service Worker 生命周期：**

- [The extension service worker lifecycle | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Extension service worker basics | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)
- [Migrate to a service worker | Chrome for Developers](https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/)
- [What are the execution time limits for the service worker in Manifest V3?](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/L3EbiNMjIGI)
- [MV3 ServiceWorker implementation is completely unreliable](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/jpFZj1p7mJc)
- [Cannot use importScripts after init in Web Extension](https://issues.chromium.org/issues/40737342)
- [Vibe Engineering: MV3 Service Worker Keepalive — How Chrome Keeps Killing Our AI Agent](https://medium.com/@dzianisv/vibe-engineering-mv3-service-worker-keepalive-how-chrome-keeps-killing-our-ai-agent-9fba3bebdc5b)

**React / Lexical / 编辑器注入：**

- [Trigger change events when the value of an input is changed programmatically — facebook/react #1152](https://github.com/facebook/react/issues/1152)
- [onChange not firing on controlled input element — facebook/react #8971](https://github.com/facebook/react/issues/8971)
- [Programmatically filled input does not fire onchange event — facebook/react #11095](https://github.com/facebook/react/issues/11095)
- [Trigger Input Updates with React Controlled Inputs (coryrylan.com)](https://coryrylan.com/blog/trigger-input-updates-with-react-controlled-inputs)
- [Lexical state updates (dio.la)](https://dio.la/article/lexical-state-updates)
- [Lexical Quick Start (Vanilla JS)](https://lexical.dev/docs/getting-started/quick-start)
- [Concordia — Inject JavaScript and CSS into Discord client](https://github.com/ebith/Concordia)

**Content Script Worlds 与 MutationObserver：**

- [Content scripts | Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Manifest content_scripts | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [Accessing website's window object in Chrome extension (Krystian Pracuk)](https://kpracuk.dev/articles/accessing-websites-window-object-in-chrome-extension/)
- [WXT Content Scripts guide](https://wxt.dev/guide/essentials/content-scripts)
- [MutationObserver — MDN](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [Wait for an element to exist — gist](https://gist.github.com/jwilson8767/db379026efcbd932f64382db4b02853e)

**存储与状态：**

- [chrome.storage API documentation](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Concurrent update of chrome.storage.local](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/y5hxPcavRfU)
- [Discuss limits applied to storage.local API — w3c/webextensions #351](https://github.com/w3c/webextensions/issues/351)
- [Increased quota for storage.local API — Chromium Issue 40264748](https://issues.chromium.org/issues/40264748)
- [Keep state of browser action — chromium-extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/Dn_X_CvMf20)

**i18n：**

- [chrome.i18n API | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/i18n)
- [i18n for extensions (Chromium design doc)](https://www.chromium.org/developers/design-documents/extensions/how-the-extension-system-works/i18n/)
- [intl-chrome-i18n — FormatJS-based wrapper](https://github.com/Collaborne/intl-chrome-i18n)
- [How to use i18n in popup.html — chromium-extensions group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/vYRadlkK0oU)

**CSP / 远程代码：**

- [Manifest Content Security Policy | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- [Will eval() be permitted in content scripts under Manifest V3?](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/MPcq-feSK9c/m/8svP70a7BQAJ)
- [chromium-isolated-world-csp-demo](https://github.com/hjanuschka/chromium-isolated-world-csp-demo)

**Web Store 审核 / 隐私：**

- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process/)
- [Updated Privacy Policy & Secure Handling Requirements](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Privacy Policies | Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [Limited Use | Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Troubleshooting Chrome Web Store violations](https://developer.chrome.com/docs/webstore/troubleshooting)
- [Chrome Web Store Rejection Codes (Medium)](https://medium.com/@bajajdilip48/chrome-web-store-rejection-codes-b71f817ceaea)
- [Why Chrome Extensions Get Rejected — Extension Radar](https://www.extensionradar.com/blog/chrome-extension-rejected)

**Discord 相关：**

- [Trust and Safety Investigations on Discord](https://discord.com/safety/360043712132-how-we-investigate)
- [Discord Warning System](https://support.discord.com/hc/en-us/articles/18210965981847-Discord-Warning-System)
- [AutoMod FAQ — Discord](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ)
- [Discord URI Schemes for developers](https://support.discord.com/hc/en-us/community/posts/6555511199895-Discord-URI-Schemes-for-developers)

**Playwright 扩展测试：**

- [Chrome extensions | Playwright](https://playwright.dev/docs/chrome-extensions)
- [Testing service worker code is flaky — microsoft/playwright #12103](https://github.com/microsoft/playwright/issues/12103)
- [How I Built E2E Tests for Chrome Extensions Using Playwright and CDP](https://dev.to/corrupt952/how-i-built-e2e-tests-for-chrome-extensions-using-playwright-and-cdp-11fl)
- [playwright-chrome-extension-testing-template](https://github.com/kelseyaubrecht/playwright-chrome-extension-testing-template)

---

_陷阱研究：Chrome MV3 Web Clipper 风格扩展，多 IM content script dispatch（Web2Chat —— MVP：OpenClaw + Discord）_
_研究日期：2026-04-28_
