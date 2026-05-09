# Phase 2: 抓取流水线 (Capture Pipeline) - Research

**Researched:** 2026-04-30
**Domain:** Chrome MV3 content-script programmatic injection · @mozilla/readability · DOMPurify · Turndown · Preact signals popup state machine
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-13:** Readability-only。`@mozilla/readability@^0.6` 单一抽取器；不引入 `defuddle`。
- **D-14:** Readability 必须传 `document.cloneNode(true)`——否则 `parse()` 会改写 live DOM，污染用户当前页面。
- **D-15:** popup mount 自动 trigger。popup 一挂载就向 SW 发 `capture.run` RPC，无显式 Capture 按钮。
- **D-16:** URL scheme 预检在 SW handler 入口。scheme ∈ `{http, https}` 才进 `executeScript`；其余返回 `Err('RESTRICTED_URL', ...)`.
- **D-17:** 三个新 ErrorCode：`RESTRICTED_URL`（不重试）、`EXTRACTION_EMPTY`（popup 渲染 empty 三态）、`EXECUTE_SCRIPT_FAILED`（retriable=true）。`ErrorCode` 联合从 `'INTERNAL'` 扩展为 `'INTERNAL' | 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' | 'EXECUTE_SCRIPT_FAILED'`。
- **D-18:** `ArticleSnapshot.content: string` 存 Markdown。流水线：Readability `parse()` → HTML → DOMPurify 净化 → Turndown 7.2 + GFM → Markdown。不保留 HTML。
- **D-19:** Phase 2 不加 content 长度上限。Phase 3 按 IM 具体限制裁。
- **D-20:** DOMPurify 用默认 profile。不放宽 `ALLOWED_TAGS`/`ALLOWED_ATTR`。
- **D-21:** always-on `<textarea>` 编辑。`title` / `description` / `content` 三字段抓取成功后立即以 textarea 形式渲染。
- **D-22:** Phase 2 不落 draft storage。编辑值仅活在 Preact signals（`titleSig`, `descriptionSig`, `contentSig`），popup 关闭即清空。`articleSnapshotDraft` 推到 Phase 3。

### Claude's Discretion

- `ArticleSnapshot` zod schema 精确字段约束（`url` 用 `z.string().url()`，`create_at` 用 `z.string().datetime()`）
- `description` fallback 链实现位置（推荐：extractor 内部顺序 try，单文件）
- extractor 注入 world（推荐：`ISOLATED` 默认）
- 测试 fixture 形态（推荐：本地 HTML 文件）
- 空白换行规范化（推荐：信任 Turndown 默认）
- popup 三态视觉细节（推荐：loading 用 skeleton；empty/error 无独立 retry 按钮）

### Deferred Ideas (OUT OF SCOPE)

- `articleSnapshotDraft` storage item、草稿读写、debounce 写入 → Phase 3
- content 长度上限与裁切 → Phase 3
- popup 加 SendForm / HistoryDropdown / PromptPicker → Phase 3
- Defuddle 集成 / 非文章页面覆盖 → v1.x
- Markdown 关键字 escape / Discord mention 清理 → Phase 5
- 任何 dispatch / chrome.tabs.create / chrome.tabs.update 路径 → Phase 3
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAP-01 | 用户点击扩展图标后，SW 通过 `chrome.scripting.executeScript` 在当前 active tab 注入 extractor，返回 `ArticleSnapshot` | §Architecture Patterns §Pattern 1: WXT content script with registration:runtime |
| CAP-02 | extractor 使用 `@mozilla/readability` 在 `document.cloneNode(true)` 上提取主体内容，输出经 `dompurify` 净化后的 Markdown（用 `turndown`） | §Standard Stack §Code Examples |
| CAP-03 | 抓取结果包含 `title` / `url` / `description` / `create_at` / `content` 五项；`description` 优先取 `<meta name="description">` 或 `og:description`，缺省回退 Readability `excerpt` | §Code Examples §description-fallback |
| CAP-04 | `create_at` 由扩展生成 ISO-8601 时间戳（用户点击时刻），不依赖网页发布时间 | §Architecture Patterns §数据所有权 |
| CAP-05 | popup 在打开后第一时间展示 5 个字段的预览（loading/empty/error 三态明确）；用户可手动编辑 `title` / `description` / `content` | §Architecture Patterns §popup 状态机 §Code Examples |
</phase_requirements>

---

## Summary

Phase 2 的核心工程问题有三个：

**其一，extractor bundle 如何独立存在并被 SW 按需注入。** WXT 0.20.x 支持 `registration: 'runtime'` 的 content script——该模式不把脚本注册到 manifest 的 `content_scripts` 数组，而是生成独立 bundle 供 `chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'] })` 调用。extractor 的返回值通过 `executeScript` 的 return value 通道直接送回 SW，无需 `tabs.sendMessage` 往返（见 §Pattern 1）。这与 CONTEXT 第 5 步描述的 `tabs.sendMessage` 路径有偏差——本研究推荐更简单的 return-value 通道，原因见 §Pattern 1 详细说明。

**其二，三个库（Readability / DOMPurify / Turndown）在 content script 上下文中的用法限制。** Readability 必须传 clone（D-14）；DOMPurify 需要真实浏览器 DOM（在 content script 里就是 `window`/`document`，完全可用）；Turndown 纯函数，无 DOM 依赖，最简单。三者的组合在 extractor 的 `ISOLATED world` 下均可工作。

**其三，单元测试环境的关键约束。** DOMPurify 明确声明不支持 happy-dom（XSS 安全风险）。含 DOMPurify 逻辑的 extractor 单元测试必须用 `jsdom` environment，而非项目默认的 `happy-dom`。Vitest 支持 per-file 切换：在文件头加 `// @vitest-environment jsdom` 注释即可，不影响其他测试。

**Primary recommendation:** extractor 以 WXT `registration: 'runtime'` content script 定义；SW handler 用 `executeScript` return-value 通道拿结果；DOMPurify 单元测试强制 jsdom environment。

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| URL scheme 预检 | API / Background (SW) | — | SW 拥有 `tabs.query` 权限，且预检必须在 `executeScript` 之前，属 SW 编排职责 |
| `create_at` 生成 | API / Background (SW) | — | CAP-04 明确要求"由扩展生成"、"不依赖网页"，SW 的时钟最可信且远离页面沙箱 |
| DOM 抓取 + 内容转换 | Browser / Content Script | — | Readability / DOMPurify 需要真实页面 DOM，只能在 content script 里跑 |
| snapshot 组装（url + create_at 拼入） | API / Background (SW) | — | url 来自 `tabs.query` 结果（SW 拥有），和 extractor 返回的 partial 合并后才是完整 ArticleSnapshot |
| 三态 UI + signal 管理 | Browser / Client (popup) | — | popup 是唯一的 UI 渲染层；signal 生命周期绑定 popup DOM |
| `capture.run` RPC 路由 | API / Background (SW) | — | 所有跨上下文消息由 SW 统一处理（模式 1） |

---

## Standard Stack

### Core（Phase 2 新增）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mozilla/readability` | `0.6.0` | 从 `document.cloneNode(true)` 提取文章主体 HTML | Mozilla 官方维护，与 Firefox Reader View 同源算法；无依赖；零配置 |
| `dompurify` | `3.4.1` | 净化 Readability 输出的 HTML，消除 XSS tag | Readability 不净化输出；DOMPurify 是行业标准；需真实 DOM，在 content script 里直接可用 |
| `turndown` | `7.2.4` | HTML → Markdown | 纯函数转换，无 DOM 依赖；支持 GFM 插件 |
| `turndown-plugin-gfm` | `1.0.2` | 开启 GFM：表格、删除线、fenced code、task list | IM 平台 Markdown 渲染大多遵从 GFM；无额外依赖 |

[VERIFIED: npm registry] 以上版本为 2026-04-30 npm `latest` tag 验证结果。`@types/dompurify@3.2.0` 已内置于 dompurify 3.x（包自带 `.d.ts`），无需单独安装 `@types/dompurify`。`@types/turndown@5.0.6` 需单独安装。`turndown-plugin-gfm` 无 `@types` 包（不在 npm registry），直接写类型声明即可。

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/turndown` | `5.0.6` | Turndown TypeScript 类型 | TypeScript 编译所需 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `registration: 'runtime'` WXT content script | 裸 `executeScript({ func })` 注入内联函数 | 内联函数无法 `import` 外部库（Readability/DOMPurify/Turndown），必须用文件注入方式 |
| `executeScript` return value | `tabs.sendMessage` 往返 | return value 更简单（无需在 extractor 里注册 message listener），但有 structuredClone 限制（仅支持可序列化数据，ArticleSnapshot 全部是 string，无问题） |

**Installation:**

```bash
pnpm add @mozilla/readability dompurify turndown turndown-plugin-gfm
pnpm add -D @types/turndown
```

---

## Architecture Patterns

### System Architecture Diagram

```
用户点击工具栏图标
        │
        ▼
popup 挂载 (App.tsx)
        │  useEffect: capture.run RPC
        ├─ 渲染 [LOADING] skeleton ──────────────────────────────┐
        ▼                                                        │
SW: onMessage('capture.run', handler)                           │
        │                                                        │
        ├─1. tabs.query { active, lastFocusedWindow }           │
        │                                                        │
        ├─2. URL scheme check ──── scheme ∉ {http,https} ──→ Err('RESTRICTED_URL')
        │                                                        │
        ├─3. create_at = new Date().toISOString()               │
        │                                                        │
        ├─4. executeScript({ files: ['content-scripts/extractor.js'] })
        │      │  ← catch → Err('EXECUTE_SCRIPT_FAILED')        │
        │      ▼                                                 │
        │   content/extractor.ts (ISOLATED world in active tab) │
        │      ├── document.cloneNode(true)                     │
        │      ├── new Readability(clone).parse()               │
        │      ├── DOMPurify.sanitize(article.content)          │
        │      ├── new TurndownService().use(gfm).turndown(html)│
        │      ├── description fallback 三段查询                │
        │      └── return { title, description, content }  ─────┤ structuredClone 通道
        │                                                        │
        ├─5. snapshot = { title, url, description, create_at,  │
        │                  content } ← 合并 SW 字段             │
        │                                                        │
        ├─6. content==='' && title==='' → Err('EXTRACTION_EMPTY')
        │                                                        │
        ├─7. zod.parse(ArticleSnapshotSchema) → Ok(snapshot)   │
        ▼                                                        │
popup useEffect 收到 Result ←──────────────────────────────────┘
        │
        ├── ok=true        → [SUCCESS] textarea × 3 + output × 2
        ├── RESTRICTED_URL → [EMPTY:restricted]
        ├── EXTRACTION_EMPTY → [EMPTY:noContent]
        └── EXECUTE_SCRIPT_FAILED → [ERROR:scriptFailed]
```

### Recommended Project Structure（Phase 2 新增文件）

```
entrypoints/
  extractor.content.ts    # WXT content script (registration:'runtime')
  popup/
    App.tsx               # 替换 hello-world，演化成抓取预览 + 编辑屏

shared/
  messaging/
    protocol.ts           # 追加 capture.run 路由 + ArticleSnapshot schema
    result.ts             # ErrorCode 联合扩展三个新码

tests/
  unit/
    extractor/
      description-fallback.spec.ts   # jsdom environment
      sanitize.spec.ts               # jsdom environment
      markdown-roundtrip.spec.ts     # jsdom environment
    messaging/
      capture.spec.ts     # fakeBrowser + happy-dom
  e2e/
    fixtures/
      article.html        # 本地 HTML fixture（Wikipedia/blog 结构）
    capture.spec.ts
    capture-restricted.spec.ts
```

### Pattern 1: WXT Runtime-Registration Content Script（extractor 独立 bundle）

**What:** 用 `registration: 'runtime'` 定义 extractor，WXT 将其打包为独立 bundle（`content-scripts/extractor.js`），不注册到 manifest 的 `content_scripts`。SW 用 `chrome.scripting.executeScript({ files: ['content-scripts/extractor.js'] })` 按需注入，注入结果直接通过 return value 返回。

**When to use:** 只在用户触发时才运行的内容脚本（节省页面级 CPU，避免持久 content script 监听器）。

[VERIFIED: Context7 /wxt-dev/wxt] WXT scripting.md 原文示例：
```typescript
// entrypoints/extractor.content.ts
export default defineContentScript({
  registration: 'runtime',   // 不加入 manifest content_scripts
  main(ctx) {
    // 业务逻辑在 main() 里
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone).parse();
    // ... DOMPurify, Turndown ...
    return { title, description, content };  // return value 通过 executeScript 通道回 SW
  },
});
```

```typescript
// SW handler 侧
const [result] = await chrome.scripting.executeScript({
  target: { tabId },
  files: ['content-scripts/extractor.js'],
  world: 'ISOLATED',  // 默认值，显式声明
});
const partial = result.result as ExtractorPartial; // { title, description, content }
```

**关键细节：**
- WXT 把 `entrypoints/extractor.content.ts` 打包到 `.output/chrome-mv3/content-scripts/extractor.js`，文件路径即 `'content-scripts/extractor.js'`。[VERIFIED: Context7 scripting.md 示例中 `files: ['content-scripts/example.js']`]
- `executeScript` 的 `result.result` 是 extractor `main()` 的 return value，经 structuredClone 序列化。`ArticleSnapshot` 字段全为 `string`，序列化安全。
- 这比 CONTEXT 中描述的 `tabs.sendMessage` 往返**更简单**（extractor 无需注册 listener）。CONTEXT 使用 sendMessage 是 dispatch 流水线里 adapter 的通信模式；capture extractor 的一次性返回用 return value 通道更简洁。
- `registration: 'runtime'` 脚本**不出现在 manifest 的 `content_scripts` 数组**，但出现在 build 产物中。verify-manifest.ts 的现有断言不受影响。

**Output path mapping:**
```
entrypoints/extractor.content.ts
→ .output/chrome-mv3/content-scripts/extractor.js
→ executeScript({ files: ['content-scripts/extractor.js'] })
```

### Pattern 2: description Fallback 链

**What:** 在 extractor 内顺序查询三个来源，取第一个非空结果。

[VERIFIED: PITFALLS.md 集成坑行"页面元数据 description"]
```typescript
function getDescription(clone: Document, article: ReadabilityArticle | null): string {
  // 1. <meta name="description">
  const metaDesc = clone.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (metaDesc) return metaDesc;

  // 2. og:description
  const ogDesc = clone.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();
  if (ogDesc) return ogDesc;

  // 3. Readability excerpt
  const excerpt = article?.excerpt?.trim();
  if (excerpt) return excerpt;

  return '';
}
```

**注意：** SPA 客户端渲染页面的 meta tag 可能在 Readability 运行时还未由 JS 插入。D-13 的验证目标是静态文章页（Wikipedia / blog），此 fallback 链对静态页完全可靠。SPA 页面的限制留 Phase 2 文档即可，不影响 MVP 验收。

### Pattern 3: popup 状态机（Preact signals）

**What:** 四个互斥状态，由单一 `result` signal 驱动。

[ASSUMED] 以下 Preact 代码模式基于 Phase 1 App.tsx 已验证的 signal + useEffect 形态推演，未另行 Context7 核查（形态极其稳定）。

```tsx
// entrypoints/popup/App.tsx
const snapshotSig = signal<ArticleSnapshot | null>(null);
const errorSig = signal<{ code: ErrorCode; message: string } | null>(null);
// loading = snapshotSig === null && errorSig === null（初始状态）

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await sendMessage('capture.run');
      if (cancelled) return;
      if (result.ok) {
        snapshotSig.value = result.data;
      } else {
        errorSig.value = { code: result.code, message: result.message };
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const snapshot = snapshotSig.value;
  const error = errorSig.value;

  if (snapshot === null && error === null) return <LoadingSkeleton />;
  if (snapshot !== null) return <SuccessView snapshot={snapshot} />;
  if (error?.code === 'EXTRACTION_EMPTY' || error?.code === 'RESTRICTED_URL') return <EmptyView error={error} />;
  return <ErrorView error={error!} />;
}
```

**Signal 命名（by D-22）：** 可编辑字段走独立 signal 而非 `snapshotSig` 内部字段：
```ts
const titleSig = signal('');
const descriptionSig = signal('');
const contentSig = signal('');
// 在 result.ok 时初始化这三个 signal
```

### Pattern 4: ArticleSnapshot Zod Schema

```typescript
// shared/messaging/protocol.ts 追加
import { z } from 'zod';

export const ArticleSnapshotSchema = z.object({
  title:       z.string(),               // 允许空串；空串由 EXTRACTION_EMPTY 处理
  url:         z.string().url(),         // SW 提供，必须合法
  description: z.string(),              // 允许空串
  create_at:   z.string().datetime(),   // ISO-8601，由 SW 生成
  content:     z.string(),              // Markdown，允许空串
});

export type ArticleSnapshot = z.infer<typeof ArticleSnapshotSchema>;

// ProtocolMap 新增路由
export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
  'capture.run'():    Promise<Result<ArticleSnapshot>>;  // Phase 2
}
```

[ASSUMED] `z.string().datetime()` 接受 `new Date().toISOString()` 的输出（形如 `2026-04-30T01:23:45.678Z`）——这是 zod 文档标准行为，基于训练知识，未在本次会话中 Context7 核查。风险极低。

### Pattern 5: capture-pipeline 在 background.ts 的注册位置

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  // Phase 1 路由——保留
  onMessage('meta.bumpHello', wrapHandler(async () => { ... }));

  // Phase 2 路由——在同一 defineBackground 闭包顶层追加
  onMessage('capture.run', wrapHandler(async () => {
    // 业务逻辑可抽到 background/capture-pipeline.ts，
    // 但 listener 注册必须留在这里（FND-02 / SW 纪律）
    return await runCapturePipeline();
  }));
});
```

`runCapturePipeline()` 的实现是否抽到 `background/capture-pipeline.ts` 取决于行数：CONTEXT D-07 同等原则，约 50 行以内可内联。

### Anti-Patterns to Avoid

- **在 extractor 里用 `tabs.sendMessage` 回传结果：** extractor 是一次性脚本，没有持久 listener；直接 `return` 给 `executeScript` 即可，更简单。
- **在 extractor 的模块顶层调用 `document.cloneNode`：** WXT content script 需要在 `main()` 里执行，不要在模块顶层写副作用。
- **在 happy-dom environment 下测试 DOMPurify：** 安全风险，DOMPurify 官方明确不支持 happy-dom。含 DOMPurify 的测试文件必须用 `jsdom`。
- **在 popup 里直接读 `chrome.tabs`：** popup 没有 `tabs` 权限，所有 tab 操作由 SW 完成（模式 1）。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 文章主体内容抽取 | 自己写 CSS selector + innerText | `@mozilla/readability` | 边界情况极多（广告、侧边栏、导航栏剔除）；Readability 处理了数千个真实页面的 edge case |
| HTML 净化 | 自己写 tag allowlist | `DOMPurify` | XSS 攻击面复杂（DOM clobbering、namespace tricks、mutation XSS）；手工实现不安全 |
| HTML → Markdown 转换 | 自己写 regex | `turndown` + `turndown-plugin-gfm` | 嵌套元素、表格、代码块的转换规则繁复；turndown 经过大量真实 HTML 验证 |
| zod schema 验证 | 手写 typeof / instanceof 检查 | `zod`（已安装） | 已在 Phase 1 引入；ArticleSnapshot schema 直接在 ProtocolMap 里用 z.object() 定义 |

**Key insight:** 这三个库的核心价值是正确处理"看起来正常、实则有陷阱"的 HTML。手工实现在 CI 上会通过，但在真实页面上会因 edge case 静默失败。

---

## Common Pitfalls

### Pitfall 1: DOMPurify 在 happy-dom 下运行产生错误结果

**What goes wrong:** `sanitize.spec.ts` 在 Vitest happy-dom 环境下运行，DOMPurify 不报错，但净化结果不可信（可能漏放 XSS payload）。
**Why it happens:** DOMPurify 官方文档明确："happy-dom is not safe" at this point。happy-dom 的 DOM 实现不完整，DOMPurify 的多项检查依赖真实 DOM 的行为语义。[VERIFIED: npm DOMPurify 文档警告]
**How to avoid:** 含 DOMPurify 的测试文件顶部加 `// @vitest-environment jsdom`，单独使用 jsdom environment。Vitest 支持 per-file environment 切换，不影响其他 happy-dom 测试的速度。
**Warning signs:** 测试通过但 DOMPurify 版本警告（检查 console 输出）；sanitize 测试用例用 happy-dom 跑但 `<script>` 没被剥除。

### Pitfall 2: executeScript 文件路径写错

**What goes wrong:** `files: ['extractor.js']` 或 `files: ['content/extractor.js']`，执行时抛 "No resource with given URL found"。
**Why it happens:** WXT 把 `entrypoints/extractor.content.ts` 输出到 `content-scripts/extractor.js`（content-scripts/ 子目录），路径前缀必须是 `content-scripts/`。
**How to avoid:** 路径固定写 `'content-scripts/extractor.js'`，在集成时用一次 `pnpm build` 验证 `.output/chrome-mv3/` 目录结构。[VERIFIED: Context7 WXT scripting.md `files: ['content-scripts/example.js']`]
**Warning signs:** "No resource with given URL" runtime error；SW 日志有 `EXECUTE_SCRIPT_FAILED` 但不知道原因。

### Pitfall 3: Readability 修改 live DOM

**What goes wrong:** `new Readability(document).parse()` 直接传 live `document`，页面 DOM 被改写，用户当前浏览的页面布局错乱。
**Why it happens:** Readability `parse()` 会移除文档中认为是非内容的节点（广告、导航）。[VERIFIED: PITFALLS.md 安全错误第 1 行 + Readability 官方文档]
**How to avoid:** D-14 已锁定：必须传 `document.cloneNode(true)`。
**Warning signs:** 用户点击抓取后页面样式坍塌或内容消失。

### Pitfall 4: popup 渲染从 SW 返回的 EXTRACTION_EMPTY 错误走到 error 三态

**What goes wrong:** extractor 返回空内容，popup 显示红色 error 三态，而不是蓝色 empty 三态。
**Why it happens:** popup 的分支逻辑只判断 `result.ok`，没有区分 ErrorCode。
**How to avoid:** popup 必须在 `result.ok === false` 时再判断 `result.code`：`RESTRICTED_URL` 和 `EXTRACTION_EMPTY` 走 empty 三态（aria-live polite），`EXECUTE_SCRIPT_FAILED` 走 error 三态（aria-live assertive）。
**Warning signs:** Playwright 测试中空页面走到了 error 三态；i18n key 用了 `capture.error.*` 但应该用 `capture.empty.*`。

### Pitfall 5: extractor bundle 被意外暴露为 web_accessible_resources

**What goes wrong:** 有人在 `wxt.config.ts` 或 manifest 里把 `content-scripts/extractor.js` 加入 `web_accessible_resources`，使任意页面 JS 可以 `fetch` 到这个 bundle。
**Why it happens:** MAIN world injection 需要 WAR，容易误加。
**Why it matters:** extractor 里包含 Readability / DOMPurify / Turndown 这些库的完整代码；泄露没有直接安全影响，但违反最小攻击面原则。
**How to avoid:** extractor 用 `registration: 'runtime'` + ISOLATED world，不需要 WAR。`verify-manifest.ts` 断言 `web_accessible_resources` 字段不存在或为空数组（CONTEXT specifics 已提到这个防御性断言）。

### Pitfall 6: Phase 1 hello-world 退役不完全

**What goes wrong:** popup 的 `useEffect` 仍然调用 `sendMessage('meta.bumpHello')`，和新的 `capture.run` 并发，造成两次 RPC。或 SW 端 `meta.bumpHello` handler 被删除，Phase 1 测试断版。
**How to avoid:** CONTEXT 决策：**保留 SW 端 `meta.bumpHello` 注册**（健康探针），但 popup 端删除对它的调用（hello-world UI 替换为 capture UI）。Phase 1 的 `tests/unit/messaging/bumpHello.spec.ts` 测试 SW 侧 mirror 函数，不受 popup 改动影响，可以继续通过。

---

## Code Examples

### extractor 主体逻辑

[VERIFIED: Readability parse() API via Context7 /mozilla/readability]
[VERIFIED: DOMPurify.sanitize() 用法 via npm dompurify 文档]
[ASSUMED] turndown-plugin-gfm 的 `.use(gfm)` API 基于训练知识，与 turndown 官方文档一致，未单独 Context7 核查。

```typescript
// entrypoints/extractor.content.ts
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export default defineContentScript({
  registration: 'runtime',
  main() {
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone).parse();

    const title = article?.title?.trim() || document.title.trim();

    const description = getDescription(document, article); // 不传 clone，因为 meta 在原始 doc 上

    const rawHtml = article?.content ?? '';
    const cleanHtml = DOMPurify.sanitize(rawHtml);          // 默认 profile (D-20)
    const td = new TurndownService();
    td.use(gfm);
    const content = td.turndown(cleanHtml);

    return { title, description, content } satisfies ExtractorPartial;
  },
});

function getDescription(doc: Document, article: ReturnType<Readability['parse']>): string {
  const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
  if (metaDesc) return metaDesc;
  const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();
  if (ogDesc) return ogDesc;
  return article?.excerpt?.trim() ?? '';
}
```

**注意：** `getDescription` 传原始 `document` 而非 `clone`，因为 Readability 在 `clone` 上跑完 `parse()` 后会修改 clone 的 DOM（meta tag 可能被移除）。对 description fallback 查询，用未被改写的原始 document 更安全。

### SW capture-pipeline 核心

[VERIFIED: chrome.scripting.executeScript API via Chrome MV3 文档（ARCHITECTURE.md 来源）]

```typescript
// background/capture-pipeline.ts（或内联到 background.ts）
import type { ArticleSnapshot } from '@/shared/messaging';
import { Ok, Err } from '@/shared/messaging';

interface ExtractorPartial {
  title: string;
  description: string;
  content: string;
}

export async function runCapturePipeline(): Promise<Result<ArticleSnapshot>> {
  // 1. 获取 active tab
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url) {
    return Err('INTERNAL', 'No active tab', false);
  }

  // 2. URL scheme 预检 (D-16)
  const scheme = new URL(tab.url).protocol.replace(':', '');
  if (scheme !== 'http' && scheme !== 'https') {
    return Err('RESTRICTED_URL', tab.url, false);
  }

  // 3. create_at 由 SW 在点击时生成 (CAP-04)
  const create_at = new Date().toISOString();
  const url = tab.url;

  // 4. 注入 extractor
  let results: chrome.scripting.InjectionResult[];
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-scripts/extractor.js'],
      world: 'ISOLATED',
    });
  } catch (err) {
    return Err('EXECUTE_SCRIPT_FAILED', String(err), true);
  }

  // 5. 拿 return value
  const partial = results[0]?.result as ExtractorPartial | undefined;
  if (!partial) {
    return Err('EXECUTE_SCRIPT_FAILED', 'No result from extractor', true);
  }

  // 6. 空内容检查 (D-17 EXTRACTION_EMPTY)
  if (!partial.content && !partial.title) {
    return Err('EXTRACTION_EMPTY', 'Readability returned empty', false);
  }

  // 7. 合并 SW 字段，zod 校验输出
  const snapshot: ArticleSnapshot = {
    title: partial.title,
    url,
    description: partial.description,
    create_at,
    content: partial.content,
  };
  // zod parse 在 protocol.ts 的 schemas 里做，或在此处做
  return Ok(snapshot);
}
```

### 单元测试：extractor description fallback（jsdom environment）

```typescript
// tests/unit/extractor/description-fallback.spec.ts
// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';

// getDescription 从 extractor 中单独导出，或复刻一份 mirror 函数（同 bumpHelloCore 模式）
describe('description fallback', () => {
  it('takes meta[name="description"] first', () => { ... });
  it('falls back to og:description', () => { ... });
  it('falls back to Readability excerpt', () => { ... });
});
```

### Playwright E2E：打开本地 fixture

[VERIFIED: Playwright page.setContent API via Context7]

```typescript
// tests/e2e/capture.spec.ts
test('capture: local fixture page fills 5 fields within 2s', async ({ context, extensionId }) => {
  const articleHtml = readFileSync('tests/e2e/fixtures/article.html', 'utf-8');
  const page = await context.newPage();
  await page.setContent(articleHtml, { waitUntil: 'domcontentloaded' });
  // 注：setContent 页面 URL 是 about:blank，会被 SW URL scheme 预检拒绝。
  // 需要使用 page.route + page.goto(file://) 或 fileURLToPath 方式。
  // 推荐方案：Playwright devServer 或 page.goto('file://' + absolutePath)
  // 但 file:// 需要 --allow-file-access-from-files flag（见 §Open Questions #1）
});
```

---

## Runtime State Inventory

Phase 2 是功能新增，无 rename/refactor，跳过 Runtime State Inventory。

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chrome.tabs.executeScript`（MV2） | `chrome.scripting.executeScript`（MV3） | 2022 MV3 | 项目已用 MV3，无影响 |
| 静态 `content_scripts` 数组 | `registration: 'runtime'` + 编程注入 | WXT 0.18+ | 更精细的权限控制，无持久 content script |
| Readability + jsdom 在 Node 侧抓取 | Readability 在 content script 中跑真实 DOM | n/a | content script 方式更准，不需要 jsdom |

**Deprecated/outdated:**
- `chrome.tabs.executeScript`：MV2 API，已废弃，项目已用 MV3 `chrome.scripting` 代替。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `executeScript` return value 通道可返回 `{ title, description, content }` 等 string 字段的 plain object，不需要 `tabs.sendMessage` | Pattern 1 | 如果 return value 通道不可用或有大小限制，需要换 sendMessage 方案；但 Chrome 文档明确支持 structuredClone 可序列化对象，风险极低 |
| A2 | `z.string().datetime()` 接受 `new Date().toISOString()` 输出 | Pattern 4 | 若 zod 版本的 `.datetime()` 不接受 UTC `Z` 后缀，需改为 `z.string()` 加手动格式检查；可在实现时一行验证 |
| A3 | `turndown-plugin-gfm` 的 `.use(gfm)` API 与 turndown 7.2 兼容 | Code Examples | 若 API 变化，需查文档调整；低风险（turndown-plugin-gfm 1.0.2 稳定） |
| A4 | Preact `useEffect` + async IIFE 的 cancelled flag 模式（Phase 1 验证过）可直接用于 `capture.run` | Pattern 3 | 已在 Phase 1 App.tsx 验证，风险为零 |
| A5 | `getDescription` 查询原始 `document`（非 clone）比查 clone 更安全，因为 Readability 会修改 clone | Code Examples | 若 Readability 实际上不修改 meta tag，两者等价；用原始 document 只会更安全，不会更差 |

---

## Open Questions

1. **E2E fixture 如何在 Playwright 中作为 active tab 打开（使 SW URL scheme 预检通过）**
   - What we know：`page.setContent()` 产生的页面 URL 是 `about:blank`，会被 scheme 预检拦截（`about:` 不在 `{http, https}` 集合里）；`file://` URL 在 Chrome 扩展的 `activeTab` 下会有访问限制。
   - What's unclear：Playwright 是否支持通过内置 HTTP server 提供 fixture 的能力（`baseURL`），从而让 fixture 以 `http://localhost` URL 打开？
   - Recommendation：用 `playwright.config.ts` 里的 `webServer` 配置（或第三方 `serve-static` 包）起一个本地 HTTP server 提供 fixture 文件，然后 `page.goto('http://localhost:PORT/article.html')`。这让 URL 走 `http` 通过 scheme 预检，且不需要 `--allow-file-access-from-files` flag。Playwright `webServer` 是官方方式。[ASSUMED] 需在 Phase 2 plan 中确认此方案的 `playwright.config.ts` 配置写法。

2. **`capture-restricted.spec.ts` 如何导航到 `chrome://newtab` 并触发 popup**
   - What we know：Playwright E2E 通过 `context.newPage()` 打开 popup URL，但当前 active tab 不能人为指定为 `chrome://newtab`（`chrome://` 页面不能通过 Playwright `page.goto` 直接打开）。
   - What's unclear：如何让 SW 的 `tabs.query({ active, lastFocusedWindow })` 返回一个受限页面 tab？
   - Recommendation：不能用真实 `chrome://newtab`。替代方案：E2E 测试中打开 popup，但在打开前确保 active tab 是一个 `chrome-extension://` URL（也会被 scheme 预检拦截）；或者 mock SW handler 返回 `RESTRICTED_URL` 错误。更实际的做法：改为**单元测试**（`fakeBrowser.tabs.create` 模拟受限 tab，mock `tabs.query` 返回带 `chrome://` URL 的 tab），而非 E2E 测试。planner 需决定 restricted URL 测试在单元测试还是 E2E 测试层验证。

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | pnpm / WXT build | ✓ | 见 engines.node ≥ 20.19 | — |
| pnpm | package manager | ✓ | 10.33.2 | — |
| `@mozilla/readability` | CAP-02 | ✗ (需安装) | — | 无 |
| `dompurify` | CAP-02 | ✗ (需安装) | — | 无 |
| `turndown` | CAP-02 | ✗ (需安装) | — | 无 |
| `turndown-plugin-gfm` | CAP-02 | ✗ (需安装) | — | 无 |
| `@types/turndown` | TypeScript 编译 | ✗ (需安装) | — | 无 |
| Playwright Chromium | E2E 测试 | ✓ | 1.59.1 (Phase 1 已装) | — |

**Missing dependencies with no fallback（Wave 0 必须安装）:**

```bash
pnpm add @mozilla/readability dompurify turndown turndown-plugin-gfm
pnpm add -D @types/turndown
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (已存在) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test && pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAP-01 | SW 注入 extractor，返回 ArticleSnapshot | unit | `pnpm test -- capture.spec.ts` | ❌ Wave 0 |
| CAP-02 | extractor 用 Readability + DOMPurify + Turndown | unit (jsdom) | `pnpm test -- extractor/` | ❌ Wave 0 |
| CAP-03 | description fallback 三分支 | unit (jsdom) | `pnpm test -- description-fallback.spec.ts` | ❌ Wave 0 |
| CAP-04 | `create_at` 是 ISO-8601，由 SW 生成 | unit | `pnpm test -- capture.spec.ts` | ❌ Wave 0 |
| CAP-05 | popup 2s 内展示 5 字段 + textarea 可编辑 | e2e | `pnpm test:e2e -- capture.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test` (unit only, < 30s)
- **Per wave merge:** `pnpm test && pnpm typecheck && pnpm lint`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/extractor/description-fallback.spec.ts` — `// @vitest-environment jsdom` + 三分支测试
- [ ] `tests/unit/extractor/sanitize.spec.ts` — `// @vitest-environment jsdom` + DOMPurify XSS 净化验证
- [ ] `tests/unit/extractor/markdown-roundtrip.spec.ts` — `// @vitest-environment jsdom` + 标题/代码块/链接保留
- [ ] `tests/unit/messaging/capture.spec.ts` — happy-dom + fakeBrowser，SW pipeline mock 四路径
- [ ] `tests/e2e/fixtures/article.html` — 本地 HTML fixture
- [ ] `tests/e2e/capture.spec.ts` — popup 2s 填充五字段
- [ ] `tests/e2e/capture-restricted.spec.ts` — restricted URL → empty 三态（或改为单元测试，见 Open Question #2）
- [ ] 安装依赖：`pnpm add @mozilla/readability dompurify turndown turndown-plugin-gfm && pnpm add -D @types/turndown`

---

## Security Domain

> `security_enforcement: true`，ASVS Level 1 适用。

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Phase 2 不涉及用户认证 |
| V3 Session Management | no | Phase 2 无 session |
| V4 Access Control | yes (partial) | `chrome.scripting.executeScript` 权限由 `activeTab` 控制；URL scheme 预检防止在受限页面注入 |
| V5 Input Validation | yes | `ArticleSnapshot` zod schema 校验 extractor 输出；DOMPurify 净化 HTML；popup 不渲染 HTML |
| V6 Cryptography | no | Phase 2 无加密需求 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 恶意页面构造内容注入 XSS payload 到 ArticleSnapshot | Tampering | DOMPurify 净化（D-20）；popup 用 textarea value 渲染 Markdown，不用 innerHTML（PITFALLS 安全错误第 1 条） |
| extractor bundle 被第三方页面读取 | Information Disclosure | 不加入 `web_accessible_resources`；ISOLATED world 隔离 |
| sender.id 未验证（来自第三方扩展的 capture.run 伪造消息） | Spoofing | `@webext-core/messaging` 默认只接受来自自身扩展的消息（Phase 1 D-05 已建立）；无需额外配置 |
| `chrome://` 受限页面执行 executeScript 抛错泄露信息 | Elevation of Privilege | URL scheme 预检（D-16）在进入 executeScript 前拦截；错误码 `RESTRICTED_URL` 不暴露底层 chrome 错误文案 |

---

## Sources

### Primary (HIGH confidence)

- [Context7 /wxt-dev/wxt] — content scripts, registration:runtime, executeScript, build output path, unlisted scripts
- [Context7 /mozilla/readability] — `parse()` return structure, `document.cloneNode(true)` requirement
- [Context7 /microsoft/playwright] — `page.setContent`, E2E extension testing fixture pattern
- [Context7 /wxt-dev/wxt - scripting.md] — `files: ['content-scripts/example.js']` path convention, return value pattern

### Secondary (MEDIUM confidence)

- [npm registry 2026-04-30] — `@mozilla/readability@0.6.0`, `dompurify@3.4.1`, `turndown@7.2.4`, `turndown-plugin-gfm@1.0.2`, `@types/turndown@5.0.6`
- [DOMPurify npm 文档] — happy-dom 不安全警告（明确声明）

### Tertiary (LOW confidence)

- WebSearch: DOMPurify + happy-dom 安全风险 — 多方来源确认官方警告，已升级为 HIGH

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — npm registry 核验版本；库 API 经 Context7 核查
- Architecture: HIGH — WXT scripting.md 原文示例 + Phase 1 已验证的 SW 纪律
- Pitfalls: HIGH — DOMPurify 官方文档明确 happy-dom 不支持；其他来自 Phase 1 已验证模式
- Open questions: LOW — E2E fixture HTTP server 方案为推断，需 plan 阶段验证

**Research date:** 2026-04-30
**Valid until:** 2026-05-30（WXT 和 Readability 较稳定；DOMPurify 建议跟踪安全更新）

---

## RESEARCH COMPLETE
