import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { ArticleSnapshot, DispatchStartInput } from '@/shared/messaging';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  clearActive: vi.fn(),
}));

vi.mock('@/shared/i18n', () => ({
  t: (key: string, ..._args: unknown[]) => key,
}));

vi.mock('@/shared/messaging', () => ({
  sendMessage: mocks.sendMessage,
}));

vi.mock('@/shared/storage/repos/popupDraft', () => ({
  update: vi.fn().mockResolvedValue(undefined),
  savePendingDispatch: vi.fn().mockResolvedValue(undefined),
  clearPendingDispatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/storage/repos/grantedOrigins', () => ({
  add: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/storage/repos/dispatch', () => ({
  clearActive: mocks.clearActive,
}));

const flush = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0)).then(
    () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
  );

const snapshot: ArticleSnapshot = {
  title: 'Original title',
  url: 'https://example.com/article',
  description: 'Original description',
  create_at: '2026-05-10T00:00:00Z',
  content: 'Original content',
};

describe('popup retriable retry UI', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mocks.sendMessage.mockImplementation((route: string) => {
      if (route === 'history.list') return Promise.resolve({ ok: true, data: { entries: [] } });
      if (route === 'binding.get') return Promise.resolve({ ok: true, data: { entry: null } });
      if (route === 'dispatch.start') {
        return Promise.resolve({
          ok: true,
          data: { dispatchId: 'new-dispatch-id', state: 'pending' },
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    });
    mocks.clearActive.mockResolvedValue(undefined);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      'new-dispatch-id' as ReturnType<Crypto['randomUUID']>,
    );
    Object.defineProperty(window, 'close', { value: vi.fn(), configurable: true });
    Object.defineProperty(globalThis, 'chrome', {
      value: {
        permissions: {
          contains: vi.fn().mockResolvedValue(true),
          request: vi.fn().mockResolvedValue(true),
        },
      },
      configurable: true,
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('ErrorBanner renders retry button when retriable is true and onRetry exists', async () => {
    const { ErrorBanner } = await import('@/entrypoints/popup/components/ErrorBanner');

    await act(async () => {
      render(
        <ErrorBanner code="TIMEOUT" retriable={true} onRetry={vi.fn()} onDismiss={vi.fn()} />,
        container,
      );
    });

    expect(container.querySelector('[data-testid="error-banner-TIMEOUT-retry"]')).toBeTruthy();
  });

  it('ErrorBanner hides retry button when retriable is false even for TIMEOUT', async () => {
    const { ErrorBanner } = await import('@/entrypoints/popup/components/ErrorBanner');

    await act(async () => {
      render(
        <ErrorBanner code="TIMEOUT" retriable={false} onRetry={vi.fn()} onDismiss={vi.fn()} />,
        container,
      );
    });

    expect(container.textContent).toContain('error_code_TIMEOUT_body');
    expect(container.querySelector('[data-testid="error-banner-TIMEOUT-retry"]')).toBeFalsy();
  });

  it('Retry clears old error and active pointer, then starts a fresh dispatch with current edited form values', async () => {
    const { SendForm } = await import('@/entrypoints/popup/components/SendForm');
    const onDismissError = vi.fn();
    const onConfirm = vi.fn();
    let resolveDispatch!: (value: {
      ok: true;
      data: { dispatchId: string; state: 'pending' };
    }) => void;
    mocks.sendMessage.mockImplementation((route: string, input?: DispatchStartInput) => {
      if (route === 'history.list') return Promise.resolve({ ok: true, data: { entries: [] } });
      if (route === 'binding.get') return Promise.resolve({ ok: true, data: { entry: null } });
      if (route === 'dispatch.start') {
        expect(input?.dispatchId).toBe('new-dispatch-id');
        return new Promise((resolve) => {
          resolveDispatch = resolve;
        });
      }
      return Promise.resolve({ ok: true, data: {} });
    });

    await act(async () => {
      render(
        <SendForm
          snapshot={snapshot}
          titleValue="Edited title"
          onTitleChange={vi.fn()}
          descriptionValue="Edited description"
          onDescriptionChange={vi.fn()}
          contentValue="Edited content"
          onContentChange={vi.fn()}
          sendTo="https://discord.com/channels/123/456"
          onSendToChange={vi.fn()}
          prompt="Edited prompt"
          onPromptChange={vi.fn()}
          promptDirty={true}
          onPromptDirtyChange={vi.fn()}
          dispatchError={{ code: 'TIMEOUT', message: 'old timeout', retriable: true }}
          onDismissError={onDismissError}
          onConfirm={onConfirm}
          onDispatchError={vi.fn()}
        />,
        container,
      );
    });
    await flush();

    const retry = container.querySelector(
      '[data-testid="error-banner-TIMEOUT-retry"]',
    ) as HTMLButtonElement;
    expect(retry).toBeTruthy();

    await act(async () => {
      retry.click();
    });

    expect(onDismissError).toHaveBeenCalledTimes(1);
    expect(mocks.clearActive).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('new-dispatch-id');

    const dispatchCall = mocks.sendMessage.mock.calls.find(([route]) => route === 'dispatch.start');
    expect(dispatchCall).toBeTruthy();
    expect(dispatchCall?.[1]).toMatchObject({
      dispatchId: 'new-dispatch-id',
      send_to: 'https://discord.com/channels/123/456',
      prompt: 'Edited prompt',
      snapshot: {
        title: 'Edited title',
        description: 'Edited description',
        content: 'Edited content',
        url: 'https://example.com/article',
      },
    });

    await act(async () => {
      resolveDispatch({ ok: true, data: { dispatchId: 'new-dispatch-id', state: 'pending' } });
    });
  });
});
