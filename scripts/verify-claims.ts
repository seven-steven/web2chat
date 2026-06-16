// STUB — Task 1 (RED) of plan 16-01.
// The real implementation lands in Task 2 (GREEN). This stub exists ONLY so
// the project's `pnpm typecheck` pre-commit hook passes while the TDD RED
// test in tests/unit/scripts/verify-claims.spec.ts fails on assertion
// behavior (not on import resolution). assertClaims deliberately throws to
// keep the suite RED; Task 2 replaces this body with the five assertion
// rules (a)-(e).

export type ClaimsInputs = {
  manifest: { permissions?: string[]; host_permissions?: string[] };
  locales: { en: Record<string, string>; zh_CN: Record<string, string> };
};

/**
 * Placeholder assertion function — ALWAYS throws until Task 2 implements
 * the (a)-(e) rules. Tests in verify-claims.spec.ts therefore stay RED
 * (the throw fails every `it(...)`, including Test 1 "valid inputs produce
 * no errors") while typecheck stays green.
 */
export function assertClaims(_input: ClaimsInputs, _errors: string[]): void {
  throw new Error(
    'assertClaims not implemented — Task 2 (GREEN) of plan 16-01 must replace this stub.',
  );
}
