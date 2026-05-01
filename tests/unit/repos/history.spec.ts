import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  score,
  addSendTo,
  addPrompt,
  topNSendTo,
  topNPrompt,
  removeSendTo,
  resetAllHistory,
  HISTORY_CAP,
  HISTORY_TOP_N,
} from '@/shared/storage/repos/history';
import { sendToHistoryItem, promptHistoryItem } from '@/shared/storage/items';

describe('repos/history — score formula (D-29)', () => {
  it('exp(-Δt/τ) + 0.3·log(count+1) — recent + frequent ranks above old + rare', () => {
    const nowMs = Date.parse('2026-04-30T12:00:00.000Z');
    const recent = {
      value: 'r',
      last_used_at: new Date(nowMs - 1_000).toISOString(),
      use_count: 1,
    };
    const old = {
      value: 'o',
      last_used_at: new Date(nowMs - 30 * 24 * 3600 * 1000).toISOString(),
      use_count: 1,
    };
    const frequent = {
      value: 'f',
      last_used_at: new Date(nowMs - 24 * 3600 * 1000).toISOString(),
      use_count: 50,
    };
    expect(score(recent, nowMs)).toBeGreaterThan(score(old, nowMs));
    expect(score(frequent, nowMs)).toBeGreaterThan(score(old, nowMs));
  });

  it('HISTORY_CAP = 50 and HISTORY_TOP_N = 8', () => {
    expect(HISTORY_CAP).toBe(50);
    expect(HISTORY_TOP_N).toBe(8);
  });
});

describe('repos/history — sendTo CRUD (DSP-02)', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    await sendToHistoryItem.setValue([]);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('addSendTo on empty list creates entry use_count=1', async () => {
    await addSendTo('https://x.com/');
    const all = await sendToHistoryItem.getValue();
    expect(all).toHaveLength(1);
    expect(all[0]?.use_count).toBe(1);
    expect(all[0]?.value).toBe('https://x.com/');
  });

  it('addSendTo on existing value dedupes and bumps use_count', async () => {
    await addSendTo('https://x.com/');
    await addSendTo('https://x.com/');
    await addSendTo('https://x.com/');
    const all = await sendToHistoryItem.getValue();
    expect(all).toHaveLength(1);
    expect(all[0]?.use_count).toBe(3);
  });

  it('addSendTo past CAP=50 truncates to 50', async () => {
    for (let i = 0; i < 55; i++) {
      await addSendTo(`https://example.com/${i}`);
    }
    const all = await sendToHistoryItem.getValue();
    expect(all.length).toBeLessThanOrEqual(50);
  });

  it('topNSendTo returns at most 8 ordered by score desc', async () => {
    for (let i = 0; i < 12; i++) {
      await addSendTo(`https://example.com/${i}`);
    }
    const top = await topNSendTo();
    expect(top.length).toBeLessThanOrEqual(8);
    for (let i = 0; i < top.length - 1; i++) {
      const nowMs = Date.now();
      expect(score(top[i]!, nowMs)).toBeGreaterThanOrEqual(score(top[i + 1]!, nowMs));
    }
  });

  it('removeSendTo deletes only the matching value', async () => {
    await addSendTo('https://a.com/');
    await addSendTo('https://b.com/');
    const remaining = await removeSendTo('https://a.com/');
    expect(remaining).toBe(1);
    const all = await sendToHistoryItem.getValue();
    expect(all.find((e) => e.value === 'https://b.com/')).toBeDefined();
    expect(all.find((e) => e.value === 'https://a.com/')).toBeUndefined();
  });

  it('addSendTo("") is a no-op (defensive)', async () => {
    await addSendTo('');
    const all = await sendToHistoryItem.getValue();
    expect(all).toHaveLength(0);
  });
});

describe('repos/history — prompt mirror (DSP-03)', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    await promptHistoryItem.setValue([]);
  });

  it('addPrompt + topNPrompt + removePrompt mirror the sendTo behaviors', async () => {
    await addPrompt('first prompt');
    await addPrompt('first prompt');
    await addPrompt('second prompt');
    const top = await topNPrompt();
    expect(top.length).toBe(2);
    const first = top.find((e) => e.value === 'first prompt');
    expect(first?.use_count).toBe(2);
  });
});

describe('repos/history — resetAllHistory (STG-03)', () => {
  beforeEach(async () => {
    fakeBrowser.reset();
    await sendToHistoryItem.setValue([]);
    await promptHistoryItem.setValue([]);
  });

  it('clears both sendTo and prompt lists', async () => {
    await addSendTo('https://x.com/');
    await addPrompt('p');
    await resetAllHistory();
    expect(await sendToHistoryItem.getValue()).toEqual([]);
    expect(await promptHistoryItem.getValue()).toEqual([]);
  });
});
