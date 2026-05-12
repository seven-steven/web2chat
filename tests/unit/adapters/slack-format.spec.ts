import { describe, it, expect } from 'vitest';
import { composeSlackMrkdwn, escapeSlackMentions } from '@/shared/adapters/slack-format';

describe('adapters/slack — composeSlackMrkdwn (D-128, D-131)', () => {
  const fullSnapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: '# Content\n\nParagraph here.',
  };

  it('formats prompt-first with *bold* title (mrkdwn)', () => {
    const result = composeSlackMrkdwn({ prompt: 'Summarize this', snapshot: fullSnapshot });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    expect(lines[1]).toBe('');
    // mrkdwn bold: *text* (NOT **text**)
    expect(result).toContain('*Test Article*');
    expect(result).not.toContain('**Test Article**');
    expect(result).toContain('https://example.com/article');
    expect(result).toContain('> A test description');
    expect(result).toContain('> 采集时间: 2026-05-01T12:00:00.000Z');
    expect(result).toContain('# Content\n\nParagraph here.');
  });

  it('omits empty fields entirely', () => {
    const sparse = { title: 'Only Title', url: '', description: '', create_at: '', content: '' };
    const result = composeSlackMrkdwn({ prompt: '', snapshot: sparse });
    expect(result).toBe('*Only Title*');
    expect(result).not.toContain('采集时间');
    expect(result).not.toContain('> ');
  });

  it('omits prompt when empty', () => {
    const result = composeSlackMrkdwn({ prompt: '', snapshot: fullSnapshot });
    expect(result.startsWith('*Test Article*')).toBe(true);
  });

  it('does NOT truncate long content (D-129)', () => {
    const longContent = 'x'.repeat(5000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeSlackMrkdwn({ prompt: 'Summarize', snapshot });
    // Slack 40K limit — no truncation expected
    expect(result.length).toBeGreaterThan(2000);
    expect(result).not.toContain('[truncated]');
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
