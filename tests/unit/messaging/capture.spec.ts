/**
 * Unit tests for the capture pipeline business core (CAP-01, CAP-04, D-15..D-17).
 *
 * Two layers:
 *   1. capturePipelineCore mirror — a hand-maintained replica of the pipeline
 *      branching logic with injectable dependencies. Cheap to extend, but does
 *      NOT exercise the real chrome.* call shape or the safeParse step.
 *   2. runCapturePipeline direct — the real pipeline imported from
 *      @/background/capture-pipeline, exercised against vi.stubGlobal('chrome', ...)
 *      to cover the safeParse-failure branch and pin the mirror to reality.
 *
 * Maintainer note (mirror 函数同步责任): Phase 3+ 修改真实 capture-pipeline 时
 *   （如新增步骤、调整 ErrorCode、改时序），必须同步更新此 mirror 函数；本测试
 *   是该流水线分支逻辑的红灯参考。
 *
 * Environment: happy-dom (project default) — no DOMPurify involved here.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { Ok, Err, type Result } from '@/shared/messaging';
import type { ArticleSnapshot } from '@/shared/messaging';
import type { ExtractorPartial } from '@/entrypoints/extractor.content';
import { runCapturePipeline } from '@/background/capture-pipeline';

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
  // An article with no body is not deliverable, regardless of whether title
  // is set — extractor.content.ts falls back to document.title unconditionally
  // so a non-empty title alone does not imply Readability found content.
  if (!partial.content) {
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

  it('returns EXTRACTION_EMPTY when content is empty but title is present (D-17)', async () => {
    // Regression for CR-02: extractor.content.ts falls back to document.title
    // unconditionally, so Readability failing to find a body must surface as
    // EXTRACTION_EMPTY even when <title> happens to be set.
    const result = await capturePipelineCore({
      tabUrl: 'https://example.com',
      tabId: 1,
      executeScriptResult: { title: 'Login Wall', description: '', content: '' },
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

// ─── Direct tests against runCapturePipeline (WR-04) ─────────────────────────
//
// The mirror above does not exercise step 7 (ArticleSnapshotSchema.safeParse)
// or the extractor-result schema. These tests stub chrome.* and import the real
// pipeline so we can pin the safeParse-failure branch and the malformed-
// extractor branch (WR-03) at the actual implementation.

interface ChromeStub {
  windows: { getLastFocused: ReturnType<typeof vi.fn> };
  tabs: { query: ReturnType<typeof vi.fn> };
  scripting: { executeScript: ReturnType<typeof vi.fn> };
}

function stubChrome(stub: ChromeStub): void {
  vi.stubGlobal('chrome', stub);
}

const okWindow = () => ({
  getLastFocused: vi.fn().mockResolvedValue({ id: 7 }),
});

describe('runCapturePipeline (direct, WR-04)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns Err(EXECUTE_SCRIPT_FAILED) when extractor returns malformed shape (WR-03)', async () => {
    stubChrome({
      windows: okWindow(),
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      },
      scripting: {
        // missing 'description' field — ExtractorPartialSchema rejects
        executeScript: vi.fn().mockResolvedValue([{ result: { title: 'X', content: 'Y' } }]),
      },
    });
    const result = await runCapturePipeline();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EXECUTE_SCRIPT_FAILED');
      expect(result.message).toMatch(/^Malformed extractor result:/);
      expect(result.retriable).toBe(true);
    }
  });

  it('returns Err(EXECUTE_SCRIPT_FAILED) when extractor returns no result', async () => {
    stubChrome({
      windows: okWindow(),
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([{}]),
      },
    });
    const result = await runCapturePipeline();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EXECUTE_SCRIPT_FAILED');
      expect(result.retriable).toBe(true);
    }
  });

  it('returns Err(INTERNAL, /^Invalid snapshot:/) when ArticleSnapshotSchema rejects assembled snapshot', async () => {
    // The extractor returns shape-valid fields, but step 7 safeParse rejects
    // the assembled snapshot because create_at is not a valid ISO datetime
    // (zod's z.string().datetime() requires the canonical RFC 3339 form).
    stubChrome({
      windows: okWindow(),
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      },
      scripting: {
        executeScript: vi
          .fn()
          .mockResolvedValue([{ result: { title: 'T', description: 'D', content: 'C' } }]),
      },
    });
    const isoSpy = vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('not-an-iso-string');
    try {
      const result = await runCapturePipeline();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('INTERNAL');
        expect(result.message).toMatch(/^Invalid snapshot:/);
        expect(result.retriable).toBe(false);
      }
    } finally {
      isoSpy.mockRestore();
    }
  });

  it('returns Err(EXECUTE_SCRIPT_FAILED) when chrome.scripting.executeScript rejects', async () => {
    stubChrome({
      windows: okWindow(),
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      },
      scripting: {
        executeScript: vi.fn().mockRejectedValue(new Error('cannot access page')),
      },
    });
    const result = await runCapturePipeline();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('EXECUTE_SCRIPT_FAILED');
      expect(result.retriable).toBe(true);
    }
  });

  it('returns Ok(snapshot) end-to-end with stubbed chrome.*', async () => {
    stubChrome({
      windows: okWindow(),
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://example.com/article' }]),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          {
            result: {
              title: 'Real Title',
              description: 'Real Description',
              content: '# Body\n\nText.',
            },
          },
        ]),
      },
    });
    const result = await runCapturePipeline();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toBe('https://example.com/article');
      expect(result.data.title).toBe('Real Title');
      expect(result.data.content).toBe('# Body\n\nText.');
    }
  });
});
