export const CURRENT_SCHEMA_VERSION = 1 as const;

export const migrations: Record<number, (prev: unknown) => unknown> = {
  1: () => ({ schemaVersion: 1, helloCount: 0 }),
};

export function runMigrations(prev: unknown, fromVersion: number): unknown {
  let current = prev;
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) {
      throw new Error(`[storage/migrate] missing migration step for version ${v}`);
    }
    current = step(current);
  }
  return current;
}
