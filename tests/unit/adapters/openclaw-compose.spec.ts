import { describe, it, expect } from 'vitest';
import { composeMarkdown } from '@/shared/adapters/openclaw-format';

describe('adapters/openclaw — composeMarkdown (ADO-01, D-39, D-40, D-41)', () => {
  const fullSnapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: '# Content\n\nParagraph here.',
  };

  it('formats prompt-first with all fields', () => {
    const result = composeMarkdown({ prompt: 'Summarize this', snapshot: fullSnapshot });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    expect(lines[1]).toBe('');
    expect(lines[2]).toBe('## Test Article');
    expect(result).toContain('https://example.com/article');
    expect(result).toContain('> A test description');
    expect(result).toContain('> 采集时间: 2026-05-01T12:00:00.000Z');
    expect(result).toContain('# Content\n\nParagraph here.');
  });

  it('omits empty fields entirely (D-40)', () => {
    const sparse = { title: 'Only Title', url: '', description: '', create_at: '', content: '' };
    const result = composeMarkdown({ prompt: '', snapshot: sparse });
    expect(result).toBe('## Only Title');
    expect(result).not.toContain('采集时间');
    expect(result).not.toContain('> \n');
  });

  it('omits prompt when empty', () => {
    const result = composeMarkdown({ prompt: '', snapshot: fullSnapshot });
    expect(result.startsWith('## Test Article')).toBe(true);
  });

  it('handles all fields empty except content', () => {
    const minimal = {
      title: '',
      url: '',
      description: '',
      create_at: '',
      content: 'Just content',
    };
    const result = composeMarkdown({ prompt: '', snapshot: minimal });
    expect(result).toBe('Just content');
  });

  it('no truncation applied (D-41)', () => {
    const longContent = 'x'.repeat(10_000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeMarkdown({ prompt: 'p', snapshot });
    expect(result).toContain(longContent);
    expect(result.length).toBeGreaterThan(10_000);
  });
});
