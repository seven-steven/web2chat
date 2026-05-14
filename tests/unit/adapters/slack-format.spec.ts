import { describe, it, expect } from 'vitest';
import {
  composeSlackMrkdwn,
  escapeSlackMentions,
  convertMarkdownToMrkdwn,
} from '@/shared/adapters/slack-format';

describe('adapters/slack — composeSlackMrkdwn (D-128, D-131)', () => {
  const fullSnapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: '# Content\n\nParagraph here.',
  };

  it('formats prompt-first with plain text title', () => {
    const result = composeSlackMrkdwn({
      prompt: 'Summarize this',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at:',
    });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    expect(lines[1]).toBe('');
    expect(result).toContain('Test Article');
    expect(result).not.toContain('*Test Article*');
    expect(result).toContain('https://example.com/article');
    expect(result).toContain('A test description');
    expect(result).toContain('Captured at: 2026-05-01T12:00:00.000Z');
    expect(result).toContain('Content');
    expect(result).not.toContain('# Content');
  });

  it('omits empty fields entirely', () => {
    const sparse = { title: 'Only Title', url: '', description: '', create_at: '', content: '' };
    const result = composeSlackMrkdwn({
      prompt: '',
      snapshot: sparse,
      timestampLabel: 'Captured at:',
    });
    expect(result).toBe('Only Title');
    expect(result).not.toContain('Captured at');
    expect(result).not.toContain('> ');
  });

  it('omits prompt when empty', () => {
    const result = composeSlackMrkdwn({
      prompt: '',
      snapshot: fullSnapshot,
      timestampLabel: 'Captured at:',
    });
    expect(result.startsWith('Test Article')).toBe(true);
  });

  it('does NOT truncate content under 35000 chars (D-129)', () => {
    const longContent = 'x'.repeat(5000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeSlackMrkdwn({
      prompt: 'Summarize',
      snapshot,
      timestampLabel: 'Captured at:',
    });
    // 5000 chars is well under 35000 limit — no truncation expected
    expect(result.length).toBeGreaterThan(2000);
    expect(result).not.toContain('[truncated]');
  });

  it('converts Markdown syntax in content to plain text', () => {
    const snapshot = {
      ...fullSnapshot,
      content: '## Title\n\n**bold** text and *italic*\n\n- list item',
    };
    const result = composeSlackMrkdwn({
      prompt: '',
      snapshot,
      timestampLabel: 'Captured at:',
    });
    expect(result).toContain('Title');
    expect(result).toContain('bold');
    expect(result).toContain('italic');
    expect(result).not.toContain('## Title');
    expect(result).not.toContain('**bold**');
    expect(result).not.toContain('*Title*');
    expect(result).toContain('• list item');
  });
});

describe('adapters/slack — escapeSlackMentions (D-130)', () => {
  const ZWS = '​';

  it('<!everyone> -> ZWS after !', () => {
    expect(escapeSlackMentions('<!everyone>')).toBe(`<!${ZWS}everyone>`);
  });

  it('<!here> -> ZWS after !', () => {
    expect(escapeSlackMentions('<!here>')).toBe(`<!${ZWS}here>`);
  });

  it('<!channel> -> ZWS after !', () => {
    expect(escapeSlackMentions('<!channel>')).toBe(`<!${ZWS}channel>`);
  });

  it('<@U123456> -> ZWS after <', () => {
    expect(escapeSlackMentions('<@U123456>')).toBe(`<${ZWS}@U123456>`);
  });

  it('<@W123> -> ZWS after <', () => {
    expect(escapeSlackMentions('<@W123>')).toBe(`<${ZWS}@W123>`);
  });

  it('<#C789> -> ZWS after <', () => {
    expect(escapeSlackMentions('<#C789>')).toBe(`<${ZWS}#C789>`);
  });

  it('bare @everyone -> ZWS after @', () => {
    expect(escapeSlackMentions('@everyone')).toBe(`@${ZWS}everyone`);
  });

  it('bare @here -> ZWS after @', () => {
    expect(escapeSlackMentions('@here')).toBe(`@${ZWS}here`);
  });

  it('bare @channel unchanged (only <!channel> triggers, not @channel)', () => {
    expect(escapeSlackMentions('@channel')).toBe('@channel');
  });

  it('normal text unchanged', () => {
    const text = 'Hello world, nothing special here.';
    expect(escapeSlackMentions(text)).toBe(text);
  });

  it('mixed mentions all escaped', () => {
    const input = 'Hey @everyone and @here, see <@U123> and <#C456> and <!channel>';
    const result = escapeSlackMentions(input);
    expect(result).not.toBe(input);
    expect(result).toContain(`@${ZWS}everyone`);
    expect(result).toContain(`@${ZWS}here`);
    expect(result).toContain(`<${ZWS}@U123>`);
    expect(result).toContain(`<${ZWS}#C456>`);
    expect(result).toContain(`<!${ZWS}channel>`);
  });

  it('@hereford unchanged (no partial match)', () => {
    expect(escapeSlackMentions('@hereford')).toBe('@hereford');
  });

  it('user@everyone.com unchanged (lookbehind)', () => {
    expect(escapeSlackMentions('user@everyone.com')).toBe('user@everyone.com');
  });

  it('@everywhere unchanged (word boundary)', () => {
    expect(escapeSlackMentions('@everywhere')).toBe('@everywhere');
  });
});

describe('adapters/slack — convertMarkdownToMrkdwn', () => {
  it('strips **bold** to plain text', () => {
    expect(convertMarkdownToMrkdwn('say **hello** world')).toBe('say hello world');
  });

  it('strips *italic* to plain text', () => {
    expect(convertMarkdownToMrkdwn('this is *important*')).toBe('this is important');
  });

  it('strips both **bold** and *italic* in same line', () => {
    expect(convertMarkdownToMrkdwn('**bold** and *italic*')).toBe('bold and italic');
  });

  it('converts ## heading to plain text (strips markers)', () => {
    expect(convertMarkdownToMrkdwn('## Section Title\nparagraph')).toBe('Section Title\nparagraph');
  });

  it('converts # heading to plain text (strips markers)', () => {
    expect(convertMarkdownToMrkdwn('# Main Title\nparagraph')).toBe('Main Title\nparagraph');
  });

  it('converts [text](url) to bare url', () => {
    expect(convertMarkdownToMrkdwn('visit [example](https://example.com)')).toBe(
      'visit https://example.com',
    );
  });

  it('converts - item (hyphen list) to bullet', () => {
    expect(convertMarkdownToMrkdwn('- first item')).toBe('• first item');
  });

  it('converts * item (asterisk list) to bullet', () => {
    expect(convertMarkdownToMrkdwn('* first item')).toBe('• first item');
  });

  it('preserves inline code unchanged', () => {
    expect(convertMarkdownToMrkdwn('`inline code` stays')).toBe('`inline code` stays');
  });

  it('preserves fenced code blocks unchanged', () => {
    const input = '```js\ncode\n```';
    expect(convertMarkdownToMrkdwn(input)).toBe(input);
  });

  it('preserves > blockquote unchanged', () => {
    expect(convertMarkdownToMrkdwn('> quoted text')).toBe('> quoted text');
  });

  it('handles --- horizontal rule', () => {
    const result = convertMarkdownToMrkdwn('above\n---\nbelow');
    expect(result).not.toContain('---');
  });

  it('correctly handles asterisk list items containing italic text', () => {
    const input = '* item with *important* text';
    const result = convertMarkdownToMrkdwn(input);
    expect(result).toBe('• item with important text');
  });

  it('correctly handles hyphen list items containing italic text', () => {
    const input = '- item with *emphasized* word';
    const result = convertMarkdownToMrkdwn(input);
    expect(result).toBe('• item with emphasized word');
  });

  it('correctly handles multiline asterisk list with mixed italic', () => {
    const input = '* first\n* second with *bold-like*';
    const result = convertMarkdownToMrkdwn(input);
    expect(result).toBe('• first\n• second with bold-like');
  });

  it('strips image syntax ![alt](url) entirely', () => {
    expect(convertMarkdownToMrkdwn('text ![badge](https://img.shields.io/stars) more')).toBe(
      'text  more',
    );
  });

  it('strips multiple images', () => {
    const input = '![a](http://a) middle ![b](http://b)';
    expect(convertMarkdownToMrkdwn(input)).toBe(' middle ');
  });

  it('preserves links but strips images in same input', () => {
    const input = '![img](http://img) and [link](http://link)';
    expect(convertMarkdownToMrkdwn(input)).toBe(' and http://link');
  });
});

describe('adapters/slack — content truncation', () => {
  const fullSnapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: '# Content\n\nParagraph here.',
  };

  it('does NOT truncate content at exactly 35000 chars', () => {
    const content = 'x'.repeat(35000);
    const snapshot = { ...fullSnapshot, content };
    const result = composeSlackMrkdwn({
      prompt: '',
      snapshot,
      timestampLabel: 'Captured at:',
    });
    expect(result).not.toContain('[truncated]');
  });

  it('truncates content exceeding 35000 chars with [truncated] suffix', () => {
    const content = 'x'.repeat(35001);
    const snapshot = { ...fullSnapshot, content };
    const result = composeSlackMrkdwn({
      prompt: '',
      snapshot,
      timestampLabel: 'Captured at:',
    });
    expect(result).toContain('...[truncated]');
  });

  it('truncated output ends with ...[truncated]', () => {
    const content = 'a'.repeat(35001);
    const snapshot = { ...fullSnapshot, content };
    const result = composeSlackMrkdwn({
      prompt: '',
      snapshot,
      timestampLabel: 'Captured at:',
    });
    expect(result.endsWith('...[truncated]')).toBe(true);
  });
});
