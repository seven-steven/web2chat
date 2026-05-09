/**
 * SW-local MAIN world injector registry (D-100).
 *
 * Builds the injector map by iterating adapterRegistry entries that declare
 * a mainWorldInjector function. background.ts imports this module; popup does not.
 *
 * Adding a new MAIN world platform:
 *   1. Create injector function in background/injectors/<platform>-main-world.ts
 *   2. Import it in shared/adapters/registry.ts and set on the entry's mainWorldInjector
 *   3. This module auto-discovers it -- no editing needed here or in background.ts
 */
import { adapterRegistry } from '@/shared/adapters/registry';

export const mainWorldInjectors = new Map<string, (text: string) => Promise<boolean>>(
  adapterRegistry
    .filter(
      (e): e is typeof e & { mainWorldInjector: (text: string) => Promise<boolean> } =>
        typeof e.mainWorldInjector === 'function',
    )
    .map((e) => [e.id as string, e.mainWorldInjector]),
);
