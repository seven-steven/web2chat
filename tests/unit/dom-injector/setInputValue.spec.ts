import { describe, it, expect } from 'vitest';
import { setInputValue } from '@/shared/dom-injector';

describe('dom-injector/setInputValue (ADO-03)', () => {
  it('sets textarea value via property descriptor and fires input event', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    let eventFired = false;
    textarea.addEventListener('input', () => {
      eventFired = true;
    });

    setInputValue(textarea, 'hello world');

    expect(textarea.value).toBe('hello world');
    expect(eventFired).toBe(true);
    document.body.removeChild(textarea);
  });

  it('sets input value via property descriptor and fires input event', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    let eventFired = false;
    input.addEventListener('input', () => {
      eventFired = true;
    });

    setInputValue(input, 'test value');

    expect(input.value).toBe('test value');
    expect(eventFired).toBe(true);
    document.body.removeChild(input);
  });

  it('input event bubbles', () => {
    const container = document.createElement('div');
    const textarea = document.createElement('textarea');
    container.appendChild(textarea);
    document.body.appendChild(container);
    let bubbled = false;
    container.addEventListener('input', () => {
      bubbled = true;
    });

    setInputValue(textarea, 'bubbles test');

    expect(bubbled).toBe(true);
    document.body.removeChild(container);
  });
});
