/**
 * SW-local MAIN world injector registry (D-100).
 *
 * Manual map pattern — each platform with a MAIN world injector is listed
 * explicitly here with a direct import. This module is only imported by
 * background.ts (SW); popup never touches it, keeping injector code out of
 * the popup bundle.
 *
 * Adding a new MAIN world platform:
 *   1. Create injector function in background/injectors/<platform>-main-world.ts
 *   2. Import it here and add to the map
 *   3. No changes needed to shared/adapters/registry.ts or background.ts
 */
import { discordMainWorldPaste } from '@/background/injectors/discord-main-world';

export const mainWorldInjectors = new Map<string, (text: string) => Promise<boolean>>([
  ['discord', discordMainWorldPaste],
]);
