import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

vi.mock('@/shared/i18n', () => ({
  t: (key: string, ..._args: unknown[]) => key,
}));

describe('Select', () => {
  let container: HTMLDivElement;

  /** Drain the microtask/macrotask queue — Preact useEffect registration
   *  may need 2 ticks to complete after a state change that triggers a render. */
  const flush = () =>
    new Promise<void>((r) => setTimeout(r, 0)).then(
      () => new Promise<void>((r) => setTimeout(r, 0)),
    );

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function renderSelect(
    props?: Partial<{
      id: string;
      value: string;
      onChange: (v: string) => void;
      options: Array<{ value: string; label: string }>;
      ariaLabel: string;
      testId: string;
    }>,
  ) {
    const { Select } = await import('@/entrypoints/options/components/Select');
    const onChange = props?.onChange ?? vi.fn();
    const options = props?.options ?? [
      { value: '', label: 'Auto' },
      { value: 'en', label: 'English' },
      { value: 'zh_CN', label: 'Chinese' },
    ];
    await act(async () => {
      render(
        <Select
          id={props?.id ?? 'test-select'}
          value={props?.value ?? ''}
          onChange={onChange}
          options={options}
          ariaLabel={props?.ariaLabel ?? 'Test select'}
          testId={props?.testId ?? 'test-select'}
        />,
        container,
      );
    });
    await flush();
    return { onChange, options };
  }

  it('mousedown on option calls onChange and closes dropdown', async () => {
    const { onChange } = await renderSelect();

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
    button.click();
    await flush();

    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();

    const options = container.querySelectorAll('[role="option"]');
    const englishOption = options[1]!;
    englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await flush();

    expect(onChange).toHaveBeenCalledWith('en');
    expect(container.querySelector('[role="listbox"]')).toBeFalsy();
  });

  it('clicking button toggles dropdown open then closed', async () => {
    await renderSelect();

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;

    button.click();
    await flush();
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();

    button.click();
    await flush();
    expect(container.querySelector('[role="listbox"]')).toBeFalsy();
  });

  it('click outside closes the dropdown', async () => {
    await renderSelect();

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });
    await flush();
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();

    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    await act(async () => {
      outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    });
    await flush();

    expect(container.querySelector('[role="listbox"]')).toBeFalsy();
    outsideEl.remove();
  });

  it('mousedown on option does not reopen dropdown via residual click event', async () => {
    const onChange = vi.fn();
    await renderSelect({ onChange });

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
    button.click();
    await flush();

    const options = container.querySelectorAll('[role="option"]');
    const englishOption = options[1]!;

    englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await flush();

    expect(container.querySelector('[role="listbox"]')).toBeFalsy();

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    // After click on button, dropdown should be open again (button toggles)
    // But onChange should only have been called once (from the mousedown)
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
