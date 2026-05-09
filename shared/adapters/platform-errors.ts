/**
 * Platform-specific error codes (D-110).
 *
 * Each platform declares its codes as `as const` arrays.
 * PlatformErrorCode is the union of all platform error code types.
 * ALL_PLATFORM_ERROR_CODES is the runtime array for isErrorCode() validation.
 *
 * Dependency direction: shared/messaging/result.ts imports FROM this file.
 * This file does NOT import from shared/messaging/ -- no circular dependency.
 *
 * Adding a new platform's error codes:
 *   1. Add `export const SLACK_ERROR_CODES = [...] as const;`
 *   2. Add `export type SlackErrorCode = (typeof SLACK_ERROR_CODES)[number];`
 *   3. Add `| SlackErrorCode` to PlatformErrorCode union
 *   4. Add `...SLACK_ERROR_CODES` to ALL_PLATFORM_ERROR_CODES
 */

// OpenClaw platform error codes (Phase 4, ADO-05)
export const OPENCLAW_ERROR_CODES = ['OPENCLAW_OFFLINE', 'OPENCLAW_PERMISSION_DENIED'] as const;
export type OpenclawErrorCode = (typeof OPENCLAW_ERROR_CODES)[number];

// Aggregate: union of all platform-specific error codes
export type PlatformErrorCode = OpenclawErrorCode;

// Runtime aggregate for isErrorCode() validation
export const ALL_PLATFORM_ERROR_CODES: readonly string[] = [...OPENCLAW_ERROR_CODES];
