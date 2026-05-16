import { describe, it, expect } from 'vitest';
import { composeFeishuMessage, type Snapshot } from '@/shared/adapters/feishu-format';

describe('adapters/feishu — composeFeishuMessage', () => {
  const fullSnapshot: Snapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: 'Paragraph here.',
  };

  it('formats prompt-first with plain text output (no markdown)', () => {
    const result = composeFeishuMessage({
      prompt: 'Summarize this',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    expect(lines[1]).toBe('');
    // Plain text — no bold/heading markdown
    expect(result).toContain('Test Article');
    expect(result).not.toContain('*Test Article*');
    expect(result).not.toContain('**Test Article**');
    expect(result).toContain('https://example.com/article');
    expect(result).toContain('A test description');
    expect(result).toContain('Captured at 2026-05-01T12:00:00.000Z');
    expect(result).toContain('Paragraph here.');
  });

  it('omits empty fields entirely', () => {
    const sparse: Snapshot = {
      title: 'Only Title',
      url: '',
      description: '',
      create_at: '',
      content: '',
    };
    const result = composeFeishuMessage({
      prompt: '',
      snapshot: sparse,
      timestampLabel: 'Captured at',
    });
    expect(result).toBe('Only Title');
    expect(result).not.toContain('Captured at');
  });

  it('omits prompt when empty (title appears first)', () => {
    const result = composeFeishuMessage({
      prompt: '',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    expect(result.startsWith('Test Article')).toBe(true);
  });

  it('does NOT truncate even for very long content (10000+ chars)', () => {
    const longContent = 'x'.repeat(10000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeFeishuMessage({
      prompt: 'Summarize',
      snapshot,
      timestampLabel: 'Captured at',
    });
    // Full content preserved — no truncation
    expect(result).toContain(longContent);
    expect(result).not.toContain('[truncated]');
  });

  it('contains no markdown syntax', () => {
    const result = composeFeishuMessage({
      prompt: 'Summarize this',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    expect(result).not.toContain('**');
    expect(result).not.toContain('__');
    expect(result).not.toMatch(/^>/m);
    expect(result).not.toContain('##');
  });

  it('produces correctly ordered output with all fields', () => {
    const result = composeFeishuMessage({
      prompt: 'My Prompt',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    const promptIdx = result.indexOf('My Prompt');
    const titleIdx = result.indexOf('Test Article');
    const urlIdx = result.indexOf('https://example.com/article');
    const descIdx = result.indexOf('A test description');
    const tsIdx = result.indexOf('Captured at');
    const contentIdx = result.indexOf('Paragraph here.');

    expect(promptIdx).toBeLessThan(titleIdx);
    expect(titleIdx).toBeLessThan(urlIdx);
    expect(urlIdx).toBeLessThan(descIdx);
    expect(descIdx).toBeLessThan(tsIdx);
    expect(tsIdx).toBeLessThan(contentIdx);
  });

  it('works with only prompt and content (no metadata)', () => {
    const minimalSnapshot: Snapshot = {
      title: '',
      url: '',
      description: '',
      create_at: '',
      content: 'Just content.',
    };
    const result = composeFeishuMessage({
      prompt: 'Process this',
      snapshot: minimalSnapshot,
      timestampLabel: 'Captured at',
    });
    expect(result).toBe('Process this\n\nJust content.');
  });
});
