/**
 * Cross-phase IM adapter contract (D-23..D-26, D-96..D-97).
 *
 * Adapters live in entrypoints/<platform>.content.ts and self-register a
 * one-shot chrome.runtime.onMessage listener for `type === 'ADAPTER_DISPATCH'`.
 * AdapterRegistryEntry descriptors (shared/adapters/registry.ts) drive both:
 *   (a) popup platformDetector — match(url) → icon display + Confirm enable (D-24)
 *   (b) SW dispatch-pipeline — find adapter, then chrome.scripting.executeScript({ files:[scriptFile] }) (D-26)
 *
 * Phase 8: PlatformId is a branded string type (D-96). Construction only through
 * definePlatformId() / defineAdapter() (D-97).
 */
import type { Result, ErrorCode } from '@/shared/messaging';

// ── Branded PlatformId (D-96) ──────────────────────────────────────────────

declare const __platformIdBrand: unique symbol;

/**
 * Branded platform identifier. Extends string at runtime but prevents
 * raw string assignment at compile time. Create via definePlatformId().
 */
export type PlatformId = string & { readonly [__platformIdBrand]: never };

/** Create a branded PlatformId value. Called inside defineAdapter(). */
export function definePlatformId(raw: string): PlatformId {
  return raw as PlatformId;
}

// ── Adapter contracts ──────────────────────────────────────────────────────

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

  // Phase 8 additions:

  /** MAIN world injector function. If present, SW routes port messages to this. */
  readonly mainWorldInjector?: (text: string) => Promise<boolean>;
  /** Exact hostnames that trigger SPA history listener. Empty/absent = no SPA handling. Per D-104. */
  readonly spaNavigationHosts?: readonly string[];
  /** Platform-specific error codes declared by this adapter. Per D-110. */
  readonly errorCodes?: readonly string[];
}

// ── defineAdapter helper (D-97) ────────────────────────────────────────────

/**
 * Construct an AdapterRegistryEntry with a branded PlatformId.
 * All registry entries MUST use this helper — raw `as PlatformId` casts are prohibited.
 */
export function defineAdapter(
  entry: Omit<AdapterRegistryEntry, 'id'> & { id: string },
): AdapterRegistryEntry {
  return { ...entry, id: definePlatformId(entry.id) };
}
