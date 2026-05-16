import { describe, it, expect } from 'vitest';
import {
  composeTelegramMessage,
  type Snapshot,
} from '@/shared/adapters/telegram-format';

describe('adapters/telegram — composeTelegramMessage', () => {
  const fullSnapshot: Snapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: 'Paragraph here.',
  };

  it('formats prompt-first with plain text title', () => {
    const result = composeTelegramMessage({
      prompt: 'Summarize this',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    expect(lines[1]).toBe('');
    // Title is plain text — no bold/heading markdown
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
    const result = composeTelegramMessage({
      prompt: '',
      snapshot: sparse,
      timestampLabel: 'Captured at',
    });
    expect(result).toBe('Only Title');
    expect(result).not.toContain('Captured at');
  });

  it('omits prompt when empty', () => {
    const result = composeTelegramMessage({
      prompt: '',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    expect(result.startsWith('Test Article')).toBe(true);
  });

  it('does NOT truncate when under 4096 chars', () => {
    const shortContent = 'x'.repeat(100);
    const snapshot = { ...fullSnapshot, content: shortContent };
    const result = composeTelegramMessage({
      prompt: 'Summarize',
      snapshot,
      timestampLabel: 'Captured at',
    });
    // Output length equals the full formatted message (no truncation)
    expect(result).not.toContain('[truncated]');
    expect(result.length).toBeLessThanOrEqual(4096);
  });

  it('truncates content with suffix when over 4096 chars', () => {
    const longContent = 'x'.repeat(5000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeTelegramMessage({
      prompt: 'Summarize',
      snapshot,
      timestampLabel: 'Captured at',
    });
    expect(result.length).toBeLessThanOrEqual(4096);
    expect(result.endsWith('...[truncated]')).toBe(true);
    // Metadata preserved before truncation suffix
    expect(result).toContain('Summarize');
    expect(result).toContain('Test Article');
    expect(result).toContain('https://example.com/article');
    expect(result).toContain('A test description');
    expect(result).toContain('Captured at');
  });

  it('omits content and truncates metadata when metadata alone exceeds 4096', () => {
    const hugePrompt = 'P'.repeat(2000);
    const hugeTitle = 'T'.repeat(2000);
    const snapshot: Snapshot = {
      title: hugeTitle,
      url: 'https://example.com/very-long',
      description: 'D'.repeat(500),
      create_at: '2026-05-01T12:00:00.000Z',
      content: 'This content should be omitted entirely.',
    };
    const result = composeTelegramMessage({
      prompt: hugePrompt,
      snapshot,
      timestampLabel: 'Captured at',
    });
    expect(result.length).toBeLessThanOrEqual(4096);
    expect(result.endsWith('...[truncated]')).toBe(true);
    // Content field should NOT be present
    expect(result).not.toContain('This content should be omitted entirely.');
  });

  it('does NOT truncate at exactly 4096 chars', () => {
    // Build a message that is exactly 4096 characters long
    // Structure: prompt + title + url + description + timestamp + content
    const snapshot: Snapshot = {
      title: 'T',
      url: 'U',
      description: 'D',
      create_at: 'C',
      content: '',
    };
    // First, measure the formatted output without content to determine overhead
    const baseResult = composeTelegramMessage({
      prompt: 'P',
      snapshot: { ...snapshot, content: '' },
      timestampLabel: 'at',
    });
    // Now we know the base length; fill content to reach exactly 4096
    // But we need to build a full message that hits 4096 exactly
    // Let's construct it more precisely
    const content = 'x'.repeat(4096 - baseResult.length - 1); // -1 for newline separator
    const exactSnapshot = { ...snapshot, content };
    const result = composeTelegramMessage({
      prompt: 'P',
      snapshot: exactSnapshot,
      timestampLabel: 'at',
    });
    expect(result.length).toBe(4096);
    expect(result).not.toContain('[truncated]');
  });

  it('outputs plain text without markdown syntax', () => {
    const result = composeTelegramMessage({
      prompt: 'Summarize this',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at',
    });
    // No markdown syntax markers
    expect(result).not.toContain('**');
    expect(result).not.toContain('__');
    expect(result).not.toMatch(/^>/m); // no blockquote
    expect(result).not.toContain('##');
  });
});
