import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'preact';

vi.mock('@/shared/i18n', () => ({
  t: (key: string, ..._args: unknown[]) => key,
}));

describe('Select', () => {
  let container: HTMLDivElement;

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
    await new Promise((r) => setTimeout(r, 0));
    return { onChange, options };
  }

  it('mousedown on option calls onChange and closes dropdown', async () => {
    const { onChange } = await renderSelect();

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
    button.click();
    await new Promise((r) => setTimeout(r, 0));

    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();

    const options = container.querySelectorAll('[role="option"]');
    const englishOption = options[1]!;
    englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(onChange).toHaveBeenCalledWith('en');
    expect(container.querySelector('[role="listbox"]')).toBeFalsy();
  });

  it('clicking button toggles dropdown open then closed', async () => {
    await renderSelect();

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;

    button.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();

    button.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[role="listbox"]')).toBeFalsy();
  });

  it('click outside closes the dropdown', async () => {
    await renderSelect();

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
    button.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();

    // Yield one more tick so the useEffect-registered mousedown listener is attached
    await new Promise((r) => setTimeout(r, 0));

    // Dispatch mousedown on the container element (not on button or listbox)
    // This should bubble up to document and trigger the outside-click handler
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);
    outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(container.querySelector('[role="listbox"]')).toBeFalsy();
    outsideEl.remove();
  });

  it('mousedown on option does not reopen dropdown via residual click event', async () => {
    const onChange = vi.fn();
    await renderSelect({ onChange });

    const button = container.querySelector('[data-testid="test-select"]') as HTMLButtonElement;
    button.click();
    await new Promise((r) => setTimeout(r, 0));

    // Get option and its position info before it's removed
    const options = container.querySelectorAll('[role="option"]');
    const englishOption = options[1]!;

    // mousedown on option triggers commit() -> closes dropdown
    englishOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 0));

    // Dropdown should be closed now
    expect(container.querySelector('[role="listbox"]')).toBeFalsy();

    // Simulate a click event reaching the button (which would toggle dropdown)
    // This simulates what happens in real browser when mousedown causes DOM removal
    // and the click event retargets to whatever is now under the cursor
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    // After click on button, dropdown should be open again (button toggles)
    // But onChange should only have been called once (from the mousedown)
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
