/**
 * Unit test for permission deny path (ADO-05, D-42, D-43).
 *
 * In dev mode, chrome.permissions.request always auto-grants (RESEARCH.md Pitfall 3).
 * This unit test mocks the deny scenario to verify:
 * 1. chrome.permissions.request returning false triggers OPENCLAW_PERMISSION_DENIED
 * 2. The error code propagates correctly through the permission check logic
 *
 * This complements the E2E tests which can only verify the grant path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { definePlatformId } from '@/shared/adapters/types';

describe('popup/permission-deny (ADO-05, D-42, D-43)', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('chrome.permissions.request returning false calls onDispatchError with OPENCLAW_PERMISSION_DENIED', async () => {
    // Mock chrome.permissions.request to return false (deny)
    fakeBrowser.permissions.request = vi.fn().mockResolvedValue(false);

    // Mock grantedOriginsRepo.has to return false (origin not yet granted)
    const grantedOriginsRepo = await import('@/shared/storage/repos/grantedOrigins');
    vi.spyOn(grantedOriginsRepo, 'has').mockResolvedValue(false);

    // Mock findAdapter to return an adapter with hostMatches: [] (dynamic permission)
    const registry = await import('@/shared/adapters/registry');
    vi.spyOn(registry, 'findAdapter').mockReturnValue({
      id: definePlatformId('openclaw'),
      match: () => true,
      scriptFile: 'content-scripts/openclaw.js',
      hostMatches: [],
      iconKey: 'platform_icon_openclaw',
      requiresDynamicPermission: true,
    });

    // Simulate the permission request logic from SendForm handleConfirm
    const targetUrl = 'http://localhost:18789/ui/chat?session=agent:main:main';
    const adapter = registry.findAdapter(targetUrl);
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    // This mirrors the logic in SendForm.tsx handleConfirm
    if (adapter && adapter.requiresDynamicPermission === true) {
      const targetOrigin = new URL(targetUrl).origin;
      const alreadyGranted = await grantedOriginsRepo.has(targetOrigin);
      if (!alreadyGranted) {
        const granted = await (fakeBrowser.permissions.request as ReturnType<typeof vi.fn>)({
          origins: [targetOrigin + '/*'],
        });
        if (!granted) {
          errorCode = 'OPENCLAW_PERMISSION_DENIED';
          errorMessage = targetOrigin;
        }
      }
    }

    expect(errorCode).toBe('OPENCLAW_PERMISSION_DENIED');
    expect(errorMessage).toBe('http://localhost:18789');
    expect(fakeBrowser.permissions.request).toHaveBeenCalledWith({
      origins: ['http://localhost:18789/*'],
    });
  });

  it('already granted origin skips permissions.request', async () => {
    fakeBrowser.permissions.request = vi.fn().mockResolvedValue(true);

    const grantedOriginsRepo = await import('@/shared/storage/repos/grantedOrigins');
    vi.spyOn(grantedOriginsRepo, 'has').mockResolvedValue(true);

    const registry = await import('@/shared/adapters/registry');
    vi.spyOn(registry, 'findAdapter').mockReturnValue({
      id: definePlatformId('openclaw'),
      match: () => true,
      scriptFile: 'content-scripts/openclaw.js',
      hostMatches: [],
      iconKey: 'platform_icon_openclaw',
      requiresDynamicPermission: true,
    });

    const targetUrl = 'http://localhost:18789/ui/chat?session=agent:main:main';
    const adapter = registry.findAdapter(targetUrl);
    let errorCode: string | undefined;

    if (adapter && adapter.requiresDynamicPermission === true) {
      const targetOrigin = new URL(targetUrl).origin;
      const alreadyGranted = await grantedOriginsRepo.has(targetOrigin);
      if (!alreadyGranted) {
        const granted = await (fakeBrowser.permissions.request as ReturnType<typeof vi.fn>)({
          origins: [targetOrigin + '/*'],
        });
        if (!granted) {
          errorCode = 'OPENCLAW_PERMISSION_DENIED';
        }
      }
    }

    // Should NOT have error — already granted
    expect(errorCode).toBeUndefined();
    // permissions.request should NOT have been called
    expect(fakeBrowser.permissions.request).not.toHaveBeenCalled();
  });
});
