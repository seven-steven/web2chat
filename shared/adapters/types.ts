/**
 * Cross-phase IM adapter contract (D-23..D-26).
 *
 * Adapters live in entrypoints/<platform>.content.ts and self-register a
 * one-shot chrome.runtime.onMessage listener for `type === 'ADAPTER_DISPATCH'`.
 * AdapterRegistryEntry descriptors (shared/adapters/registry.ts) drive both:
 *   (a) popup platformDetector — match(url) → icon display + Confirm enable (D-24)
 *   (b) SW dispatch-pipeline — find adapter, then chrome.scripting.executeScript({ files:[scriptFile] }) (D-26)
 *
 * Phase 3 ships PlatformId='mock' only. Phase 4 appends 'openclaw'; Phase 5 appends 'discord'.
 */
import type { Result, ErrorCode } from '@/shared/messaging';

export type PlatformId = 'mock' | 'openclaw' | 'discord';

/** Run-time adapter contract — implemented by content scripts. */
export interface IMAdapter {
  readonly id: PlatformId;
  match(url: string): boolean;
  waitForReady?(timeoutMs?: number): Promise<Result<void, 'TIMEOUT'>>;
  compose(message: string): Promise<Result<void, 'INPUT_NOT_FOUND'>>;
  send(): Promise<Result<void, 'NOT_LOGGED_IN' | 'INPUT_NOT_FOUND' | 'RATE_LIMITED'>>;
  canDispatch?(): Promise<Result<void, ErrorCode>>;
}

/** Static descriptor stored in shared/adapters/registry.ts (no chrome.* dependency). */
export interface AdapterRegistryEntry {
  readonly id: PlatformId;
  /** Pure URL matcher — popup + SW both invoke. No chrome.* allowed. */
  match(url: string): boolean;
  /** Path of the WXT-built adapter bundle, passed to chrome.scripting.executeScript({ files: [...] }). */
  readonly scriptFile: string;
  /** host_permissions glob list — used by scripts/verify-manifest.ts to cross-check. */
  readonly hostMatches: readonly string[];
  /** i18n key for the platform's tooltip alt text (e.g. `platform_icon_mock`). */
  readonly iconKey: string;
}
