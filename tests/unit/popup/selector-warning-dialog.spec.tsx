import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

vi.mock('@/shared/i18n', () => ({
  t: (key: string, ..._args: unknown[]) => key,
}));

const flush = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0)).then(
    () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
  );

async function loadDialog() {
  const modulePath = '@/entrypoints/popup/components/' + 'SelectorWarningDialog';
  return import(modulePath) as Promise<{
    SelectorWarningDialog: (props: {
      onCancel: () => void;
      onConfirm: () => void;
    }) => preact.ComponentChild;
  }>;
}

describe('SelectorWarningDialog', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders the low-confidence warning as an accessible modal dialog', async () => {
    const { SelectorWarningDialog } = await loadDialog();

    await act(async () => {
      render(<SelectorWarningDialog onCancel={vi.fn()} onConfirm={vi.fn()} />, container);
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('selector-warning-dialog-title');
    expect(dialog?.getAttribute('aria-describedby')).toBe('selector-warning-dialog-body');
    expect(container.textContent).toContain('selector_low_confidence_heading');
    expect(container.textContent).toContain('selector_low_confidence_body');
    expect(container.querySelector('[data-testid^="error-banner-"]')).toBeFalsy();
  });

  it('does not render the warning dialog while the in-progress view is mounted', async () => {
    const { InProgressView } = await import('@/entrypoints/popup/components/InProgressView');

    await act(async () => {
      render(<InProgressView dispatchId="dispatch-in-flight" onCancel={vi.fn()} />, container);
    });

    expect(container.querySelector('[data-testid="dispatch-in-progress"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="selector-warning-dialog"]')).toBeFalsy();
  });

  it('cancels when Escape is pressed', async () => {
    const { SelectorWarningDialog } = await loadDialog();
    const onCancel = vi.fn();

    await act(async () => {
      render(<SelectorWarningDialog onCancel={onCancel} onConfirm={vi.fn()} />, container);
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flush();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels when the overlay is clicked', async () => {
    const { SelectorWarningDialog } = await loadDialog();
    const onCancel = vi.fn();

    await act(async () => {
      render(<SelectorWarningDialog onCancel={onCancel} onConfirm={vi.fn()} />, container);
    });

    const overlay = container.querySelector(
      '[data-testid="selector-warning-dialog-overlay"]',
    ) as HTMLElement;
    overlay.click();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirms when the primary action is clicked', async () => {
    const { SelectorWarningDialog } = await loadDialog();
    const onConfirm = vi.fn();

    await act(async () => {
      render(<SelectorWarningDialog onCancel={vi.fn()} onConfirm={onConfirm} />, container);
    });

    const confirm = container.querySelector(
      '[data-testid="selector-warning-dialog-confirm"]',
    ) as HTMLButtonElement;
    confirm.click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
