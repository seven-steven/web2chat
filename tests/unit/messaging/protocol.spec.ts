import { describe, it, expect } from 'vitest';
import { schemas, Ok, Err, type Result, type ErrorCode } from '@/shared/messaging';

describe('messaging/protocol', () => {
  it('exposes meta.bumpHello input and output schemas', () => {
    expect(schemas['meta.bumpHello'].input.safeParse(undefined).success).toBe(true);
    expect(schemas['meta.bumpHello'].input.safeParse('hi').success).toBe(false);
  });

  it('output schema enforces schemaVersion=1 and non-negative integer helloCount', () => {
    const out = schemas['meta.bumpHello'].output;
    expect(out.safeParse({ schemaVersion: 1, helloCount: 0 }).success).toBe(true);
    expect(out.safeParse({ schemaVersion: 1, helloCount: 7 }).success).toBe(true);
    expect(out.safeParse({ schemaVersion: 2, helloCount: 1 }).success).toBe(false);
    expect(out.safeParse({ schemaVersion: 1, helloCount: -1 }).success).toBe(false);
    expect(out.safeParse({ schemaVersion: 1, helloCount: 1.5 }).success).toBe(false);
  });
});

describe('messaging/result', () => {
  it('Ok produces a success Result', () => {
    const r: Result<number> = Ok(42);
    expect(r).toEqual({ ok: true, data: 42 });
  });

  it('Err produces a failure Result with retriable defaulting to false', () => {
    const r: Result<number> = Err('INTERNAL' as ErrorCode, 'boom');
    expect(r).toEqual({ ok: false, code: 'INTERNAL', message: 'boom', retriable: false });
  });

  it('Err honours explicit retriable flag', () => {
    const r = Err('INTERNAL' as ErrorCode, 'try again', true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retriable).toBe(true);
  });
});
