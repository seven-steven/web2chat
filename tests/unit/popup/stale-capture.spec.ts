/**
 * Unit test for popup stale-capture bug (popup-stale-capture).
 *
 * Bug: when popupDraft has title/description/content from a previous capture
 * (e.g. page A), opening the popup on a different page (page B) clobbers
 * the fresh capture with the stale draft data.
 *
 * Fix contract:
 *   - popupDraft now records `url` alongside title/description/content.
 *   - On popup mount, draft title/description/content overrides apply ONLY
 *     when draftRes.url === captureRes.url (same page → restore user edits).
 *   - When URLs differ, draft title/description/content is ignored — fresh
 *     capture is shown unchanged.
 *   - send_to / prompt are URL-independent and always restored from draft.
 *
 * The check below mirrors the App.tsx mount logic in isolation so we can
 * verify the URL-scoping rule without spinning up the full popup runtime.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import * as draftRepo from '@/shared/storage/repos/popupDraft';
import type { ArticleSnapshot } from '@/shared/messaging';

/** Subset of App.tsx mount logic — the merge rule between fresh capture and persisted draft. */
function mergeCaptureWithDraft(
  capture: ArticleSnapshot,
  draft: Awaited<ReturnType<typeof draftRepo.get>>,
): {
  title: string;
  description: string;
  content: string;
  send_to: string;
  prompt: string;
} {
  const out = {
    title: capture.title,
    description: capture.description,
    content: capture.content,
    send_to: '',
    prompt: '',
  };
  if (!draft) return out;
  // send_to / prompt are URL-independent restorations
  out.send_to = draft.send_to || '';
  out.prompt = draft.prompt || '';
  // capture-field restorations must be scoped to the same page (URL match)
  if (draft.url && draft.url === capture.url) {
    if (draft.title) out.title = draft.title;
    if (draft.description) out.description = draft.description;
    if (draft.content) out.content = draft.content;
  }
  return out;
}

const captureA: ArticleSnapshot = {
  title: 'Page A Title',
  url: 'https://example.com/a',
  description: 'Page A description',
  create_at: '2026-05-06T00:00:00.000Z',
  content: 'Page A content body',
};
const captureB: ArticleSnapshot = {
  title: 'Page B Title',
  url: 'https://example.com/b',
  description: 'Page B description',
  create_at: '2026-05-06T00:01:00.000Z',
  content: 'Page B content body',
};

describe('popup mount: capture/draft merge rule (popup-stale-capture)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('with no draft: fresh capture passes through unchanged', async () => {
    const draft = await draftRepo.get();
    const merged = mergeCaptureWithDraft(captureA, draft);
    expect(merged.title).toBe(captureA.title);
    expect(merged.description).toBe(captureA.description);
    expect(merged.content).toBe(captureA.content);
    expect(merged.send_to).toBe('');
    expect(merged.prompt).toBe('');
  });

  it('same URL + draft has edited title: edited title shown (DSP-09)', async () => {
    await draftRepo.update({
      url: captureA.url,
      title: 'Edited Title for A',
      description: '',
      content: '',
      send_to: 'https://discord.com/channels/1/2',
      prompt: 'my prompt',
    });
    const draft = await draftRepo.get();
    const merged = mergeCaptureWithDraft(captureA, draft);
    expect(merged.title).toBe('Edited Title for A');
    // empty draft fields fall back to capture
    expect(merged.description).toBe(captureA.description);
    expect(merged.content).toBe(captureA.content);
    expect(merged.send_to).toBe('https://discord.com/channels/1/2');
    expect(merged.prompt).toBe('my prompt');
  });

  it('different URL: draft title/description/content MUST NOT clobber fresh capture (bug fix)', async () => {
    // Simulate: user previously captured page A, draft persisted A's snapshot.
    await draftRepo.update({
      url: captureA.url,
      title: captureA.title,
      description: captureA.description,
      content: captureA.content,
      send_to: 'https://discord.com/channels/1/2',
      prompt: 'last prompt',
    });
    const draft = await draftRepo.get();
    // Now user is on page B; fresh capture is captureB.
    const merged = mergeCaptureWithDraft(captureB, draft);
    expect(merged.title).toBe(captureB.title);
    expect(merged.description).toBe(captureB.description);
    expect(merged.content).toBe(captureB.content);
    // send_to / prompt still restored regardless of URL
    expect(merged.send_to).toBe('https://discord.com/channels/1/2');
    expect(merged.prompt).toBe('last prompt');
  });

  it('legacy draft without url (pre-fix shape): draft capture fields are ignored', async () => {
    // Forward-compatibility: pre-fix drafts were written without `url`.
    // Such drafts must NOT override capture fields under any URL.
    await draftRepo.update({
      title: 'Stale title without url',
      description: 'Stale description',
      content: 'Stale content',
      send_to: 'https://x.com/',
      prompt: 'p',
    });
    const draft = await draftRepo.get();
    const merged = mergeCaptureWithDraft(captureA, draft);
    expect(merged.title).toBe(captureA.title);
    expect(merged.description).toBe(captureA.description);
    expect(merged.content).toBe(captureA.content);
    expect(merged.send_to).toBe('https://x.com/');
    expect(merged.prompt).toBe('p');
  });
});
