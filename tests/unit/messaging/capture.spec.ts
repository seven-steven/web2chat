/**
 * Unit tests for the capture pipeline business core (CAP-01, CAP-04, D-15..D-17).
 *
 * Uses the mirror-function pattern from bumpHello.spec.ts — the actual SW handler
 * in entrypoints/background.ts is not imported; instead, a capturePipelineCore
 * function mirrors the logic with injectable mock dependencies.
 *
 * Why mirror and not direct import:
 *   - SW entrypoint (background.ts) must keep its top-level surface minimal (FND-02)
 *   - background/capture-pipeline.ts (Wave 4) exports runCapturePipeline, but that
 *     module depends on chrome.scripting which needs careful mocking
 *   - Mirror pattern lets us test the branching logic without WXT entrypoint setup
 *
 * Maintainer note (mirror 函数同步责任): Phase 3+ 修改真实 capture-pipeline 时
 *   （如新增步骤、调整 ErrorCode、改时序），必须同步更新此 mirror 函数；本测试
 *   是该流水线分支逻辑的红灯参考。
 *
 * Environment: happy-dom (project default) — no DOMPurify involved here.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { Ok, Err, type Result } from '@/shared/messaging';
import type { ArticleSnapshot } from '@/shared/messaging';
import type { ExtractorPartial } from '@/entrypoints/extractor.content';

// ─── Mirror of runCapturePipeline (PATTERNS.md §capture.spec.ts) ─────────────

interface MockDeps {
  tabUrl: string;
  tabId: number;
  executeScriptResult?: ExtractorPartial;
  executeScriptShouldThrow?: boolean;
}

/**
 * Mirror function that replicates the branching logic of runCapturePipeline.
 * Dependencies are injected directly (no chrome.* globals needed).
 * The Date is also injectable via the optional nowIso parameter.
 */
async function capturePipelineCore(
  deps: MockDeps,
  nowIso: string = new Date().toISOString(),
): Promise<Result<ArticleSnapshot>> {
  const { tabUrl, executeScriptResult, executeScriptShouldThrow } = deps;

  // Step 2: URL scheme check (D-16)
  let scheme: string;
  try {
    scheme = new URL(tabUrl).protocol.replace(':', '');
  } catch {
    return Err('INTERNAL', 'Invalid tab URL', false);
  }
  if (scheme !== 'http' && scheme !== 'https') {
    return Err('RESTRICTED_URL', tabUrl, false);
  }

  // Step 3: create_at by SW (CAP-04)
  const create_at = nowIso;
  const url = tabUrl;

  // Step 4: inject extractor (mocked)
  if (executeScriptShouldThrow) {
    return Err('EXECUTE_SCRIPT_FAILED', 'executeScript rejected', true);
  }

  const partial = executeScriptResult;
  if (!partial) {
    return Err('EXECUTE_SCRIPT_FAILED', 'No result from extractor', true);
  }

  // Step 5: empty content check (D-17)
  if (!partial.content && !partial.title) {
    return Err('EXTRACTION_EMPTY', 'Readability returned empty', false);
  }

  // Step 6: assemble snapshot
  return Ok({
    title: partial.title,
    url,
    description: partial.description,
    create_at,
    content: partial.content,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('capture pipeline core (CAP-01, CAP-04, D-15..D-17)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('returns RESTRICTED_URL for chrome:// tab (D-16)', async () => {
    const result = await capturePipelineCore({ tabUrl: 'chrome://newtab', tabId: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('RESTRICTED_URL');
      expect(result.retriable).toBe(false);
    }
  });

  it('returns RESTRICTED_URL for file:// tab (D-16)', async () => {
    const result = await capturePipelineCore({ tabUrl: 'file:///etc/hosts', tabId: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('RESTRICTED_URL');
  });

  it('returns EXECUTE_SCRIPT_FAILED when executeScript throws (D-17)', async () => {
    const result = await capturePipelineCore({
      tabUrl: 'https://example.com',
      tabId: 1,
      executeScriptShouldThrow: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EXECUTE_SCRIPT_FAILED');
      expect(result.retriable).toBe(true);
    }
  });

  it('returns EXTRACTION_EMPTY when title and content are both empty (D-17)', async () => {
    const result = await capturePipelineCore({
      tabUrl: 'https://example.com',
      tabId: 1,
      executeScriptResult: { title: '', description: '', content: '' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EXTRACTION_EMPTY');
      expect(result.retriable).toBe(false);
    }
  });

  it('returns Ok(snapshot) with correct url and ISO-8601 create_at on success (CAP-04)', async () => {
    const frozenNow = '2026-04-30T12:00:00.000Z';
    const result = await capturePipelineCore(
      {
        tabUrl: 'https://example.com/article',
        tabId: 1,
        executeScriptResult: {
          title: 'Test Article',
          description: 'A test article description',
          content: '# Heading\n\nSome content.',
        },
      },
      frozenNow,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('https://example.com/article');
      expect(result.data.title).toBe('Test Article');
      expect(result.data.description).toBe('A test article description');
      expect(result.data.content).toBe('# Heading\n\nSome content.');
      // CAP-04: create_at is ISO-8601 timestamp from SW, not from page
      expect(result.data.create_at).toBe(frozenNow);
      expect(result.data.create_at).toMatch(ISO_8601_RE);
    }
  });

  it('returns Ok when title is empty but content is present', async () => {
    const result = await capturePipelineCore({
      tabUrl: 'https://example.com',
      tabId: 1,
      executeScriptResult: { title: '', description: '', content: 'Some content' },
    });
    expect(result.ok).toBe(true);
  });

  it('create_at matches ISO-8601 format for real Date.now() (CAP-04)', async () => {
    const result = await capturePipelineCore({
      tabUrl: 'https://example.com',
      tabId: 1,
      executeScriptResult: { title: 'T', description: '', content: 'C' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.create_at).toMatch(ISO_8601_RE);
    }
  });
});
