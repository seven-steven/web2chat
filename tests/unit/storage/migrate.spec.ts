import { describe, it, expect } from 'vitest';
import { migrations, runMigrations, CURRENT_SCHEMA_VERSION } from '@/shared/storage/migrate';

describe('storage/migrate', () => {
  it('exposes a migration entry for the current schema version', () => {
    expect(migrations[CURRENT_SCHEMA_VERSION]).toBeTypeOf('function');
  });

  it('migrates from v0 (no value) to v1 default shape', () => {
    const result = runMigrations(undefined, 0) as {
      schemaVersion: number;
      helloCount: number;
    };
    expect(result).toEqual({ schemaVersion: 1, helloCount: 0 });
  });

  it('is a no-op when already at current version', () => {
    const already = { schemaVersion: 1, helloCount: 7 };
    const result = runMigrations(already, CURRENT_SCHEMA_VERSION);
    expect(result).toBe(already);
  });

  it('throws if a migration step is missing in the chain', () => {
    expect(() => runMigrations(undefined, -1)).toThrow();
  });
});
