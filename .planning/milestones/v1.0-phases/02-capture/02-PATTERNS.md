# Phase 2: 抓取流水线 (Capture Pipeline) - Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 9 (新增/修改)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `entrypoints/extractor.content.ts` | content-script | request-response | `entrypoints/background.ts` (SW handler pattern) | partial |
| `background/capture-pipeline.ts` | service | request-response | `entrypoints/background.ts` (bumpHello handler) | role-match |
| `entrypoints/background.ts` | service-worker | request-response | `entrypoints/background.ts` 自身（追加路由） | exact |
| `shared/messaging/protocol.ts` | utility | request-response | `shared/messaging/protocol.ts` 自身（追加路由） | exact |
| `shared/messaging/result.ts` | utility | request-response | `shared/messaging/result.ts` 自身（扩展联合） | exact |
| `shared/messaging/index.ts` | utility | — | `shared/messaging/index.ts` 自身（追加 re-export） | exact |
| `entrypoints/popup/App.tsx` | component | request-response | `entrypoints/popup/App.tsx` 自身（替换 hello-world） | exact |
| `tests/unit/messaging/capture.spec.ts` | test | request-response | `tests/unit/messaging/bumpHello.spec.ts` | exact |
| `tests/unit/extractor/*.spec.ts` (3 files) | test | request-response | `tests/unit/messaging/bumpHello.spec.ts` | role-match |
| `tests/e2e/capture.spec.ts` | test | request-response | `tests/e2e/popup-rpc.spec.ts` | exact |
| `tests/e2e/capture-restricted.spec.ts` | test | request-response | `tests/e2e/popup-rpc.spec.ts` | exact |

---

## Pattern Assignments

### `entrypoints/extractor.content.ts` (content-script, request-response)

**Analog:** `entrypoints/background.ts` (结构参考) + RESEARCH.md Pattern 1（WXT runtime-registration）

**WXT content script pattern** — 无现有 content script 模拟；按 RESEARCH.md Pattern 1 实现：

```typescript
// entrypoints/extractor.content.ts
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export default defineContentScript({
  registration: 'runtime',   // 不注册到 manifest content_scripts，仅生成独立 bundle
  main() {
    // 所有副作用在 main() 里，不在模块顶层（与 background.ts 的 defineBackground 模式对称）
    const clone = document.cloneNode(true) as Document;  // D-14: 必须传 clone
    const article = new Readability(clone).parse();

    const title = article?.title?.trim() || document.title.trim();
    const description = getDescription(document, article); // 原始 doc，非 clone

    const rawHtml = article?.content ?? '';
    const cleanHtml = DOMPurify.sanitize(rawHtml);        // D-20: 默认 profile
    const td = new TurndownService();
    td.use(gfm);
    const content = td.turndown(cleanHtml);               // D-18: Markdown only

    return { title, description, content };               // return value 通道回 SW
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

**Build output path:** `entrypoints/extractor.content.ts` → `.output/chrome-mv3/content-scripts/extractor.js` → `executeScript({ files: ['content-scripts/extractor.js'] })`

---

### `background/capture-pipeline.ts` (service, request-response)

**Analog:** `entrypoints/background.ts` (bumpHello handler 内联模式)

**Imports pattern** (`entrypoints/background.ts` lines 2-3):
```typescript
import { onMessage, schemas, Ok, Err } from '@/shared/messaging';
import { metaItem } from '@/shared/storage';
```

**Core pipeline pattern** — 参照 RESEARCH.md Code Examples，与 background.ts 的 handler 结构对齐：

```typescript
// background/capture-pipeline.ts
import type { ArticleSnapshot } from '@/shared/messaging';
import { Ok, Err, type Result } from '@/shared/messaging';

interface ExtractorPartial {
  title: string;
  description: string;
  content: string;
}

export async function runCapturePipeline(): Promise<Result<ArticleSnapshot>> {
  // 1. 获取 active tab（与 bumpHello 的 metaItem.getValue() 对称：handler 内读状态）
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url) {
    return Err('INTERNAL', 'No active tab', false);
  }

  // 2. URL scheme 预检（D-16）
  const scheme = new URL(tab.url).protocol.replace(':', '');
  if (scheme !== 'http' && scheme !== 'https') {
    return Err('RESTRICTED_URL', tab.url, false);
  }

  // 3. create_at 由 SW 生成（CAP-04）
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
  if (!partial) return Err('EXECUTE_SCRIPT_FAILED', 'No result from extractor', true);

  // 6. 空内容检查（D-17）
  if (!partial.content && !partial.title) {
    return Err('EXTRACTION_EMPTY', 'Readability returned empty', false);
  }

  // 7. 合并 SW 字段，返回 Ok
  return Ok({ title: partial.title, url, description: partial.description, create_at, content: partial.content });
}
```

**Error handling pattern** (`entrypoints/background.ts` lines 34-44):
```typescript
// wrapHandler 封装所有 throw → Err('INTERNAL', ...) —— capture-pipeline 内部 try/catch 处理
// 业务异常路径（Err）；编程错误由 wrapHandler 兜底
function wrapHandler<R>(fn: () => Promise<R>): () => Promise<R> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[bg] handler threw — converting to Err(INTERNAL):', err);
      return Err('INTERNAL', message, false) as R;
    }
  };
}
```

---

### `entrypoints/background.ts` (service-worker, 追加 `capture.run` 路由)

**Analog:** `entrypoints/background.ts` 自身（在同文件追加）

**SW 顶层 listener 注册模式** (lines 46-70)：
```typescript
export default defineBackground(() => {
  // Phase 1 路由——保留（bumpHello 作为 SW 健康探针）
  onMessage('meta.bumpHello', wrapHandler(async () => { ... }));

  // Phase 2 路由——在同一 defineBackground 闭包顶层追加，绝无 await 先于此
  onMessage('capture.run', wrapHandler(async () => {
    return await runCapturePipeline();  // 业务核 > ~50 行时抽到 background/capture-pipeline.ts
  }));

  // Future phases 继续在此追加 listener（FND-02）
});
```

**关键约束**（`entrypoints/background.ts` lines 6-14 注释）：
- 所有 `onMessage` 调用必须同步出现在 `defineBackground` 顶层闭包
- 前面绝无 `await`
- handler 内部每次调用从 `chrome.storage.*` 读取状态（不依赖 module-scope 变量）

---

### `shared/messaging/protocol.ts` (utility, 追加 `capture.run` 路由 + `ArticleSnapshot` schema)

**Analog:** `shared/messaging/protocol.ts` 自身

**现有 imports + 接口结构** (lines 1-38)：
```typescript
import { defineExtensionMessaging } from '@webext-core/messaging';
import { z } from 'zod';
import type { MetaSchema } from '@/shared/storage';
import type { Result } from './result';

export interface ProtocolMap {
  'meta.bumpHello'(): Promise<Result<MetaSchema>>;
  // Phase 2 追加：
  'capture.run'(): Promise<Result<ArticleSnapshot>>;
}

export const schemas = {
  'meta.bumpHello': { input: z.void(), output: z.object({ ... }) },
  // Phase 2 追加：
  'capture.run': {
    input: z.void(),
    output: ArticleSnapshotSchema,
  },
} as const;
```

**Phase 2 新增类型**（紧接现有 schemas const 之后定义）：
```typescript
export const ArticleSnapshotSchema = z.object({
  title:       z.string(),               // 允许空串；EXTRACTION_EMPTY 处理空串情形
  url:         z.string().url(),         // SW 提供，必须合法
  description: z.string(),              // 允许空串
  create_at:   z.string().datetime(),   // ISO-8601，SW 用 new Date().toISOString() 生成
  content:     z.string(),              // Markdown，允许空串
});

export type ArticleSnapshot = z.infer<typeof ArticleSnapshotSchema>;
```

---

### `shared/messaging/result.ts` (utility, 扩展 ErrorCode 联合)

**Analog:** `shared/messaging/result.ts` 自身

**现有 ErrorCode 定义** (line 13)：
```typescript
export type ErrorCode = 'INTERNAL';
```

**Phase 2 扩展**（D-17）——同文件，注释说明扩展 phase：
```typescript
// Phase 2 (CAP-*): | 'RESTRICTED_URL' | 'EXTRACTION_EMPTY' | 'EXECUTE_SCRIPT_FAILED'
// Phase 3 (DSP-07): | 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'TIMEOUT' | 'RATE_LIMITED'
// Phase 4 (ADO-05): | 'OPENCLAW_OFFLINE' | 'OPENCLAW_PERMISSION_DENIED'
export type ErrorCode =
  | 'INTERNAL'
  | 'RESTRICTED_URL'         // URL scheme ∉ {http,https}，不重试
  | 'EXTRACTION_EMPTY'       // Readability 返回空，popup 渲染 empty 三态
  | 'EXECUTE_SCRIPT_FAILED'; // executeScript 抛错，retriable=true
```

**`Ok` / `Err` helpers 保持不动**（lines 19-27）。

---

### `shared/messaging/index.ts` (utility, 追加 re-export)

**Analog:** `shared/messaging/index.ts` 自身

**现有 barrel** (lines 1-4):
```typescript
export type { Result, ErrorCode } from './result';
export { Ok, Err } from './result';
export type { ProtocolMap, MetaBumpHelloOutput } from './protocol';
export { sendMessage, onMessage, schemas } from './protocol';
```

**Phase 2 追加**（仅在 protocol 行新增 `ArticleSnapshot` / `ArticleSnapshotSchema`）：
```typescript
export type { ProtocolMap, MetaBumpHelloOutput, ArticleSnapshot } from './protocol';
export { sendMessage, onMessage, schemas, ArticleSnapshotSchema } from './protocol';
```

---

### `entrypoints/popup/App.tsx` (component, request-response)

**Analog:** `entrypoints/popup/App.tsx` 自身（演化替换）

**现有 signal + useEffect 模式** (lines 1-39)：
```typescript
import { useEffect } from 'preact/hooks';
import { signal } from '@preact/signals';
import { sendMessage } from '@/shared/messaging';
import { t } from '@/shared/i18n';

const helloCount = signal<number | null>(null);
const errorMessage = signal<string | null>(null);

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await sendMessage('meta.bumpHello');
      if (cancelled) return;
      if (result.ok) {
        helloCount.value = result.data.helloCount;
      } else {
        errorMessage.value = result.message;
      }
    })();
    return () => { cancelled = true; };
  }, []);
  // ...
}
```

**Phase 2 演化版本**——保留 cancelled-flag async IIFE 模式，替换 signal 定义和渲染逻辑：
```typescript
// signals（D-22）
const snapshotSig = signal<ArticleSnapshot | null>(null);
const errorSig = signal<{ code: ErrorCode; message: string } | null>(null);
// 可编辑字段独立 signal，popup 关闭即清空
const titleSig = signal('');
const descriptionSig = signal('');
const contentSig = signal('');

export function App() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await sendMessage('capture.run');  // D-15: mount 自动 trigger
      if (cancelled) return;
      if (result.ok) {
        snapshotSig.value = result.data;
        titleSig.value = result.data.title;
        descriptionSig.value = result.data.description;
        contentSig.value = result.data.content;
      } else {
        errorSig.value = { code: result.code, message: result.message };
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const snapshot = snapshotSig.value;
  const error = errorSig.value;

  // 三态分支（D-17 + Pitfall 4：EXTRACTION_EMPTY 走 empty，不走 error）
  if (snapshot === null && error === null) return <LoadingSkeleton />;    // loading
  if (snapshot !== null)                  return <SuccessView />;         // success
  if (error?.code === 'EXTRACTION_EMPTY' || error?.code === 'RESTRICTED_URL')
    return <EmptyView error={error} />;                                   // empty
  return <ErrorView error={error!} />;                                    // error
}
```

**Tailwind v4 utility-first**（现有模式，lines 53-58）：
```tsx
<main
  class="flex flex-col items-center justify-center gap-2 p-6 font-sans text-base"
  aria-busy="true"
  data-testid="popup-loading"
/>
```

---

### `tests/unit/messaging/capture.spec.ts` (test, fakeBrowser + happy-dom)

**Analog:** `tests/unit/messaging/bumpHello.spec.ts`

**Mirror-function 模式** (lines 1-25)：
```typescript
import { beforeEach, describe, it, expect } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
// import 项目 shared + 待测业务核

/**
 * Mirror of the capture pipeline business core.
 * Kept colocated with the test to avoid exposing it from the SW entrypoint.
 */
async function capturePipelineCore(/* mock deps */): Promise<Result<ArticleSnapshot>> {
  // mirror runCapturePipeline 逻辑，依赖通过参数注入而非全局
  // ...
}

describe('capture pipeline core', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns RESTRICTED_URL for chrome:// tab', async () => { ... });
  it('returns EXECUTE_SCRIPT_FAILED when executeScript rejects', async () => { ... });
  it('returns EXTRACTION_EMPTY when Readability returns empty', async () => { ... });
  it('returns Ok(snapshot) with ISO-8601 create_at on success', async () => { ... });
});
```

**fakeBrowser.reset() 在 beforeEach**（lines 28-30 of bumpHello.spec.ts）：
```typescript
beforeEach(() => {
  fakeBrowser.reset();
});
```

---

### `tests/unit/extractor/description-fallback.spec.ts` / `sanitize.spec.ts` / `markdown-roundtrip.spec.ts` (test, jsdom environment)

**Analog:** `tests/unit/messaging/bumpHello.spec.ts` (结构) + jsdom environment 指令（RESEARCH.md Pitfall 1）

**关键差异**——这三个文件必须在文件头声明 jsdom environment（DOMPurify 不支持 happy-dom）：

```typescript
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
// 注意：不导入 fakeBrowser（jsdom env 下 WXT fake-browser 可能不完整）
// extractor 纯函数 helper 单独导出测试

describe('description fallback', () => {
  it('takes meta[name="description"] first', () => {
    // 用 document.createElement / innerHTML 构造 fixture DOM
    const doc = document.implementation.createHTMLDocument();
    doc.head.innerHTML = '<meta name="description" content="primary">';
    expect(getDescription(doc, null)).toBe('primary');
  });
  it('falls back to og:description', () => { ... });
  it('falls back to Readability excerpt', () => { ... });
});
```

---

### `tests/e2e/capture.spec.ts` (test, Playwright + launchPersistentContext)

**Analog:** `tests/e2e/popup-rpc.spec.ts`

**Imports + fixtures 模式** (lines 1)：
```typescript
import { test, expect } from './fixtures';  // 复用 Phase 1 已有 fixture
```

**Page 操作 + locator 等待模式** (popup-rpc.spec.ts lines 24-31)：
```typescript
test('capture: local fixture page fills 5 fields within 2s', async ({ context, extensionId }) => {
  // 1. 打开 fixture 文章页（需 HTTP server，见 Open Question #1）
  const articlePage = await context.newPage();
  await articlePage.goto('http://localhost:PORT/article.html');

  // 2. 打开 popup（与 popup-rpc.spec.ts 模式一致）
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await popup.goto(popupUrl);

  // 3. 等待 loading 结束（最多 2s）
  await popup.waitForSelector('[data-testid="capture-field-title"]', { timeout: 2_000 });

  // 4. 断言五字段均有值
  await expect(popup.locator('[data-testid="capture-field-title"]')).not.toBeEmpty();
  // ...
});
```

---

### `tests/e2e/capture-restricted.spec.ts` (test)

**Analog:** `tests/e2e/popup-rpc.spec.ts` (结构) — 但 RESEARCH.md Open Question #2 建议降级为单元测试

**推荐：改为单元测试**（`tests/unit/messaging/capture.spec.ts` 中覆盖 RESTRICTED_URL 分支），而非 E2E 测试。如果保留 E2E，只能通过 mock SW 返回或确保 active tab 是 `chrome-extension://` URL（也是受限 URL）来间接触发。

若保留 E2E，沿用 `tests/e2e/fixtures.ts` 的 `context` + `extensionId` fixture：
```typescript
import { test, expect } from './fixtures';

test('capture-restricted: chrome-extension:// tab → empty state', async ({ context, extensionId }) => {
  // chrome-extension:// tab 会被 URL scheme 预检拒绝（不在 {http,https} 集合）
  // popup 应渲染 capture.empty.restricted 文案
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const popup = await context.newPage();
  await popup.goto(popupUrl);
  await expect(popup.locator('[data-testid="capture-empty"]')).toBeVisible({ timeout: 2_000 });
});
```

---

## Shared Patterns

### 1. `wrapHandler` 错误转换
**Source:** `entrypoints/background.ts` lines 34-44
**Apply to:** `entrypoints/background.ts`（capture.run 路由注册时复用同一 wrapHandler）

```typescript
function wrapHandler<R>(fn: () => Promise<R>): () => Promise<R> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[bg] handler threw — converting to Err(INTERNAL):', err);
      return Err('INTERNAL', message, false) as R;
    }
  };
}
```

### 2. Preact signal + cancelled-flag async IIFE
**Source:** `entrypoints/popup/App.tsx` lines 23-39
**Apply to:** `entrypoints/popup/App.tsx`（Phase 2 演化版，沿用此模式）

```typescript
useEffect(() => {
  let cancelled = false;
  void (async () => {
    const result = await sendMessage('capture.run');
    if (cancelled) return;
    // 更新 signals
  })();
  return () => { cancelled = true; };
}, []);
```

### 3. fakeBrowser.reset() 单元测试 setup
**Source:** `tests/unit/messaging/bumpHello.spec.ts` lines 28-30
**Apply to:** `tests/unit/messaging/capture.spec.ts`（所有 fakeBrowser 单元测试）

```typescript
beforeEach(() => {
  fakeBrowser.reset();
});
```

### 4. `// @vitest-environment jsdom` 文件级切换
**Source:** RESEARCH.md Pitfall 1（DOMPurify 不支持 happy-dom）
**Apply to:** `tests/unit/extractor/description-fallback.spec.ts` / `sanitize.spec.ts` / `markdown-roundtrip.spec.ts`

```typescript
// @vitest-environment jsdom
// 必须是文件第一行注释
```

### 5. Playwright fixtures 复用
**Source:** `tests/e2e/fixtures.ts` lines 17-106
**Apply to:** `tests/e2e/capture.spec.ts` / `tests/e2e/capture-restricted.spec.ts`

```typescript
import { test, expect } from './fixtures';  // 直接复用，不新建 fixture
```

### 6. i18n `t(...)` 调用
**Source:** `entrypoints/popup/App.tsx` line 4 + `shared/i18n/index.ts`
**Apply to:** `entrypoints/popup/App.tsx`（所有 capture 三态文案）

```typescript
import { t } from '@/shared/i18n';
// 用法：t('capture.loading.label') / t('capture.empty.restricted') / etc.
// 绝不用裸字符串（PITFALLS §陷阱 11）
```

### 7. 路径别名 `@/shared/...`
**Source:** `entrypoints/background.ts` line 2 / `entrypoints/popup/App.tsx` lines 3-4
**Apply to:** 所有新文件的 import 路径

```typescript
import { Ok, Err } from '@/shared/messaging';
import { t } from '@/shared/i18n';
// WXT 配置的 @ alias 指向项目根目录
```

---

## No Analog Found

Phase 2 所有文件均有对应 analog 或已有充足的 RESEARCH.md 模式参考，无需标记为"无 analog"。

唯一例外：**`entrypoints/extractor.content.ts`** 是项目第一个 WXT content script，无直接同类 analog。但 RESEARCH.md Pattern 1 提供了完整的 WXT 官方示例代码（经 Context7 核查），可直接作为实现模板。

---

## Metadata

**Analog search scope:** `/data/coding/projects/seven/web2chat/entrypoints/`, `/data/coding/projects/seven/web2chat/shared/messaging/`, `/data/coding/projects/seven/web2chat/tests/`
**Files scanned:** 13 (全部 Phase 1 已落地 TypeScript/TSX 文件)
**Pattern extraction date:** 2026-04-30
