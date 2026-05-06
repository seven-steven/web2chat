// DO NOT FIX: this file intentionally contains hardcoded strings to test the ESLint rule.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from 'preact';

export function BadComponent() {
  return (
    <div>
      {/* VIOLATION 1: CJK in JSXText */}
      <span>发送</span>
      {/* VIOLATION 2: English capitalized in JSXText */}
      <button>Send</button>
      {/* VIOLATION 3: CJK in JSXExpressionContainer */}
      <p>{'确认删除'}</p>
      {/* VIOLATION 4: English in JSXExpressionContainer */}
      <label>{'Reset all'}</label>
      {/* OK: JSX attribute (class, data-testid) — not user-visible text */}
      <div class="text-slate-900" data-testid="container" />
      {/* OK: purely whitespace JSXText */}
      <span> </span>
      {/* OK: lowercase single word */}
      {'ok'}
    </div>
  );
}
