import { describe, it, expect } from 'vitest';
import { schemas } from '@/shared/messaging';

describe('messaging/routes/dispatch — schemas', () => {
  const goodSnapshot = {
    title: 't',
    url: 'https://example.com/',
    description: 'd',
    create_at: '2026-04-30T00:00:00.000Z',
    content: 'c',
  };

  it('dispatch.start input requires UUID dispatchId + URL send_to + snapshot', () => {
    const good = {
      dispatchId: '00000000-0000-4000-8000-000000000000',
      send_to: 'https://discord.com/channels/1/2',
      prompt: 'hi',
      snapshot: goodSnapshot,
    };
    expect(schemas['dispatch.start'].input.safeParse(good).success).toBe(true);
    expect(
      schemas['dispatch.start'].input.safeParse({ ...good, dispatchId: 'not-a-uuid' }).success,
    ).toBe(false);
    expect(
      schemas['dispatch.start'].input.safeParse({ ...good, send_to: 'not a url' }).success,
    ).toBe(false);
  });

  it('dispatch.start output enforces state enum', () => {
    const out = schemas['dispatch.start'].output;
    expect(
      out.safeParse({ dispatchId: '00000000-0000-4000-8000-000000000000', state: 'pending' })
        .success,
    ).toBe(true);
    expect(
      out.safeParse({ dispatchId: '00000000-0000-4000-8000-000000000000', state: 'unknown' })
        .success,
    ).toBe(false);
  });

  it('dispatch.cancel input requires UUID', () => {
    expect(
      schemas['dispatch.cancel'].input.safeParse({
        dispatchId: '00000000-0000-4000-8000-000000000000',
      }).success,
    ).toBe(true);
    expect(schemas['dispatch.cancel'].input.safeParse({ dispatchId: 'x' }).success).toBe(false);
  });
});

describe('messaging/routes/history — schemas', () => {
  it('history.list accepts kind + optional limit', () => {
    expect(schemas['history.list'].input.safeParse({ kind: 'sendTo' }).success).toBe(true);
    expect(schemas['history.list'].input.safeParse({ kind: 'prompt', limit: 8 }).success).toBe(
      true,
    );
    expect(schemas['history.list'].input.safeParse({ kind: 'invalid' }).success).toBe(false);
  });

  it('history.delete supports single value or resetAll flag', () => {
    expect(
      schemas['history.delete'].input.safeParse({ kind: 'sendTo', value: 'https://x.com/' })
        .success,
    ).toBe(true);
    expect(
      schemas['history.delete'].input.safeParse({ kind: 'sendTo', resetAll: true }).success,
    ).toBe(true);
  });
});

describe('messaging/routes/binding — schemas', () => {
  it('binding.upsert accepts URL send_to + prompt + optional flags', () => {
    const good = { send_to: 'https://discord.com/channels/1/2', prompt: 'p' };
    expect(schemas['binding.upsert'].input.safeParse(good).success).toBe(true);
    expect(
      schemas['binding.upsert'].input.safeParse({ ...good, mark_dispatched: true }).success,
    ).toBe(true);
    expect(
      schemas['binding.upsert'].input.safeParse({ ...good, send_to: 'not a url' }).success,
    ).toBe(false);
  });

  it('binding.get returns nullable entry on output', () => {
    const out = schemas['binding.get'].output;
    expect(out.safeParse({ entry: null }).success).toBe(true);
    expect(
      out.safeParse({
        entry: {
          send_to: 'https://x.com/',
          prompt: 'p',
          last_dispatched_at: 'never-dispatched-marker',
        },
      }).success,
    ).toBe(true);
  });
});
