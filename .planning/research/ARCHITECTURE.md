# 架构调研

**领域：** Chrome MV3 浏览器扩展 — Web Clipper + 多 IM 投递自动化
**调研时间：** 2026-04-28
**置信度：** HIGH（Chrome.\* API、manifest、消息传递）/ MEDIUM（各平台 IM 注入机制 — DOM 契约存在差异且会随时间漂移）

## 标准架构

### 系统概览

Web2Chat 是一个 Manifest V3 扩展。MV3 强制使用非持久化的 **service worker** 作为唯一的特权事件中心；所有其他界面（popup、content script）都是隔离的、临时的进程，通过 `chrome.runtime` / `chrome.tabs` 消息机制与其通信。三条逻辑流水线必须共存于这一接缝之上：

1. **Capture 流水线** — popup 请求 SW 从当前活动 tab 抓取元数据 + 可读内容。
2. **Dispatch 流水线** — popup 确认目标，SW 打开/激活 IM tab，等待其加载完成，注入对应平台的适配器，并往返确认成功。
3. **持久化 + i18n 流水线** — `chrome.storage.local` 与 `chrome.i18n` 可在任何界面中访问。

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER SURFACES (UI)                             │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐                          ┌──────────────────────┐  │
│  │  popup/index.html│                          │  options/index.html  │  │
│  │  (React SPA)     │                          │  (deferred, v2)      │  │
│  │  - SendForm      │                          └──────────────────────┘  │
│  │  - HistoryDrop   │                                                    │
│  │  - PromptPicker  │                                                    │
│  └────────┬─────────┘                                                    │
│           │ chrome.runtime.connect({name:"popup"})  (long-lived port)    │
│           │ chrome.runtime.sendMessage (one-shot RPCs)                   │
├───────────┼──────────────────────────────────────────────────────────────┤
│           ▼                  EXTENSION CORE (privileged)                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │              background/service-worker.ts                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │  │
│  │  │ MessageRouter│  │CapturePipeln │  │ DispatchPipeline         │  │  │
│  │  │ (port + RPC) │  │              │  │  - tab open/activate     │  │  │
│  │  │              │  │              │  │  - tabs.onUpdated wait   │  │  │
│  │  │              │  │              │  │  - adapter selection     │  │  │
│  │  │              │  │              │  │  - executeScript inject  │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────────┘  │  │
│  │         │                 │                     │                  │  │
│  │  ┌──────┴────────┐ ┌──────┴────────┐    ┌───────┴──────────┐       │  │
│  │  │ StorageRepo   │ │ AdapterRegistry│   │ PlatformDetector │       │  │
│  │  │ (typed)       │ │  match(url)    │   │ url → platformId │       │  │
│  │  └───────────────┘ └────────────────┘   └──────────────────┘       │  │
│  └─────────────┬────────────────────────────────────┬─────────────────┘  │
│                │ chrome.scripting.executeScript     │ chrome.tabs.*      │
├────────────────┼────────────────────────────────────┼────────────────────┤
│                ▼                                    ▼                    │
│         CONTENT SCRIPTS (page-isolated, ephemeral, per-tab)              │
│  ┌──────────────────────────────┐    ┌─────────────────────────────────┐ │
│  │ content/extractor.ts         │    │ content/adapters/<platform>.ts  │ │
│  │ (injected on source tab,     │    │ (injected on target IM tab,     │ │
│  │  programmatically, ad-hoc)   │    │  one of N adapters)             │ │
│  │  - DOM scrape                │    │  - waitForReady()               │ │
│  │  - Readability.parse()       │    │  - compose(message)             │ │
│  │  - return ArticleSnapshot    │    │  - send()                       │ │
│  └──────────────────────────────┘    └─────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│                         BROWSER-PROVIDED STORES                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐     │
│  │chrome.storage    │  │ chrome.i18n      │  │ chrome.tabs /      │     │
│  │  .local          │  │  _locales/{zh,en}│  │  chrome.scripting  │     │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 组件职责

| Component                          | Responsibility                                                                                                                                                                                              | Typical Implementation                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **popup/** (React SPA)             | 所有面向用户的表单（send_to、prompt、history）。渲染抓取快照的预览。**仅持有瞬时 UI 状态** — popup DOM 在关闭时即被销毁。                                                                                   | Vite + React + TypeScript, `chrome-extension://<id>/popup.html`                              |
| **background/service-worker.ts**   | 唯一的事实来源。负责 capture 编排、dispatch 编排、适配器注册表、存储仓库、平台探测。跨 SW 重启无状态 — 所有状态都存放在 `chrome.storage` 中。                                                               | ES module service worker (`"type": "module"`), top-level listener registration               |
| **content/extractor.ts**           | 运行在源页面的隔离世界中。抓取 `title`、`url`、`description`（meta og/twitter）、`create_at`（article:published_time、JSON-LD），并通过 Readability 抽取主体文章内容。将 `ArticleSnapshot` JSON 返回给 SW。 | 通过 `chrome.scripting.executeScript({ files: [...] })` 按需以编程方式注入。不进行静态注册。 |
| **content/adapters/<platform>.ts** | 运行在目标 IM 页面的隔离世界中。实现 `IMAdapter` 契约：`waitForReady`、`compose`、`send`。每个平台对应一个适配器。                                                                                          | 在 `tabs.onUpdated.status === 'complete'` 之后由 SW 按每次投递以编程方式注入。               |
| **shared/types**                   | 用于 message、snapshot、target、adapter 契约的 TypeScript 类型。被其他每一层引用；**绝不能以错误方向打包到包含 DOM 依赖代码的 bundle 中**。                                                                 | Pure `.d.ts` / no runtime                                                                    |
| **shared/messaging**               | 对 `chrome.runtime.sendMessage` 与 `chrome.tabs.sendMessage` 的类型化封装。判别联合（discriminated-union）消息类型。                                                                                        | Plain TS module, used by popup, SW, content scripts                                          |
| **shared/storage**                 | 在 `chrome.storage.local` 之上的类型化仓库。schema 版本化、迁移钩子、监听器。                                                                                                                               | Plain TS module                                                                              |
| **shared/i18n**                    | 在 `chrome.i18n.getMessage` 之上的 `t(key, ...subs)` 封装。来源为 `_locales/{zh_CN,en}/messages.json`。                                                                                                     | Plain TS module + locale JSON                                                                |

## 推荐项目结构

```
web2chat/
├── public/
│   ├── icons/                          # 16/32/48/128 PNG, plus per-IM platform icons
│   ├── _locales/
│   │   ├── zh_CN/messages.json         # default_locale
│   │   └── en/messages.json
│   └── manifest.json                   # MV3 manifest (or generated by CRXJS)
├── src/
│   ├── shared/                         # ← built FIRST; no chrome.* runtime calls allowed at module top-level
│   │   ├── types/
│   │   │   ├── snapshot.ts             # ArticleSnapshot
│   │   │   ├── target.ts               # SendTarget, TargetKey, PlatformId
│   │   │   ├── messages.ts             # discriminated-union message protocol
│   │   │   └── storage.ts              # StorageSchema (versioned)
│   │   ├── messaging/
│   │   │   ├── rpc.ts                  # typed sendMessage / onMessage wrapper
│   │   │   └── port.ts                 # typed chrome.runtime.connect wrapper
│   │   ├── storage/
│   │   │   ├── repo.ts                 # typed get/set/onChanged
│   │   │   └── migrations.ts
│   │   ├── i18n/
│   │   │   └── t.ts                    # chrome.i18n.getMessage facade
│   │   └── platform/
│   │       ├── detect.ts               # url → PlatformId
│   │       └── registry.ts             # PlatformId → manifest entry (icon, label, host_perm)
│   │
│   ├── background/                     # ← built second; depends on shared/
│   │   ├── service-worker.ts           # entry; top-level listener registration only
│   │   ├── capture-pipeline.ts
│   │   ├── dispatch-pipeline.ts
│   │   ├── adapter-registry.ts         # AdapterRegistry: PlatformId → file path + match
│   │   └── tab-utils.ts                # openOrActivate, waitForComplete
│   │
│   ├── popup/                          # ← built third; depends on shared/
│   │   ├── index.html
│   │   ├── main.tsx                    # React mount
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SendForm.tsx
│   │   │   ├── HistoryDropdown.tsx
│   │   │   ├── PromptPicker.tsx
│   │   │   └── PlatformBadge.tsx
│   │   └── hooks/
│   │       ├── useCapture.ts           # SW RPC: REQUEST_CAPTURE
│   │       ├── useDispatch.ts          # SW RPC: REQUEST_DISPATCH
│   │       └── useStorage.ts           # subscribes via chrome.storage.onChanged
│   │
│   ├── content/                        # ← built fourth; depends on shared/
│   │   ├── extractor.ts                # standalone IIFE-style entry; runs once per injection
│   │   └── adapters/
│   │       ├── _base.ts                # IMAdapter interface + helpers (waitForSelector, simulatePaste)
│   │       ├── openclaw.ts             # MVP
│   │       ├── discord.ts              # MVP
│   │       └── README.md               # how to add a new adapter (v2 platforms)
│   │
│   └── manifest.config.ts              # generates manifest.json (CRXJS) — or kept static
│
├── tests/
│   ├── unit/
│   │   ├── platform-detect.spec.ts
│   │   ├── storage-repo.spec.ts
│   │   └── adapters/
│   │       ├── discord.fixture.html    # captured DOM snapshot
│   │       ├── discord.spec.ts         # JSDOM-based adapter unit test
│   │       └── openclaw.spec.ts
│   └── e2e/
│       ├── fixtures.ts                 # Playwright launchPersistentContext + extensionId
│       ├── capture.spec.ts
│       └── dispatch-discord.spec.ts
│
├── vite.config.ts                      # multi-entry: popup, background, content scripts
├── tsconfig.json
├── package.json
└── playwright.config.ts
```

### 结构理由

- **`shared/` 优先，不允许在顶层调用 `chrome.*`。** 在 shared 模块顶层调用 `chrome.*` 会在测试（JSDOM）中抛错，并可能卡死 SW 生命周期。保持 shared 模块纯净；让调用方仅在函数内部传入 `chrome.storage.local`。
- **`background/` 与 `shared/` 分离** — 只有 SW 入口注册监听器。流水线被分解为接收依赖作为参数的模块（无需启动真实 SW 即可测试）。
- **`content/extractor.ts` 与 `content/adapters/*.ts` 是独立的 bundle** — Vite 必须为每个 content script 产出一个独立的输出文件（不能共享运行时 chunk；它们各自被注入到不同的页面世界中）。
- **`adapters/` 是 v2 平台的唯一扩展点。** 每个适配器都是一个实现单一接口的自包含文件。新增 LINE / Slack / Telegram = 添加一个文件 + 一个注册表条目 + 一个 host_permission。
- **`tests/e2e/fixtures.ts`** 通过 `chromium.launchPersistentContext` 加载已构建的 `dist/` 目录，使用 headed 模式（或 `channel: 'chromium'` headless 模式）；从 SW URL 中解析 `extensionId`。

## 架构模式

### 模式 1：单一特权中心（Service Worker 作为协调者）

**含义：** popup 永远不直接与 content script 通信。所有跨上下文的通信都走 popup → SW → content script（通过 `chrome.tabs.sendMessage` 或 `chrome.scripting.executeScript`）。

**何时使用：** MV3 下始终如此。popup 在关闭时即被销毁；如果由它持有 `chrome.tabs.sendMessage` 的往返，响应将落到一个已死的监听器上。

**取舍：**

- ✅ 经得起 popup 关闭、SW 重启、tab 导航
- ✅ 在单一位置统一执行权限与限速
- ❌ 每条消息多一跳（可接受；这是约定俗成的做法）

**示例：**

```ts
// popup/hooks/useDispatch.ts
const result = await rpc.send({
  type: "REQUEST_DISPATCH",
  target,
  snapshot,
  prompt,
});
// rpc.send wraps chrome.runtime.sendMessage with typed responses

// background/service-worker.ts (top level — MUST be top level for MV3)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "REQUEST_DISPATCH") {
    dispatchPipeline.run(msg).then(sendResponse);
    return true; // keep channel open for async response
  }
});
```

### 模式 2：多 IM 支持的适配器模式

**含义：** 每个 IM 平台都实现统一的 `IMAdapter` 接口。SW 按 URL 选择适配器，将其注入目标 tab，并调用稳定的 RPC 接口。

**何时使用：** 当项目需支持多个具有相似动作但 DOM/UI 各异的外部界面时。v1 有 2 个适配器；v2 有 ~14 个。这一接缝从第一天起就是必备的。

**取舍：**

- ✅ 新平台 = 一个新文件，无需改动 capture/dispatch 核心
- ✅ 每个适配器都可针对抓取到的 DOM 固件（fixture）进行单元测试（JSDOM）
- ❌ 每个适配器都是维护负担 — IM 厂商会发布 UI 更改（尤其 Discord、Slack）
- ❌ 适配器之间无法完全共享运行时代码（每个都是独立的 content-script bundle）

**适配器契约（规范的 TS 接口）：**

```ts
// shared/types/adapter.ts
export interface IMAdapter {
  /** Stable identifier matching PlatformId in the registry. */
  readonly id: PlatformId;

  /** URL test. Returns true if this adapter handles the given target URL. */
  match(url: string): boolean;

  /**
   * Resolve when the chat UI is ready to accept input
   * (composer mounted, channel/agent context loaded).
   * Reject after timeout. Implemented with MutationObserver + waitForSelector.
   */
  waitForReady(timeoutMs?: number): Promise<void>;

  /**
   * Place the formatted message into the composer.
   * MUST handle React-controlled editors (Slate/Lexical) via simulated
   * paste / InputEvent — direct .value assignment is silently overwritten.
   */
  compose(message: string): Promise<void>;

  /** Submit the composed message (Enter keydown, send-button click, etc.). */
  send(): Promise<void>;
}

// content/adapters/_base.ts — execution glue (each adapter file is its own bundle)
export async function runAdapter(adapter: IMAdapter, message: string) {
  await adapter.waitForReady();
  await adapter.compose(message);
  await adapter.send();
}
```

SW 在构建时**不**导入适配器模块（它们位于不同的 bundle / 不同的页面世界中）。它持有的是一份 _文件路径与 `match` 谓词的注册表_：

```ts
// background/adapter-registry.ts
type AdapterEntry = {
  id: PlatformId;
  match: (url: string) => boolean; // runs in SW
  scriptFile: string; // path relative to extension root
  hostMatches: string[]; // for manifest host_permissions
};

export const ADAPTERS: AdapterEntry[] = [
  {
    id: "openclaw",
    match: (u) => u.includes("localhost:18789/chat"),
    scriptFile: "content/adapters/openclaw.js",
    hostMatches: ["http://localhost:18789/*"],
  },
  {
    id: "discord",
    match: (u) => /^https:\/\/discord\.com\/channels\//.test(u),
    scriptFile: "content/adapters/discord.js",
    hostMatches: ["https://discord.com/*"],
  },
];
```

### 模式 3：以编程注入取代静态 `content_scripts`

**含义：** 使用 `chrome.scripting.executeScript({ target: { tabId }, files: [...] })`，而不是在 `manifest.json` 的 `content_scripts` 中声明适配器。

**何时使用：** 当脚本只应在 _用户触发投递时_ 才运行（而非每次访问 Discord 时），且 host_permissions 集合应在每个平台粒度上保持可审计时。

**取舍：**

- ✅ 零页面级开销 — 适配器只在用户实际发送时才加载
- ✅ 用户看到的是 `permissions: ["scripting"]` + 具名 host，从不会出现 `<all_urls>`
- ✅ 调试更简单：每次调用都是一个离散事件
- ❌ 比 `run_at: document_idle` 静态注入略晚 — 必须保护性地 `waitForReady`
- ❌ 需要 `scripting` 权限（无论如何我们都需要）

**示例：**

```ts
// background/dispatch-pipeline.ts
async function injectAdapter(
  tabId: number,
  entry: AdapterEntry,
  message: string,
) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [entry.scriptFile],
    world: "ISOLATED", // default; explicit for clarity
  });
  // Adapter file self-registers a one-shot listener; we then send the payload:
  return chrome.tabs.sendMessage(tabId, { type: "ADAPTER_RUN", message });
}
```

### 模式 4：在 Service Worker 中进行顶层监听器注册

**含义：** 所有 `chrome.*.on*.addListener` 调用都位于 SW 模块的顶层。在监听器注册之前不要有 `await` 或回调。

**何时使用：** 始终如此。MV3 service worker 在大约 30 秒不活动后会被杀死，并在事件触发时被 _重新启动_。如果监听器没有在顶层同步注册，事件就会被丢弃。

**取舍：**

- ✅ 与 SW 重启正确协作
- ❌ 强制了"在注册前不做异步工作"的纪律 — 在引导阶段有时令人头疼

```ts
// background/service-worker.ts — CORRECT
chrome.runtime.onMessage.addListener(handleMessage);
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.runtime.onInstalled.addListener(handleInstall);

// then async setup:
storage.bootstrap(); // does its own awaits internally; doesn't block listener registration
```

### 模式 5：popup ↔ SW 的长生命周期 port（可选）

**含义：** 在单次 popup 会话期间，使用 `chrome.runtime.connect({ name: 'popup' })` 作为 popup 与 SW 之间的通道；对于一次性 RPC 则回退到 `sendMessage`。

**何时使用：** 当 popup 需要从一次长时间运行的投递中接收流式进度更新时（`opening tab → waiting → injecting → sending → done`）。一次性 `sendMessage` 无法推送中间状态。

**取舍：**

- ✅ 无需轮询即可呈现进度 UI
- ✅ 自动检测 popup 关闭（`port.onDisconnect`），便于 SW 取消任务
- ❌ 比 `sendMessage` 略多样板代码

## 数据流

### Capture 数据流

```
User clicks toolbar icon
        │
        ▼
popup.html mounts, React renders SendForm
        │
        │ rpc.send({ type: 'REQUEST_CAPTURE' })
        ▼
SW: capture-pipeline.run()
   1. tabs.query({ active: true, lastFocusedWindow: true }) → activeTab
   2. scripting.executeScript({ target: { tabId }, files: ['content/extractor.js'] })
   3. tabs.sendMessage(tabId, { type: 'CAPTURE_REQUEST' }) → ArticleSnapshot
        │
        ▼
content/extractor.ts (in active tab, isolated world)
   - reads document.title, og:* meta, article:published_time, JSON-LD
   - runs new Readability(document.cloneNode(true)).parse()
   - returns { title, url, description, createdAt, content, excerpt }
        │
        ▼
SW returns ArticleSnapshot to popup
        │
        ▼
popup renders preview; user fills/picks send_to + prompt
```

### Dispatch 数据流

```
popup: user clicks "Confirm"
        │
        │ rpc.send({ type: 'REQUEST_DISPATCH', target, snapshot, prompt })
        ▼
SW: dispatch-pipeline.run()
   1. PlatformDetector(target.url) → platformId
   2. AdapterRegistry.lookup(platformId) → entry
   3. tabs.query for existing tab matching target.url
       3a. if found → tabs.update({ tabId, active: true })
       3b. else    → tabs.create({ url: target.url, active: true })
   4. await waitForComplete(tabId):
        new Promise(resolve =>
          chrome.tabs.onUpdated.addListener(function fn(id, info, tab) {
            if (id === tabId && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(fn);
              resolve(tab);
            }
          })
        )
   5. scripting.executeScript({ target:{tabId}, files:[entry.scriptFile] })
   6. tabs.sendMessage(tabId, { type: 'ADAPTER_RUN', message: format(snapshot, prompt) })
        │
        ▼
content/adapters/<platform>.ts (in target tab)
   - adapter.waitForReady()  // MutationObserver on composer
   - adapter.compose(message) // simulated paste / InputEvent dispatch
   - adapter.send()          // dispatchEvent('keydown', { key:'Enter' }) or click send btn
   - sendResponse({ ok: true })
        │
        ▼
SW relays { ok, error? } to popup → popup shows toast → close
```

### 状态管理

Web2Chat **没有** 跨 SW 生命周期存活的内存共享状态。所有与用户相关的内容都存放在 `chrome.storage.local` 中。各组件通过 `chrome.storage.onChanged` 订阅变更。

```
chrome.storage.local (single source of truth)
    │
    │  onChanged event
    ▼
[popup hooks]   [SW pipelines]   [adapter content scripts read on demand]
    │
    ↓ (dispatch via SW RPC)
SW writes back via shared/storage/repo.ts
    │
    ↓
chrome.storage.local
```

**StorageSchema（类型化、版本化）：**

```ts
// shared/types/storage.ts
export interface StorageSchema {
  schemaVersion: 1;
  history: SendTarget[]; // recent send_to entries (LRU)
  promptsByTarget: Record<TargetKey, string[]>; // prompt history scoped per target
  settings: {
    locale: "zh_CN" | "en" | "auto";
    defaultPlatformId?: PlatformId;
  };
}

export type TargetKey = string; // canonicalized URL or platform-specific key
export interface SendTarget {
  key: TargetKey;
  url: string;
  platformId: PlatformId;
  label?: string; // optional user-friendly name
  lastUsedAt: number;
}
```

### 关键数据流

1. **Capture 数据流：** `popup → SW → executeScript(extractor) → tabs.sendMessage → ArticleSnapshot → popup`
2. **Dispatch 数据流：** `popup → SW → tabs.create/update → wait onUpdated complete → executeScript(adapter) → tabs.sendMessage → adapter compose+send → result → popup`
3. **History/prompt 持久化：** `popup → SW → storage.local.set`；popup 通过 `storage.onChanged` 订阅重新读取
4. **平台探测：** 同步、纯函数，位于 `shared/platform/detect.ts`；popup（用于图标预览）和 SW（用于适配器选择）都会调用
5. **i18n：** 每个 UI 界面调用 `t('key')` → `chrome.i18n.getMessage('key')` → `_locales/<browser_locale>/messages.json`。v1 不支持运行时切换 locale（locale 在扩展加载时由浏览器决定）。

## 构建顺序的影响

**构建顺序 = 依赖顺序** = 各阶段应当出货的顺序。

```
1. shared/types          ──┐
2. shared/messaging       ─┼─ pure TS, no chrome.* at module top level
3. shared/storage          │  (testable in JSDOM, no extension context)
4. shared/i18n             │
5. shared/platform        ─┘
              │
              ▼
6. background/             (depends on all of shared/)
              │
              ▼
7. popup/                  (depends on shared/, talks to background via RPC)
              │
              ▼
8. content/extractor.ts    (depends on shared/types only — kept tiny)
              │
              ▼
9. content/adapters/_base.ts
10. content/adapters/openclaw.ts   ──┐  parallel; each adapter is independent
11. content/adapters/discord.ts    ──┘
              │
              ▼
12. _locales/{zh_CN,en}/messages.json   (driven by t() call sites in 6+7)
              │
              ▼
13. e2e tests              (must run against built dist/, not src/)
```

**对阶段路线图的影响：**

- 阶段 1（基础设施）：第 1–5 项 + manifest 骨架 + 一个能成功向 SW 发起 RPC 的 hello-world popup。这是最小的端到端外壳。
- 阶段 2（capture）：第 6 项（仅 capture 流水线）+ 第 8 项 + 接通 popup 以展示 snapshot。落地核心价值的 capture 一半。
- 阶段 3（dispatch + 首个适配器）：第 6 项（dispatch 流水线）+ 第 9、10 项（OpenClaw 是较简单的目标 — 已知的纯输入契约）+ popup 确认流程。落地 OpenClaw 的 MVP。
- 阶段 4（Discord 适配器）：第 11 项 — 单独成一个阶段，因为 Discord/Slate 是最难的 DOM 目标，需要独立的调研 + 固件。
- 阶段 5（i18n 加固 + 打磨）：第 12 项 + 可访问性 + history/prompt 用户体验。
- 阶段 6+（v2 平台）：每新增一个适配器 = +1 个文件 + +1 个 host_permission + +1 套固件。

## 权限：最小特权原则

**必需（v1 MVP）：**

```json
{
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["http://localhost:18789/*", "https://discord.com/*"]
}
```

- **`activeTab`** — 在用户手势（点击工具栏）下授予对当前活动 tab 的临时 host 访问权限。让 `executeScript(extractor)` 能在用户对其调用扩展的 _任意_ 页面上运行，无需 `<all_urls>`。窍门：`activeTab` 对 **capture** 一半已经足够，因为用户点击了工具栏图标（即手势）。
- **`scripting`** — `chrome.scripting.executeScript` 所需（MV3）。
- **`storage`** — `chrome.storage.local` 所需。
- **每个 IM 的 `host_permissions`** — **dispatch** 一半所需，因为我们要在用户 _未_ 在其上点击图标的 tab 中导航/注入。每新增一个 v2 平台都恰好新增此处的一条。务必避免使用 `<all_urls>`（Web Store 审核摩擦、用户信任摩擦）。

**不需要：**

- ❌ `tabs`（完整 Tab 对象访问） — `activeTab` + `host_permissions` 已经覆盖我们的需求
- ❌ `<all_urls>`
- ❌ `webNavigation` — `tabs.onUpdated` 已足以检测"导航完成"
- ❌ `nativeMessaging`、`cookies`、`downloads`、`notifications`

**`i18n` 权限：** 无需声明（`chrome.i18n` 始终可用；manifest 中的 `default_locale` 是触发器）。

## 扩展性考量

这是一个单用户、单设备的扩展；这里的"扩展性"指 _代码库规模_（平台数量、locale 数量、适配器复杂度），而非用户规模。

| Scale                                    | Architecture Adjustments                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 user, 2 IM platforms (MVP)             | 静态适配器注册表数组。手工维护的 `host_permissions`。                                                                                      |
| 1 user, ~14 IM platforms (v2)            | 仍是同一份注册表数组。考虑在文档中按类别对 `host_permissions` 分组。对不太常用的平台添加 `optional_host_permissions`，在首次使用时再请求。 |
| Future power-user (custom URL templates) | 适配器注册表变为数据驱动（从存储中读取）。用户自定义 target = 一个仅基于选择器进行组合的通用适配器。                                       |

### 扩展性优先事项

1. **首要瓶颈：适配器维护流失。** 随着 IM 厂商发布 UI 更新，适配器会悄无声息地坏掉。缓解措施：每个适配器都附带一份抓取的 DOM 固件，位于 `tests/unit/adapters/<id>.fixture.html`。CI 运行适配器单元测试。在 popup 中加入"测试适配器"诊断功能，以在线上捕获故障。
2. **次要瓶颈：popup 包体积。** 每新增一种 locale、每新增一个平台图标都会吃掉若干 KB。缓解措施：按需懒加载 locale；使用 SVG 雪碧图承载平台图标；激进地进行 tree-shake（Vite 默认行为）。
3. **第三瓶颈：SW 冷启动延迟。** 浏览器空闲后第一次点击会唤醒 SW（约 200ms）。缓解措施：保持 SW 入口的导入图最小 — 通过动态 `import()` 延迟加载流水线。仅在测量显示存在用户可见的延迟时才进行预热。

## 反模式

### 反模式 1：在 popup 中直接调用 `chrome.tabs.sendMessage`

**人们的做法：** popup 查询当前活动 tab，并直接 ping content script 来抓取内容。
**为什么错：** popup 在另一窗口获得焦点或用户点击其外部任何地方时立刻关闭。长时间运行的 tab 消息往返将落到一个已死的监听器上。这同时也破坏了安全边界（popup 最终需要了解 content-script 的生命周期）。
**正确做法：** popup → SW（RPC）→ SW 再做 `tabs.sendMessage`。SW 是 `tabs.*` 的唯一特权调用方。

### 反模式 2：对 React 管理的 composer 设置 `value` / `textContent`

**人们的做法：** `document.querySelector('[role=textbox]').textContent = msg`。
**为什么错：** Discord（Slate）、Slack（Lexical）以及大多数现代 IM 都通过 React state 控制 composer。直接的 DOM 修改会在下一次渲染时被覆盖，更糟的是会在视觉上被接受却在发送时被丢弃。
**正确做法：** 模拟用户输入。两种可靠技巧：

1. **剪贴板 + 粘贴：** `navigator.clipboard.writeText(msg)` 然后 `editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true }))`。
2. **原生输入 setter + InputEvent：** 对 `<textarea>` 后端的编辑器，使用描述符技巧 — `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, msg)`，然后派发 `new InputEvent('input', { bubbles: true })`。
   每个适配器选择适合该平台编辑器的技术（在 `content/adapters/_base.ts` 中按适配器记录）。

### 反模式 3：为"图省事"而声明 `<all_urls>` host 权限

**人们的做法：** 声明 `"host_permissions": ["<all_urls>"]`，开发者就再也不必考虑扩展会触及哪些站点。
**为什么错：** 会带来 Chrome Web Store 审核摩擦；安装时的警告会列出"读取你在所有网站上的所有数据"，这会重创安装率；并且违背 MV3 的最小特权理念。
**正确做法：** 用 `activeTab` 来做 capture（用户手势作用域）+ 为每个 IM 显式声明 `host_permissions` 来做 dispatch。每新增一个平台 = 用户显式批准的一条新 host 条目。

### 反模式 4：在注册 SW 监听器 _之前_ 做异步工作

**人们的做法：** `await storage.bootstrap(); chrome.runtime.onMessage.addListener(...)`。
**为什么错：** 会话中途的 SW 重启会丢失监听器注册；派发的事件被静默丢弃。难以复现，难以调试。
**正确做法：** 在模块顶层同步注册所有监听器。在监听器内部进行引导（懒加载），或在另一个独立的 fire-and-forget 异步块中进行。

### 反模式 5：把 popup 当作长生命周期的状态容器

**人们的做法：** 把 send 历史、prompt 缓存等保存在 popup 的 React state 中，并在卸载时序列化。
**为什么错：** popup 卸载可能十分突然（焦点丢失、tab 切换）。state 更新可能来不及刷新。重新打开 popup 会产生一个全新的上下文。
**正确做法：** popup 只是 `chrome.storage.local` 之上的薄视图。每个有意义的用户操作要么 RPC 到 SW，要么立即写入存储。通过 `storage.onChanged` 进行订阅。

### 反模式 6：用一个庞大的 content-script bundle 共享所有适配器

**人们的做法：** 发布单一的 `content.js`，包含所有适配器并通过 `if (location.host === 'discord.com') ...` 来判断。
**为什么错：** 每次访问 _任一_ 14 个平台都会加载其他 13 个平台的代码。会让你的 `host_permissions` 翻倍，因为该 bundle 在所有 host 上都被注册。破坏 tree-shaking。让适配器互相耦合（一个失效的适配器会让所有适配器都失效）。
**正确做法：** 每个适配器一个 bundle，仅在投递时按匹配的 host 编程注入。

## 集成点

### 外部服务（每个 IM 的 web 目标）

| Service                                                         | Integration Pattern                                        | Notes                                                                                                                                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenClaw Web UI (`http://localhost:18789/chat?session=...`)     | 编程方式 `executeScript` → 适配器 → composer DOM           | 仅本地；用户自有 UI；预计是最简单的目标。Composer 很可能是普通 `<textarea>` 或一个稳定的 React 表单。                                                                                    |
| Discord Web (`https://discord.com/channels/<server>/<channel>`) | 编程方式 `executeScript` → 适配器 → 基于 Slate 的 composer | 困难目标。Slate 会拦截直接 DOM 写入。使用剪贴板粘贴模拟；通过 Enter `keydown` 事件提交。UI 在 Discord 重设计中并不稳定 — 适配器必须使用语义选择器（`role`、`aria-label`）而非 class 名。 |
| (v2: Slack, Telegram, Lark, Feishu, Teams, …)                   | 同样的模式，每个平台一个适配器文件                         | 各自会有自己的编辑器框架（Lexical、ProseMirror、Quill、原生 textarea）。在 `content/adapters/<id>.ts` 文件头注释中记录每个适配器的策略。                                                 |

### 内部边界

| Boundary                        | Communication                                                                                              | Notes                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| popup ↔ SW                      | `chrome.runtime.sendMessage`（一次性 RPC）**或** `chrome.runtime.connect`（用于流式进度的长生命周期 port） | 由 `shared/types/messages.ts` 中的 `Message` 判别联合类型化。绝不可在 popup 中使用 `chrome.tabs.sendMessage`。                  |
| SW ↔ content script (extractor) | 使用 `chrome.scripting.executeScript` 注入；使用 `chrome.tabs.sendMessage` 完成数据往返                    | extractor 是一次性的；按需注入；回复一次后脚本上下文进入空闲，直至下次注入。                                                    |
| SW ↔ content script (adapter)   | 同 extractor：先 `executeScript`，再 `tabs.sendMessage(tabId, { type: 'ADAPTER_RUN', message })`           | 适配器仅监听一条消息，执行 `compose+send`，回复后退出。                                                                         |
| popup → storage                 | 间接：popup RPC 给 SW；由 SW 拥有 `chrome.storage.local` 的写入                                            | 读侧：popup 可以直接从 `chrome.storage.local` 读取（无权限边界），但**写**统一汇集到 SW 以维护不变量（LRU 历史、schema 版本）。 |
| any layer → i18n                | 直接调用 `chrome.i18n.getMessage`（同步、随处可用）                                                        | 在 `shared/i18n/t.ts` 中封装以保证 message key 的类型安全。                                                                     |

## 来源

- [Chrome Extensions Docs — Service Worker Events (top-level listener registration)](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events) — HIGH
- [Chrome Extensions Docs — Messaging (sendMessage, ports, content-script communication)](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — HIGH
- [Chrome Extensions Docs — chrome.scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) — HIGH
- [Chrome Extensions Docs — chrome.tabs API (onUpdated, query, create, update)](https://developer.chrome.com/docs/extensions/reference/api/tabs) — HIGH
- [Chrome Extensions Docs — chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — HIGH
- [Chrome Extensions Docs — chrome.i18n API](https://developer.chrome.com/docs/extensions/reference/api/i18n) — HIGH
- [Chrome Extensions Docs — Content Scripts manifest configuration (worlds, run_at)](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) — HIGH
- [Chrome Extensions Docs — activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) — HIGH
- [Mozilla Readability.js (`@mozilla/readability`)](https://github.com/mozilla/readability) — HIGH
- [Slate Editor Discussion #5721 — programmatic text insertion via clipboard simulation](https://github.com/ianstormtaylor/slate/discussions/5721) — MEDIUM (community solution; technique is canonical but adapter-specific)
- [Discord's Slate fork](https://github.com/discord/slate) — MEDIUM (confirms editor framework, informs Discord adapter strategy)
- [Playwright Docs — Chrome extensions testing](https://playwright.dev/docs/chrome-extensions) — HIGH
- [DEV — E2E tests for Chrome extensions with Playwright + CDP](https://dev.to/corrupt952/how-i-built-e2e-tests-for-chrome-extensions-using-playwright-and-cdp-11fl) — MEDIUM (community write-up; technique aligns with official docs)
- [CRXJS Vite plugin — multi-entry bundling for MV3](https://github.com/crxjs/chrome-extension-tools) — MEDIUM (recommended tooling; not strictly required)
- [Chrome Extensions Docs — Migrating to Service Workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers) — HIGH

---

_面向以下项目的架构调研：Chrome MV3 Web Clipper + 多 IM 投递扩展_
_调研时间：2026-04-28_
