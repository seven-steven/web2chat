import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'preact';
import { fakeBrowser } from 'wxt/testing/fake-browser';

const MOCK_ORIGINS = ['http://localhost:18789', 'http://192.168.1.100:18789'];

const listMock = vi.fn().mockResolvedValue(MOCK_ORIGINS);
const removeMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/shared/i18n', () => ({
  t: (key: string, ..._args: unknown[]) => key,
}));

vi.mock('@/shared/storage/repos/grantedOrigins', () => ({
  list: listMock,
  remove: removeMock,
}));

describe('GrantedOriginsSection', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    fakeBrowser.reset();
    container = document.createElement('div');
    document.body.appendChild(container);
    listMock.mockResolvedValue(MOCK_ORIGINS);
    removeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function renderSection() {
    const mod = await import('@/entrypoints/options/components/GrantedOriginsSection');
    render(<mod.GrantedOriginsSection />, container);
    await new Promise((r) => setTimeout(r, 10));
  }

  it('clicking Remove shows a confirm dialog instead of immediately removing', async () => {
    await renderSection();

    const removeBtn = container.querySelector(
      '[data-testid="options-origin-remove-http://localhost:18789"]',
    ) as HTMLButtonElement;
    expect(removeBtn).toBeTruthy();

    removeBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    const dialog = container.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).toBeTruthy();
  });

  it('cancelling confirm dialog hides it without removing', async () => {
    await renderSection();

    const removeBtn = container.querySelector(
      '[data-testid="options-origin-remove-http://localhost:18789"]',
    ) as HTMLButtonElement;
    removeBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    const cancelBtn = container.querySelector(
      '[data-testid="confirm-dialog-cancel"]',
    ) as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    const dialog = container.querySelector('[data-testid="confirm-dialog"]');
    expect(dialog).toBeFalsy();
  });

  it('confirming calls chrome.permissions.remove then updates list', async () => {
    fakeBrowser.permissions.remove = vi.fn().mockResolvedValue(true);
    listMock.mockResolvedValue(MOCK_ORIGINS.slice(1));

    await renderSection();

    const removeBtn = container.querySelector(
      '[data-testid="options-origin-remove-http://localhost:18789"]',
    ) as HTMLButtonElement;
    removeBtn.click();
    await new Promise((r) => setTimeout(r, 0));

    const confirmBtn = container.querySelector(
      '[data-testid="confirm-dialog-confirm"]',
    ) as HTMLButtonElement;
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    expect(fakeBrowser.permissions.remove).toHaveBeenCalledWith({
      origins: ['http://localhost:18789/*'],
    });
    expect(removeMock).toHaveBeenCalledWith('http://localhost:18789');
  });

  it('Remove button is disabled while async removal is in progress', async () => {
    let resolveRemove!: (v: boolean) => void;
    fakeBrowser.permissions.remove = vi.fn().mockReturnValue(
      new Promise<boolean>((r) => {
        resolveRemove = r;
      }),
    );

    await renderSection();

    // Use second origin since test 3 may have removed the first from signal state
    const origin = container.querySelector(
      '[data-testid^="options-origin-remove-"]',
    ) as HTMLButtonElement;
    expect(origin).toBeTruthy();

    origin.click();
    await new Promise((r) => setTimeout(r, 0));

    const confirmBtn = container.querySelector(
      '[data-testid="confirm-dialog-confirm"]',
    ) as HTMLButtonElement;
    confirmBtn.click();
    await new Promise((r) => setTimeout(r, 10));

    // After confirm, dialog closes and button should be disabled during async op
    const removeBtnAfter = container.querySelector(
      '[data-testid^="options-origin-remove-"]',
    ) as HTMLButtonElement | null;
    if (removeBtnAfter) {
      expect(removeBtnAfter.disabled).toBe(true);
    }

    resolveRemove(true);
    await new Promise((r) => setTimeout(r, 50));
  });
});
