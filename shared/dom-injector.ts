/**
 * Generic React-controlled-input injection helper (D-48, CLAUDE.md convention).
 * Uses the native property-descriptor setter to bypass React's synthetic event system,
 * then dispatches a bubbling 'input' event so React reconciles the new value.
 */
export function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) throw new Error('Cannot find native value setter');
  setter.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
