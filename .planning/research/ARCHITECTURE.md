# 架构调研 — v1.1 多渠道适配 + 投递鲁棒性

**领域：** Chrome MV3 浏览器扩展 — Web Clipper + 多 IM 投递自动化
**覆盖范围：** v1.1 milestone（多适配器架构扩展 + 投递链路加固）
**调研时间：** 2026-05-09
**置信度：** HIGH（基于已交付的 v1.0 代码库进行增量架构分析）

> 本文档是 v1.0 架构调研的增量更新。v1.0 的完整架构描述（系统概览、组件职责、数据流、构建顺序、权限模型、反模式等）仍然有效且不再重复。本文聚焦 v1.1 三大焦点：
> 1. 多适配器架构扩展
> 2. 投递链路鲁棒性提升
> 3. 多平台动态权限管理

---

## v1.0 架构现状评估

v1.0 已交付的架构为 v1.1 提供了坚实的扩展基础：

**已经做对的部分（不需要改动）：**
- `IMAdapter` 接口和 `AdapterRegistryEntry` 描述符设计已验证可扩展
- `shared/adapters/registry.ts` 的纯函数注册表模式（popup + SW 双端消费）正确
- 投递状态机（`pending → opening → awaiting_complete → awaiting_adapter → done/error/cancelled`）覆盖了 SW 重启场景
- `chrome.storage.session` 逐键隔离（`dispatch:<id>`）避免了并发竞态
- 适配器 content script 的 `registration: 'runtime'` + 全局守卫模式防止重注入
- MAIN world paste 桥接（Discord）建立了处理富文本编辑器的标准路径
- `shared/dom-injector.ts` 的 property-descriptor setter 是所有 `<input>`/`<textarea>` 适配器的基础工具
- `optional_host_permissions: ["<all_urls>"]` + 运行时 `chrome.permissions.request` 已为 OpenClaw 验证

**需要在 v1.1 改进的部分：**

| 问题 | 现状 | v1.1 目标 |
|------|------|-----------|
| `PlatformId` 是硬编码联合类型 | `'mock' \| 'openclaw' \| 'discord'` | 需要为每个新平台扩展 |
| `ErrorCode` 是硬编码联合类型 | 含 10 个错误码 | 新平台可能引入新错误码 |
| SPA 路由检测仅覆盖 Discord | `webNavigation.onHistoryStateUpdated` 硬编码 `discord.com` | 需要泛化为多平台 |
| MAIN world paste 仅服务 Discord | `DISCORD_MAIN_WORLD_PASTE_PORT` 硬编码 | Slack/Telegram 等平台也需要 MAIN world 注入 |
| 投递无重试机制 | 失败后用户需手动重新操作 | 可重试的错误应支持自动/半自动重试 |
| 适配器选择器无运行时健康检查 | 依赖 fixture 测试 | 运行时 canary 验证选择器唯一性 |
| 登录检测逻辑分散 | Discord 特定函数在 content script 中 | 可泛化为适配器契约的一部分 |

---

## 焦点 1：多适配器架构扩展

### 当前适配器注册表机制

```
shared/adapters/registry.ts
  ├── adapterRegistry: readonly AdapterRegistryEntry[]
  ├── findAdapter(url) → AdapterRegistryEntry | undefined
  └── detectPlatformId(url) → PlatformId | null

shared/adapters/types.ts
  ├── PlatformId = 'mock' | 'openclaw' | 'discord'
  ├── IMAdapter (interface) — content script 端契约
  └── AdapterRegistryEntry (interface) — SW/popup 端描述符
```

新平台适配器加入 = 以下文件的改动：

| 改动 | 文件 | 内容 |
|------|------|------|
| 1. 新增 PlatformId | `shared/adapters/types.ts` | 扩展联合类型 |
| 2. 新增注册表条目 | `shared/adapters/registry.ts` | `{ id, match(), scriptFile, hostMatches, iconKey }` |
| 3. 新增 content script | `entrypoints/<platform>.content.ts` | 实现 `ADAPTER_DISPATCH` 消息处理器 |
| 4. 新增格式化工具 | `shared/adapters/<platform>-format.ts` | 消息格式化（markdown/纯文本） |
| 5. 新增登录检测（可选） | `shared/adapters/<platform>-login-detect.ts` | DOM 登录墙探测 |
| 6. 新增 fixture + 测试 | `tests/unit/adapters/<platform>.*` | DOM fixture + 单元测试 |
| 7. 新增 i18n key | `locales/*.yml` | `platform_icon_<platform>` |
| 8. 新增平台图标 | `public/icon/` | SVG 或 PNG 图标 |

### 架构变更建议

#### 变更 A：`PlatformId` 从硬编码联合转为 `string` + 运行时校验

**问题：** 每个 `PlatformId` 新增都涉及修改 `types.ts` 的联合类型，这会在 v1.1 多平台并行开发时造成合并冲突。

**方案：** 保持 `PlatformId` 为 `string` 的 branded type，通过注册表条目的 `id` 字段约束合法值：

```typescript
// shared/adapters/types.ts
export type PlatformId = string & { readonly __brand: unique symbol };

// shared/adapters/registry.ts — 注册表是唯一合法 PlatformId 来源
function asPlatformId(id: string): PlatformId { return id as PlatformId; }

export const adapterRegistry = [
  { id: asPlatformId('mock'), ... },
  { id: asPlatformId('openclaw'), ... },
  { id: asPlatformId('discord'), ... },
  // v1.1: 新平台在此追加
  { id: asPlatformId('slack'), ... },
] as const;
```

**取舍：** 失去 switch 语句的穷举检查；通过注册表唯一性约束（`Set<PlatformId>` 检查）补偿。这是正确的取舍——switch 穷举检查在 2 个平台时有用，在 10+ 个平台时反而阻碍了并行开发。

#### 变更 B：MAIN world paste 桥接从 Discord 专用泛化为通用

**问题：** 当前 `entrypoints/background.ts` 的 `DISCORD_MAIN_WORLD_PASTE_PORT` 和 `discordMainWorldPaste` 函数是 Discord 专用。Slack（Quill）、Telegram（自定义 contenteditable）等平台同样需要 MAIN world 注入。

**方案：** 将 MAIN world 桥接泛化为基于 `port.name` 前缀的路由：

```typescript
// entrypoints/background.ts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name.startsWith('WEB2CHAT_MAIN_WORLD_INJECT:')) {
    const platformId = port.name.split(':')[1];
    handleMainWorldInject(port, platformId);
  }
});

async function handleMainWorldInject(port, platformId) {
  const adapter = findAdapterById(platformId);
  if (!adapter) { port.postMessage({ ok: false }); return; }

  const { tabId } = port.sender.tab;
  const { text } = port.onMessage;

  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: adapter.mainWorldInjector,  // 每个适配器提供自己的 MAIN world 函数
    args: [text],
  });
}
```

**取舍：** 每个适配器需要提供自己的 `mainWorldInjector` 函数。SW 负责调度，但不硬编码任何平台 DOM 逻辑。这比当前的 Discord 硬编码方式更符合 CLAUDE.md 的适配器模式约定（"投递核心绝不硬编码任何平台特定逻辑"）。

#### 变更 C：ErrorCode 扩展机制

**问题：** `ErrorCode` 是硬编码联合类型，每个新平台可能引入特定错误码。

**方案：** 保持显式联合类型，但按平台命名空间组织：

```typescript
// shared/messaging/result.ts
export type ErrorCode =
  // 通用错误（SW/pipeline 层）
  | 'INTERNAL'
  | 'PLATFORM_UNSUPPORTED'
  | 'EXECUTE_SCRIPT_FAILED'
  | 'TIMEOUT'
  // 适配器通用（所有适配器可能返回）
  | 'NOT_LOGGED_IN'
  | 'INPUT_NOT_FOUND'
  | 'RATE_LIMITED'
  // 平台特定（前缀区分）
  | 'OPENCLAW_OFFLINE'
  | 'OPENCLAW_PERMISSION_DENIED';
  // v1.1: 按需追加，如 'SLACK_WORKSPACE_MISMATCH'
```

保留显式联合（而非 `string`）是因为 `Result<T, E>` 的类型推导依赖它，且错误码是面向 popup UI 的用户可见标识——需要 exhaustiveness。

#### 变更 D：新增适配器的模板与规范

每个新适配器必须遵循以下模板（基于 Discord/OpenClaw 已验证的模式）：

```
entrypoints/<platform>.content.ts  — 标准结构：
  1. defineContentScript({ matches: [], registration: 'runtime', main() { ... } })
  2. 全局守卫：__web2chat_<platform>_registered
  3. onMessage listener → handleDispatch(payload) → AdapterDispatchResponse
  4. handleDispatch 内部流程：
     a. 登录墙预检（路径 + DOM 双重检测）
     b. URL 参数校验（channelId/workspaceId 等）
     c. 限流检查（per-channel/per-workspace，5s 窗口）
     d. waitForReady（MutationObserver 竞速登录墙探测）
     e. compose（消息格式化 + DOM 注入）
     f. send（Enter keydown 或发送按钮点击）
     g. confirm（MutationObserver 等待新消息节点出现）
     h. 返回 { ok: true } 或 { ok: false, code, message, retriable }
```

### 集成点：新适配器与现有组件的连接

```
新增适配器的代码流：

用户在 popup 输入 send_to URL
       │
       ▼
popup → findAdapter(url)  ← registry.ts 新增条目自动被发现
       │
       ▼
popup 显示平台图标        ← iconKey 指向新 i18n key
       │
       ▼
用户点击 Confirm
       │
       ▼
SW → startDispatch()
       │
       ├─ findAdapter(url)                ← 同一注册表
       ├─ openOrActivateTab(send_to)
       ├─ onTabComplete 等待
       ├─ advanceToAdapterInjection()     ← 注入新适配器的 scriptFile
       └─ tabs.sendMessage(ADAPTER_DISPATCH)
              │
              ▼
       新适配器 content script 处理
              │
              ▼
       返回 { ok, code?, message?, retriable? }
              │
              ▼
       SW → succeedDispatch / failDispatch
              │
              ▼
       popup 通过 storage.onChanged 更新 UI
```

**关键发现：** 新增一个适配器 **不需要改动** `dispatch-pipeline.ts`、`background.ts`（MAIN world 桥接泛化后）或 popup 任何代码。注册表 + 新 content script 文件 + 新测试 = 全部改动。这验证了 v1.0 适配器模式的可扩展性设计。

---

## 焦点 2：投递链路鲁棒性提升

### 2.1 SPA 路由检测泛化

**v1.0 现状：** `background.ts` 为 Discord 硬编码了 `webNavigation.onHistoryStateUpdated`：

```typescript
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    void onTabComplete(details.tabId, { status: 'complete' }, ...);
  },
  { url: [{ hostSuffix: 'discord.com' }] },
);
```

**问题：** 每个新 SPA 平台（Slack、Telegram、Feishu）都需要在此处添加新的 filter 条件。这是违反适配器模式的硬编码。

**方案：** 从注册表动态构建 `webNavigation` filter：

```typescript
// entrypoints/background.ts — 泛化 SPA 路由检测
function buildSpaHostFilters(): chrome.events.UrlFilter[] {
  return adapterRegistry
    .filter(entry => entry.hostMatches.length > 0)
    .flatMap(entry => entry.hostMatches.map(pattern => {
      try {
        const host = new URL(pattern.replace('/*', '').replace('*', 'x')).hostname;
        return { hostSuffix: host };
      } catch { return null; }
    }))
    .filter(Boolean);
}

// 顶层注册（保持 MV3 SW 生命周期安全）
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    void onTabComplete(details.tabId, { status: 'complete' }, {
      url: details.url,
    } as chrome.tabs.Tab);
  },
  { url: buildSpaHostFilters() },
);
```

**注意：** `buildSpaHostFilters()` 在模块顶层调用是安全的——`adapterRegistry` 是静态数组，不依赖 `chrome.*` API。filter 在 SW 生命周期内构建一次，重启时重建。

**取舍：** `webNavigation` 权限已经是 manifest 中的必需权限（v1.0 已声明），所以这里没有新增权限负担。但如果某平台不是 SPA（如 OpenClaw 用的普通导航），它不应该出现在 filter 中——通过 `hostMatches` 的存在性区分：只有 `hostMatches.length > 0` 的公共平台需要 SPA 检测。

### 2.2 投递重试机制

**v1.0 现状：** 投递失败后用户需要手动回到 popup 重新操作。`retriable: true` 的错误标记了哪些可以重试，但没有自动重试。

**方案：** 分层重试策略——不在 SW 内自动重试（SW 生命周期不可靠），而是在 popup 端提供重试 UI：

```
投递失败
    │
    ├─ retriable: true
    │     │
    │     ▼
    │   popup 显示错误横幅 + "重试" 按钮
    │   重试 = 新的 dispatchId，但复用 send_to + prompt + snapshot
    │   snapshot 从 dispatch:<id> record 读取（仍在 session storage 中）
    │     │
    │     ▼
    │   用户点击"重试" → dispatch.start（新 UUID，同 payload）
    │
    └─ retriable: false
          │
          ▼
        popup 显示错误横幅 + 不可重试提示
        （如 PLATFORM_UNSUPPORTED）
```

**不在 SW 内自动重试的理由：**
1. MV3 SW 可能在重试等待期间被终止
2. 自动重试对 Discord/Slack 等平台有 ToS 风险（触发垃圾检测）
3. 用户应看到失败原因并决定是否重试

**popup 端重试的数据流：**

```
popup 检测到 dispatch state === 'error' && retriable === true
    │
    ▼
显示"重试"按钮
    │
    ▼
用户点击 → 从 dispatch:<id> record 读取 snapshot + send_to + prompt
    │
    ▼
生成新 UUID → dispatch.start({ dispatchId: newUuid, ... })
```

**不需要的改动：** `dispatch-pipeline.ts` 本身不需要重试逻辑。重试只是 popup UI 层的新操作——复用完全相同的 `dispatch.start` 路径。幂等性由新的 `dispatchId` 保证。

### 2.3 适配器选择器运行时健康检查

**问题：** IM 厂商频繁更新 DOM。当前依赖开发时的 fixture 测试，但用户在线上遇到的 DOM 变化无法提前发现。

**方案：** 在适配器的 `findEditor()` 函数中添加 canary 验证：

```typescript
// 适配器 content script 中的 canary 模式
function findEditor(): { el: HTMLElement; confidence: 'high' | 'low' } | null {
  // Tier 1: ARIA selector（最稳定）
  const tier1 = document.querySelector('[role="textbox"][aria-label*="Message"]');
  if (tier1) return { el: tier1, confidence: 'high' };

  // Tier 2: data attribute
  const tier2 = document.querySelector('[data-slate-editor="true"]');
  if (tier2) return { el: tier2, confidence: 'medium' };

  // Tier 3: class fragment（最不稳定）
  const tier3 = document.querySelector('div[class*="textArea"] [contenteditable="true"]');
  if (tier3) return { el: tier3, confidence: 'low' };

  return null;
}
```

当 `confidence === 'low'` 时，适配器仍然尝试注入，但在响应中附加警告：

```typescript
return {
  ok: true,
  warning: 'SELECTOR_LOW_CONFIDENCE',  // 可选字段
  message: 'Editor found via fallback selector — may break on next update',
};
```

popup 端可以显示这个警告为非阻断提示："检测到编辑器使用备用选择器，请确认消息已发送成功。"

### 2.4 投递超时分层

**v1.0 现状：** 两层超时——
- 全局 30s alarm（`DISPATCH_TIMEOUT_MINUTES = 0.5`）
- 适配器响应 20s（`ADAPTER_RESPONSE_TIMEOUT_MS = 20_000`）

**问题：** 不同平台的加载特性差异大。Discord 冷启动可达 15s；OpenClaw 本地通常 <2s。统一 30s 太慢（快速平台白白等待）又可能太快（复杂 SPA）。

**方案：** 将超时参数移入 `AdapterRegistryEntry`：

```typescript
// shared/adapters/types.ts — 扩展 AdapterRegistryEntry
export interface AdapterRegistryEntry {
  readonly id: PlatformId;
  match(url: string): boolean;
  readonly scriptFile: string;
  readonly hostMatches: readonly string[];
  readonly iconKey: string;
  /** 最大等待时间（ms），tab 从 opening 到 done。默认 30_000。 */
  readonly dispatchTimeoutMs?: number;
  /** 适配器响应超时（ms），从 executeScript 到 ADAPTER_DISPATCH 响应。默认 20_000。 */
  readonly adapterResponseTimeoutMs?: number;
  /** 该平台是否为 SPA（需要 webNavigation SPA 路由检测）。默认 false。 */
  readonly isSpa?: boolean;
}
```

注册表示例：

```typescript
{ id: asPlatformId('openclaw'), dispatchTimeoutMs: 10_000, adapterResponseTimeoutMs: 8_000 },
{ id: asPlatformId('discord'), dispatchTimeoutMs: 30_000, adapterResponseTimeoutMs: 20_000, isSpa: true },
{ id: asPlatformId('slack'),   dispatchTimeoutMs: 25_000, adapterResponseTimeoutMs: 15_000, isSpa: true },
```

`dispatch-pipeline.ts` 读取这些值而非使用硬编码常量。

### 2.5 登录检测泛化

**v1.0 现状：** Discord 的登录检测分散在三个位置：
1. `dispatch-pipeline.ts`：`isOnAdapterHost()` + URL 对比
2. `discord.content.ts`：`isLoggedOutPath()` + `detectLoginWall()` + waitForReady 竞速
3. `shared/adapters/discord-login-detect.ts`：DOM 探测

**方案：** 将登录检测泛化为 `AdapterRegistryEntry` 的可选配置：

```typescript
export interface AdapterRegistryEntry {
  // ... 现有字段 ...
  /** 该适配器的登录/登出 URL 特征。用于 pipeline 层的 URL 对比检测。 */
  readonly loggedOutPathPatterns?: readonly RegExp[];
}
```

注册表示例：

```typescript
{
  id: asPlatformId('discord'),
  loggedOutPathPatterns: [/^\/$/, /^\/login/, /^\/register/],
},
{
  id: asPlatformId('slack'),
  loggedOutPathPatterns: [/\/signin\//, /^\/$/],
},
```

`dispatch-pipeline.ts` 的 `onTabComplete` 中使用此配置替代当前的 Discord 硬编码检查：

```typescript
// 泛化后的登录检测
if (adapter.loggedOutPathPatterns?.some(p => p.test(new URL(actualUrl).pathname))) {
  await failDispatch(record, 'NOT_LOGGED_IN', `Redirected to ${actualUrl}`, true);
}
```

**注意：** DOM 层面的登录墙检测（如 `detectLoginWall()`）仍留在各适配器的 content script 中，因为 DOM 结构因平台而异。注册表的 `loggedOutPathPatterns` 只覆盖 URL 层面的检测——这部分可以在 SW 端（无需注入 content script）完成。

---

## 焦点 3：多平台动态权限管理

### v1.0 权限架构回顾

```
manifest.json:
  permissions:              ['activeTab', 'alarms', 'scripting', 'storage', 'webNavigation']
  host_permissions:         ['https://discord.com/*']         ← Discord 静态声明
  optional_host_permissions: ['<all_urls>']                   ← OpenClaw 动态授权
```

**v1.0 的权限流程：**

| 平台 | host_permissions 来源 | 授权时机 |
|------|----------------------|----------|
| Discord | 静态 `host_permissions` | 安装时自动授予 |
| OpenClaw | `optional_host_permissions` + 运行时 `chrome.permissions.request` | 用户首次配置实例 URL 时 |

### v1.1 新增平台的权限策略

**分类：**

| 类别 | 平台 | 权限策略 |
|------|------|----------|
| 公共 IM（已知域名） | Discord, Slack, Telegram | 静态 `host_permissions` — 域名固定且公开 |
| 用户自管（未知域名） | OpenClaw, Mattermost, Rocket.Chat, Nextcloud Talk | `optional_host_permissions` + 运行时请求 |
| 混合（公共域名 + 可能有自管部署） | Zalo, Feishu/Lark | 静态 + 可选扩展 |

**方案：** 新增的公共 IM 直接添加到 `host_permissions`；用户自管的继续走 `optional_host_permissions`。

```typescript
// wxt.config.ts — v1.1 manifest
host_permissions:
  mode === 'development'
    ? ['https://discord.com/*', 'https://app.slack.com/*', '<all_urls>']
    : ['https://discord.com/*', 'https://app.slack.com/*'],
optional_host_permissions: ['<all_urls>'],  // 不变
```

**每个注册表条目声明自己的 hostMatches：**

```typescript
// shared/adapters/registry.ts
{ id: asPlatformId('discord'), hostMatches: ['https://discord.com/*'] },
{ id: asPlatformId('slack'),   hostMatches: ['https://app.slack.com/*'] },
{ id: asPlatformId('openclaw'), hostMatches: [] },  // 动态权限
```

`hostMatches.length === 0` 是 "需要运行时权限" 的信号——`dispatch-pipeline.ts` 已经处理了这个分支。

### 权限授予的用户流程

**公共 IM（host_permissions）：**
- 安装时一次性授予
- 用户只需在 popup 输入 URL 即可使用
- 无额外交互

**用户自管平台（optional_host_permissions）：**
- 保持与 v1.0 OpenClaw 相同的流程
- 用户在 popup 的 send_to 输入中填入 URL
- popup 检测到 `hostMatches.length === 0` → 在用户点击 Confirm 时调用 `chrome.permissions.request`
- 授权后 origin 记录到 `grantedOrigins` repo
- 下次使用同一 origin 不再弹授权对话框

**v1.1 改进：** `grantedOrigins` repo 可以关联到具体适配器：

```typescript
// shared/storage/repos/grantedOrigins.ts — v1.1 扩展
export interface GrantedOrigin {
  origin: string;        // "http://localhost:18789"
  platformId: PlatformId; // "openclaw"
  grantedAt: string;     // ISO timestamp
}
```

这让 options 页面可以按平台分组展示已授权的 origin。

### 权限校验的安全边界

**`dispatch-pipeline.ts` 已有的防御：**
1. `hostMatches.length === 0` → 检查 `chrome.permissions.contains`
2. `chrome.scripting.executeScript` 失败 → 映射为 `INPUT_NOT_FOUND`

**v1.1 需要的额外防御：** 新增公共 IM 平台时，如果用户未更新扩展（旧版本 manifest 没有 `https://app.slack.com/*` 的 host_permissions），`executeScript` 会失败。pipeline 已有的 `executeScript` 错误映射（`Cannot access|manifest must request permission` → `INPUT_NOT_FOUND`）会正确捕获此情况。无需额外代码。

---

## 构建顺序（v1.1 增量）

v1.0 的构建顺序仍然有效。v1.1 的改动是增量叠加：

```
v1.0 构建（不变）：
1-5. shared/ 基础
6.   background/
7.   popup/
8.   content/extractor.ts
9-11. content/adapters/（mock + openclaw + discord）

v1.1 增量（按依赖顺序）：
12. shared/adapters/types.ts     — PlatformId branded type + AdapterRegistryEntry 扩展
13. shared/adapters/registry.ts  — 新增条目 + 泛化 host filter builder
14. shared/messaging/result.ts   — ErrorCode 扩展（如需新错误码）
15. entrypoints/background.ts    — MAIN world 桥接泛化 + webNavigation filter 泛化
16. background/dispatch-pipeline.ts — 从 registry 读取超时参数 + 泛化登录检测
17. entrypoints/<new-platform>.content.ts — 新适配器（每个平台独立）
18. shared/adapters/<new-platform>-format.ts — 消息格式化
19. popup/ — 重试 UI + 适配器低置信度警告显示
20. locales/*.yml — 新平台 i18n key
21. tests/ — 新适配器 fixture + 测试 + SPA 路由测试
```

**对阶段划分的影响：**

| Phase | 内容 | 依赖 |
|-------|------|------|
| Phase A | 架构泛化（变更 A-D） | 仅依赖 shared/ 层 |
| Phase B | 投递鲁棒性（超时分层 + 登录检测泛化 + SPA 路由泛化） | 依赖 Phase A |
| Phase C | 第一个新适配器 | 依赖 Phase B（使用新的超时/登录/SPA 配置） |
| Phase D | popup 重试 UI | 可与 Phase C 并行 |
| Phase E | 后续适配器 | 每个 = Phase C 的缩小版，可并行 |

---

## 修改与新增组件清单

### 需要修改的现有文件

| 文件 | 改动范围 | 风险 |
|------|----------|------|
| `shared/adapters/types.ts` | PlatformId branded type + AdapterRegistryEntry 扩展 | LOW — 类型变更，编译器保护 |
| `shared/adapters/registry.ts` | 新增条目 + host filter builder | LOW — 纯数据追加 |
| `shared/messaging/result.ts` | ErrorCode 扩展 | LOW — 联合类型追加 |
| `entrypoints/background.ts` | MAIN world 桥接泛化 + webNavigation filter 泛化 | MEDIUM — 核心 SW 入口变更 |
| `background/dispatch-pipeline.ts` | 从 registry 读超时 + 泛化登录检测 | MEDIUM — 核心投递逻辑变更 |
| `entrypoints/popup/components/SendForm.tsx` | 重试 UI + 适配器警告 | LOW — UI 变更 |
| `wxt.config.ts` | 新增 host_permissions | LOW — manifest 配置 |
| `locales/en.yml` + `locales/zh_CN.yml` | 新平台 i18n key | LOW — 纯数据 |

### 需要新增的文件（每个新适配器）

| 文件 | 用途 |
|------|------|
| `entrypoints/<platform>.content.ts` | 适配器 content script |
| `shared/adapters/<platform>-format.ts` | 消息格式化 |
| `shared/adapters/<platform>-login-detect.ts` | 登录墙探测（如需要） |
| `tests/unit/adapters/<platform>-match.spec.ts` | URL 匹配测试 |
| `tests/unit/adapters/<platform>-compose.spec.ts` | 消息组合测试 |
| `tests/unit/adapters/<platform>-selector.spec.ts` | 选择器测试 |
| `tests/unit/adapters/<platform>.fixture.html` | DOM fixture |
| `public/icon/<platform>.svg` | 平台图标 |

---

## 反模式（v1.1 特定）

### 反模式 1：在 background.ts 中硬编码新平台的 SPA 路由检测

**做法：** 为每个新平台添加一个独立的 `chrome.webNavigation.onHistoryStateUpdated.addListener(...)` 调用。
**为什么错：** 违反适配器模式；新平台需要改动 SW 入口；无法按平台独立测试。
**正确做法：** 从注册表动态构建 filter，如 2.1 节所述。

### 反模式 2：在新适配器中复制 Discord 的 MAIN world paste 逻辑

**做法：** 在每个需要 MAIN world 注入的适配器中复制 `injectMainWorldPaste` 函数和 port 通信逻辑。
**为什么错：** 代码重复；port 协议不一致；修复一个平台的问题不会自动修复其他平台。
**正确做法：** 使用泛化的 MAIN world 桥接（变更 B），每个适配器只提供自己的 `mainWorldInjector` 函数。

### 反模式 3：将新平台错误码硬编码为通用 INTERNAL

**做法：** 新适配器返回 `{ ok: false, code: 'INTERNAL', ... }` 而不是特定错误码。
**为什么错：** 用户无法得到可操作的错误信息；重试逻辑无法区分临时故障和永久错误。
**正确做法：** 为每个新错误场景定义专用 ErrorCode。`INTERNAL` 保留给未预期的异常。

### 反模式 4：在 dispatch-pipeline 中为新平台添加 if/else 分支

**做法：** `if (adapter.id === 'slack') { ... } else if (adapter.id === 'telegram') { ... }`。
**为什么错：** pipeline 是平台无关的协调器。平台特定逻辑属于 content script 适配器。
**正确做法：** 通过 `AdapterRegistryEntry` 的声明式字段（`dispatchTimeoutMs`、`isSpa`、`loggedOutPathPatterns`）驱动差异化行为。

---

## 扩展性矩阵

| 适配器数量 | 架构调整 |
|------------|----------|
| 2-3（v1.0） | 静态注册表数组；手工维护 host_permissions；per-adapter MAIN world 函数 |
| 5-7（v1.1） | 同一注册表；泛化 SPA/filter/MAIN world 桥接；可复用的超时/登录配置 |
| 10+（v2） | 考虑注册表拆分为 `adapters/core.ts` + `adapters/community.ts`；options 页面管理已授权 origin；适配器健康度仪表盘 |

### 扩展性瓶颈排序

1. **适配器 DOM 维护流失（仍然是最主要瓶颈）。** 每个 IM 平台的 DOM 都会随版本更新变化。缓解：每个适配器的 fixture + canary + 低置信度警告。
2. **MAIN world 注入函数膨胀。** SW background.ts 中的 `mainWorldInjector` 需要为每个富文本编辑器平台提供特定函数。缓解：将各平台的 MAIN world 注入逻辑封装为独立的、可在 `chrome.scripting.executeScript` 中传递的函数。
3. **host_permissions 列表增长。** 每新增一个公共 IM = manifest 中新增一条。缓解：Chrome Web Store 审核员能理解逐条列举；只要不用 `<all_urls>` 就不会触发拒审。
4. **测试矩阵膨胀。** 每个适配器需要 fixture + 单元测试 + E2E 测试。缓解：共享测试工具（`waitForElement` 测试 helper、`assertDispatchResponse` 断言 helper）。

---

## 来源

### v1.0 来源（仍然有效）
- Chrome Extensions Docs — Service Worker Events, Messaging, scripting API, tabs API, storage API, i18n API, activeTab
- WXT 文档 — Content Scripts（runtime registration、SPA detection、MAIN world injection）
- Slate/Lexical 编辑器注入 — InputEvent + ClipboardEvent 模式
- Playwright — Chrome extensions testing

### v1.1 新增来源
- [chrome.webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) — `onHistoryStateUpdated` 多域名 filter — HIGH
- [chrome.permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) — `optional_host_permissions` 运行时请求 — HIGH
- [WXT Content Scripts SPA Handling](https://wxt.dev/guide/essentials/content-scripts) — `wxt:locationchange` 事件 — HIGH
- [WXT Scripting API](https://wxt.dev/guide/essentials/scripting) — `registration: 'runtime'` + 返回值 — HIGH
- [MDN webNavigation.onHistoryStateUpdated](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation/onHistoryStateUpdated) — SPA 路由检测 — HIGH
- [optional_host_permissions — MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/optional_host_permissions) — 动态权限声明 — HIGH

---

_架构调研增量更新：Chrome MV3 Web Clipper v1.1 多渠道适配 + 投递鲁棒性_
_基于已交付 v1.0 代码库（313 commits, 225 单元测试）进行增量分析_
_调研时间：2026-05-09_
