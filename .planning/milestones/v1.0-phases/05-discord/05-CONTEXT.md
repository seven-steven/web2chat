# Phase 5: Discord 适配器 - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 在 Discord Web (`https://discord.com/channels/<g>/<c>`) 上交付第二条端到端投递链路：

1. **Discord adapter**：`entrypoints/discord.content.ts` 实现 `IMAdapter` 接口（`match`/`waitForReady`/`compose`/`send`/`canDispatch`），注册到 `shared/adapters/registry.ts`
2. **ClipboardEvent paste 注入**：通过合成 `ClipboardEvent('paste', { clipboardData: new DataTransfer(), bubbles: true })` 写入 Slate/Lexical 编辑器；不使用 `textContent=` / `innerText=`
3. **ARIA 优先选择器**：`role="textbox"` + `aria-label` 优先，`[data-slate-editor="true"]` 次选，class 片段兜底；全部 5s 硬超时
4. **SPA 路由感知**：`chrome.webNavigation.onHistoryStateUpdated` 顶层 listener + MutationObserver 等待频道锚点出现后再注入
5. **消息格式化 + 2000 字符截断**：Discord Markdown 方言 + prompt 完整优先 + content 截断
6. **Discord mention escape**：转义 `@everyone` / `@here` / `<@id>` / `<#channel>` / `<@&role>` 防止意外 mention
7. **限流守卫**：同一 channel 5s 内拒绝重复 dispatch，错误码 `RATE_LIMITED`
8. **登录检测**：检测 `/login?redirect_to=...` 跳转，surfacing `NOT_LOGGED_IN`
9. **ToS 风险声明**：popup 条件性脚注 + README 双语章节
10. **E2E 验证**：Playwright 覆盖 dispatch + 频道切换 + 未登录路径

Phase 5 **不包含**：

- OpenClaw 适配器的修改（Phase 4 已稳定）
- 运行时 locale 切换（Phase 6）
- ESLint 完整版 hardcoded-string detector（Phase 6）
- PRIVACY.md（Phase 7）
- 多条消息切分（v1.x）
- 失败队列 + 自动重试（v1.x）
- 多目标 fan-out（v1.x）

</domain>

<decisions>
## Implementation Decisions

### 1. 消息格式化 (D-54..D-56)

- **D-54:** **同 OpenClaw 字段顺序 + Discord Markdown 方言**。compose() 输出的消息格式：prompt 在前（用户指令），空行后 snapshot 字段按 title → url → description → create_at → content 排列。使用 Discord 支持的 Markdown 子集（`**bold**` 替代 `## heading`，保留 ` ```code``` `、`> quote`、`[link](url)`）。与 OpenClaw D-39/D-40 保持语义一致，仅调整 Markdown 格式以适配 Discord 渲染引擎。
- **D-55:** **单条消息 + prompt 优先截断**。Discord 单消息 2000 字符硬限制。超长时：(1) prompt 保证完整；(2) title、url 保证完整；(3) description 保留但可被截断；(4) content 最先被截断。截断位置加 `\n...[truncated]` 后缀。截断逻辑集中在 `shared/adapters/discord-format.ts`（与 OpenClaw 的 `openclaw-format.ts` 平行）。
- **D-56:** **多条消息切分留 v1.x**。v1 只发一条消息，超长内容截断后以 url 为兜底（AI Agent 可通过 url 自行获取全文）。多条切分引入循环 compose+send + rate limit 放宽 + 失败回滚，复杂度不值得在 MVP 引入。

### 2. Discord 特殊语法 escape (D-57..D-58)

- **D-57:** **只转义 mention pattern**。转义范围：`@everyone` → `@​everyone`、`@here` → `@​here`、`<@数字>` / `<@!数字>` / `<@&数字>` / `<#数字>` → 在 `<` 后插入零宽空格破坏 pattern。不转义 Discord Markdown 格式标记（`||spoiler||`、`~~strikethrough~~` 等）——这些是用户可能有意使用的格式。
- **D-58:** **escape 函数位置 = `shared/adapters/discord-format.ts`**。与 compose 格式化放同一文件。在 compose 前对 snapshot 的 content / description / title 以及 prompt 统一跑 escape。纯函数，可在单元测试中直接验证。

### 3. ToS 风险声明 (D-59..D-61)

- **D-59:** **条件性 popup 脚注**。仅当 send_to 被 adapter registry 识别为 Discord 时，popup 底部显示一行小字体警告（如 `⚠ Discord 投递使用 DOM 注入，可能违反 ToS。详情`），"详情"链接到 README 的风险声明章节。不阻断操作流程，不弹确认框。
- **D-60:** **README 双语 ToS 章节**。README.md 中增加 `## Discord ToS Notice` / `## Discord ToS 声明` 双语章节（Phase 7 分发时写入），内容：DOM 注入 = 自动化操作 = 可能触发 Discord 检测 / 账号风险；用户自行承担。Phase 5 在 CONTEXT.md 中锁定文案意图，Phase 7 落地具体文件。
- **D-61:** **i18n 命名空间 = `discord.tos.*`**。脚注文案走 i18n，en + zh_CN 100% 同构。

### 4. 选择器与 DOM 交互 (D-62..D-65)

- **D-62:** **ARIA 优先三级 fallback**。选择器优先级：(1) `[role="textbox"][aria-label*="Message"]`；(2) `[data-slate-editor="true"]`；(3) class 片段兜底（如 `div[class*="textArea"]`）。三级按顺序 try，首个命中即用。全部 5s 硬超时。
- **D-63:** **ClipboardEvent paste 注入**。compose 通过 `new ClipboardEvent('paste', { clipboardData, bubbles: true })` 注入格式化文本到 Slate/Lexical 编辑器。`DataTransfer.setData('text/plain', message)` 设置纯文本载荷。绝不使用 `textContent=` / `innerText=` / `document.execCommand`。
- **D-64:** **Enter keydown 触发发送**。compose 完成后发送 `KeyboardEvent('keydown', { key: 'Enter', bubbles: true })`。Discord 默认 Enter = 发送（非 Shift+Enter）。
- **D-65:** **MutationObserver 确认上屏**。send() 后用 MutationObserver 监听消息列表容器（`[data-list-id="chat-messages-*"]` 或类似），检测新消息 DOM 节点添加。5s 超时兜底。

### 5. SPA 路由与频道切换 (D-66..D-68)

- **D-66:** **webNavigation.onHistoryStateUpdated 顶层 listener**。在 `entrypoints/background.ts` 的 `defineBackground` 闭包内顶层同步注册 `chrome.webNavigation.onHistoryStateUpdated.addListener(...)`，仅监听 `url: [{hostSuffix: 'discord.com'}]` filter。用于 SPA 频道切换时推进 dispatch state machine。
- **D-67:** **waitForReady = 频道锚点 DOM 出现**。adapter 的 `waitForReady` 等待频道相关锚点（如 `[data-list-id="chat-messages-<channelId>"]`）出现。channelId 从 URL path 最后一段解析。5s 超时返回 `Err('TIMEOUT')`。
- **D-68:** **频道切换安全**。每次 compose 前重新验证当前 URL 的 channelId 与 dispatch 目标一致。不一致则返回 `Err('INPUT_NOT_FOUND', 'Channel mismatch')`。防止快速连续投递跨频道误注入。

### 6. 限流与错误处理 (D-69..D-72)

- **D-69:** **5s 同 channel 限流**。adapter 内维护 `lastSendTime: Map<string, number>`（channelId → timestamp）。同一 channelId 5s 内第二次 dispatch 直接返回 `Err('RATE_LIMITED', ...)`。i18n 文案提示"请稍后再试"。
- **D-70:** **登录检测 = URL redirect**。adapter 的 `canDispatch` 检查当前 URL 是否包含 `/login` path。如果 tabs.onUpdated:complete 后 tab URL 变为 `https://discord.com/login?redirect_to=...`，dispatch-pipeline 检测到 URL 不匹配 adapter.match()，返回 `Err('NOT_LOGGED_IN')`。无需额外 DOM 探测。
- **D-71:** **ErrorCode 无需扩展**。Phase 5 复用现有 ErrorCode：`NOT_LOGGED_IN` / `INPUT_NOT_FOUND` / `TIMEOUT` / `RATE_LIMITED`。无需新增 Discord 专属错误码（与 OpenClaw 的 `OPENCLAW_OFFLINE` / `OPENCLAW_PERMISSION_DENIED` 不同，Discord 的错误都可映射到已有码）。
- **D-72:** **manifest permissions 不变**。`host_permissions: ["https://discord.com/*"]` 已在 Phase 1 manifest 中声明。Phase 5 不修改 manifest permissions（无需动态权限——Discord 是公共域名，已静态声明）。新增 `webNavigation` permission（`chrome.webNavigation.onHistoryStateUpdated` 需要此权限）。

### Claude's Discretion

下列决策委托给 plan 阶段：

- **Discord textbox 的精确 ARIA selector 参数**：`aria-label` 的精确值（"Message #channel-name" pattern）由研究阶段从 Discord DOM fixture 确认。
- **频道锚点的精确 DOM selector**：`data-list-id` 的精确 pattern 由研究阶段确认。
- **compose Markdown 模板的精确格式**：D-54 锁定了"Discord MD 方言 + 同 OpenClaw 字段顺序"，具体的 bold/quote/link 格式细节由 plan 决定。
- **Discord DOM fixture 的获取方式**：手工快照 vs 自动化抓取。推荐：手工快照（ADD-09 明确基于"捕获到的"fixture）。
- **popup 脚注的精确视觉样式**：D-59 锁定了"条件性小字体"，具体颜色/间距由 plan 决定。
- **webNavigation permission 是否需要 bump manifest**：研究阶段确认 WXT 0.20.x 是否自动从 `onHistoryStateUpdated` 使用推导 permission。
- **E2E fixture 形态**：本地 stub Discord 页面（HTML fixture with Slate editor mock）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目顶层上下文

- `CLAUDE.md` — SW 纪律、权限模型、DOM 注入约定（ClipboardEvent paste for Slate/Lexical）、适配器模式
- `.planning/PROJECT.md` — Core Value、约束、Key Decisions 表
- `.planning/REQUIREMENTS.md` §"Adapter: Discord (MVP 通道 2)" — Phase 5 对应的 9 条 REQ-ID（ADD-01..09）的可观察验收要求
- `.planning/ROADMAP.md` §"Phase 5: Discord 适配器" — 5 条成功标准的精确措辞

### 先前 Phase 上下文

- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01..D-12（typed messaging、Result/ErrorCode 模型、storage migration 框架）
- `.planning/phases/03-dispatch-popup/03-CONTEXT.md` — D-23..D-38（IMAdapter 接口、adapter-registry、dispatch state machine、popupDraft、ErrorBanner）
- `.planning/phases/04-openclaw/04-CONTEXT.md` — D-39..D-53（OpenClaw adapter 参考实现、消息格式化、DOM 注入 helper、canDispatch 探针模式）；**特别注意 Deferred → Phase 5 清单**

### 已有代码（Phase 5 直接扩展点）

- `shared/adapters/types.ts` — IMAdapter + AdapterRegistryEntry 接口；`PlatformId` 已包含 `'discord'`
- `shared/adapters/registry.ts` — adapterRegistry 数组 + `// Phase 5 will append { id: 'discord', ... }` 注释
- `shared/messaging/result.ts` — ErrorCode 联合；Phase 5 不追加新码
- `background/dispatch-pipeline.ts` — dispatch state machine；Phase 5 需在顶层注册 `webNavigation.onHistoryStateUpdated` listener
- `entrypoints/openclaw.content.ts` — Phase 4 adapter 参考实现（handleDispatch / waitForElement / waitForNewMessage 模式）
- `shared/adapters/openclaw-format.ts` — compose 格式化参考；Phase 5 创建平行的 `discord-format.ts`
- `shared/dom-injector.ts` — Phase 4 的 setInputValue helper；Phase 5 **不使用**（Discord 走 ClipboardEvent 路径）
- `entrypoints/popup/components/SendForm.tsx` — Phase 5 需在此组件添加条件性 ToS 脚注
- `entrypoints/popup/components/PlatformIcon.tsx` — Phase 5 需添加 Discord icon
- `shared/i18n/` — en + zh_CN locale；Phase 5 新增 `discord.*` / `discord.tos.*` 命名空间

### 技术与架构调研

- `.planning/research/ARCHITECTURE.md` §"模式 2：IMAdapter 注册表" + §"模式 3：以编程注入取代静态 content_scripts" — adapter 注册与动态注入模式
- `.planning/research/PITFALLS.md` §陷阱 7（登录墙）、§陷阱 9（Web Store 拒绝 / 过宽权限）
- `.planning/research/FEATURES.md` — adapter 入口契约

### 外部权威文档

- Chrome MV3 §`chrome.webNavigation.onHistoryStateUpdated` — SPA 路由监听
- Chrome MV3 §`chrome.scripting.executeScript` — adapter 注入
- MDN `ClipboardEvent` / `DataTransfer` — Slate/Lexical paste injection 原理
- Discord Developer Documentation §"Message Formatting" — Markdown 子集、mention 语法
- WXT 0.20.x §"content scripts" — `registration: 'runtime'` 配置

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`shared/adapters/registry.ts`** — Phase 5 在 `adapterRegistry` 数组中 append `{ id: 'discord', match, scriptFile, hostMatches: ['https://discord.com/*'], iconKey: 'platform_icon_discord' }` entry
- **`shared/adapters/types.ts`** — `PlatformId` union 已包含 `'discord'`；`IMAdapter` 接口无需修改
- **`background/dispatch-pipeline.ts`** — dispatch state machine 不变。Phase 5 仅在 `entrypoints/background.ts` 追加 `webNavigation.onHistoryStateUpdated` 顶层 listener
- **`entrypoints/openclaw.content.ts`** — 参考 adapter 实现：`defineContentScript({ registration: 'runtime', main() })` + one-shot `ADAPTER_DISPATCH` listener + `handleDispatch` 函数结构。Phase 5 discord adapter 遵循同一协议
- **`shared/messaging/result.ts`** — ErrorCode 联合。Phase 5 不追加新码
- **`entrypoints/popup/components/ErrorBanner.tsx`** — 已有错误展示组件。Phase 5 的 `NOT_LOGGED_IN` / `RATE_LIMITED` 直接复用
- **`entrypoints/popup/components/SendForm.tsx`** — Phase 5 在此组件底部加条件性 ToS 脚注
- **`entrypoints/popup/components/PlatformIcon.tsx`** — Phase 5 添加 Discord icon case
- **`shared/i18n/`** — en + zh_CN locale 100% 同构。Phase 5 新增 `discord.*` / `discord.tos.*` 命名空间
- **`scripts/verify-manifest.ts`** — 已断言 `host_permissions === ["https://discord.com/*"]`。Phase 5 需新增 `webNavigation` 到 expected permissions 集合

### Established Patterns

- **SW 顶层 listener 注册**：`webNavigation.onHistoryStateUpdated` 必须在 `defineBackground` 顶层闭包同步路径注册
- **adapter 注册 = 单文件**：append registry entry + 创建 `entrypoints/discord.content.ts`
- **content script 协议**：one-shot `ADAPTER_DISPATCH` message listener
- **compose 格式化 = 独立纯模块**：`shared/adapters/discord-format.ts`（与 `openclaw-format.ts` 平行）
- **Result 单一路径**：所有错误走 `Err(code, ...)`

### Integration Points

- `shared/adapters/registry.ts` — Phase 5 append discord entry 后，popup platformDetector + SW dispatch-pipeline 自动发现
- `entrypoints/background.ts` — 新增 `webNavigation.onHistoryStateUpdated` listener（需 `webNavigation` permission）
- `scripts/verify-manifest.ts` — expected permissions 集合需同步新增 `webNavigation`
- `entrypoints/popup/components/SendForm.tsx` — 条件性 ToS 脚注
- Phase 6 i18n 审计时需覆盖 `discord.*` / `discord.tos.*` 命名空间

</code_context>

<specifics>
## Specific Ideas

- **Discord compose Markdown 模板示意**：

  ```
  {prompt}

  **{title}**
  {url}

  > {description}

  > 采集时间: {create_at}

  {content}
  ```

  Discord 不支持 `##` heading，改用 `**bold**`。空字段整行省略。超 2000 字符从 content 尾部截断 + `\n...[truncated]`。

- **mention escape 示例**：

  ```ts
  // shared/adapters/discord-format.ts
  function escapeMentions(text: string): string {
    return text
      .replace(/@(everyone|here)/g, '@​$1')
      .replace(/<@[!&]?\d+>/g, (m) => m[0] + '​' + m.slice(1))
      .replace(/<#\d+>/g, (m) => m[0] + '​' + m.slice(1));
  }
  ```

- **adapter registry entry**：

  ```ts
  {
    id: 'discord',
    match: (url: string): boolean => {
      try {
        const u = new URL(url);
        return u.hostname === 'discord.com'
          && u.pathname.startsWith('/channels/')
          && !u.pathname.startsWith('/channels/@me/');
      } catch { return false; }
    },
    scriptFile: 'content-scripts/discord.js',
    hostMatches: ['https://discord.com/*'],
    iconKey: 'platform_icon_discord',
  }
  ```

- **ClipboardEvent paste injection**：

  ```ts
  function pasteText(editor: HTMLElement, text: string): void {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }));
  }
  ```

- **popup ToS 脚注（条件性）**：

  ```tsx
  {platformId === 'discord' && (
    <footer class="mt-2 text-xs text-amber-600">
      ⚠ {t('discord.tos.warning')}
      <a href="..." class="underline ml-1">{t('discord.tos.details')}</a>
    </footer>
  )}
  ```

- **i18n 命名空间**（en + zh_CN 100% 同构）：
  - `discord.tos.warning` — "Discord 投递使用 DOM 注入，可能违反 Discord 服务条款。"
  - `discord.tos.details` — "详情"
  - `platform_icon_discord` — "Discord"
  - `error.code.rate_limited` — 已存在（Phase 3），无需新增

- **Playwright E2E 策略**：
  - `tests/e2e/discord-dispatch.spec.ts` — 本地 stub Discord 页面（HTML fixture with Slate editor mock + 消息列表容器）→ popup Confirm → 消息落入编辑器
  - `tests/e2e/discord-channel-switch.spec.ts` — 快速连续两个不同频道 dispatch → 不跨频道误注入
  - `tests/e2e/discord-login.spec.ts` — 目标 URL redirect 到 /login → popup 展示 NOT_LOGGED_IN 错误

- **单元测试策略**：
  - `tests/unit/adapters/discord-format.spec.ts` — compose 格式化 + 截断 + mention escape
  - `tests/unit/adapters/discord-selector.spec.ts` — 基于 `tests/unit/adapters/discord.fixture.html` 验证 ARIA 优先选择器 + paste injection
  - `tests/unit/adapters/discord-match.spec.ts` — URL 匹配正反例（含 /channels/@me/ DM 拒绝、/login redirect 拒绝）

</specifics>

<deferred>
## Deferred Ideas

### 留 Phase 6 (i18n 加固)

- 运行时 locale 切换（I18N-02）
- ESLint 完整版 hardcoded-string detector（I18N-03）
- Discord ToS 脚注文案"语气/行动指引"打磨

### 留 Phase 7 (分发)

- README Discord ToS 章节具体文件落地（D-60 在此锁定文案意图）
- PRIVACY.md 列出 dispatch + 权限字段流向

### 留 v1.x

- 多条消息切分（D-56 显式 defer）
- 失败队列 + chrome.alarms 重试
- 多目标 fan-out
- 自定义消息模板 `{{title}}` / `{{url}}` 等变量
- 内容截断策略全局统一（跨平台 adapter 统一截断接口）

</deferred>

---

*Phase: 05-discord*
*Context gathered: 2026-05-05*
