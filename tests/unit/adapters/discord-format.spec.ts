import { describe, it, expect } from 'vitest';
import {
  composeDiscordMarkdown,
  escapeMentions,
  DISCORD_CHAR_LIMIT,
} from '@/shared/adapters/discord-format';

describe('adapters/discord — composeDiscordMarkdown (ADD-01, D-54, D-55)', () => {
  const fullSnapshot = {
    title: 'Test Article',
    url: 'https://example.com/article',
    description: 'A test description',
    create_at: '2026-05-01T12:00:00.000Z',
    content: '# Content\n\nParagraph here.',
  };

  it('formats prompt-first with **bold** title', () => {
    const result = composeDiscordMarkdown({ prompt: 'Summarize this', snapshot: fullSnapshot });
    const lines = result.split('\n');
    expect(lines[0]).toBe('Summarize this');
    expect(lines[1]).toBe('');
    expect(result).toContain('**Test Article**');
    // Must NOT use ## heading (D-54)
    expect(result).not.toContain('## Test Article');
    expect(result).toContain('https://example.com/article');
    expect(result).toContain('> A test description');
    expect(result).toContain('> 采集时间: 2026-05-01T12:00:00.000Z');
    expect(result).toContain('# Content\n\nParagraph here.');
  });

  it('omits empty fields entirely', () => {
    const sparse = { title: 'Only Title', url: '', description: '', create_at: '', content: '' };
    const result = composeDiscordMarkdown({ prompt: '', snapshot: sparse });
    expect(result).toBe('**Only Title**');
    expect(result).not.toContain('采集时间');
    expect(result).not.toContain('> ');
  });

  it('omits prompt when empty', () => {
    const result = composeDiscordMarkdown({ prompt: '', snapshot: fullSnapshot });
    expect(result.startsWith('**Test Article**')).toBe(true);
  });

  it('truncates content to 2000 chars with suffix', () => {
    const longContent = 'x'.repeat(5000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeDiscordMarkdown({ prompt: 'Summarize', snapshot });
    expect(result.length).toBeLessThanOrEqual(DISCORD_CHAR_LIMIT);
    expect(result).toContain('\n...[truncated]');
    // Prompt preserved fully
    expect(result).toContain('Summarize');
  });

  it('preserves prompt fully during truncation (D-55)', () => {
    const longPrompt = 'P'.repeat(500);
    const longContent = 'x'.repeat(5000);
    const snapshot = { ...fullSnapshot, content: longContent };
    const result = composeDiscordMarkdown({ prompt: longPrompt, snapshot });
    expect(result.length).toBeLessThanOrEqual(DISCORD_CHAR_LIMIT);
    expect(result).toContain(longPrompt);
  });
});

describe('adapters/discord — escapeMentions (D-57)', () => {
  const ZWS = '​';

  it('@everyone → zero-width space inserted', () => {
    const result = escapeMentions('@everyone');
    expect(result).toBe(`@${ZWS}everyone`);
    expect(result).toContain(ZWS);
  });

  it('@here → zero-width space inserted', () => {
    const result = escapeMentions('@here');
    expect(result).toBe(`@${ZWS}here`);
    expect(result).toContain(ZWS);
  });

  it('<@123456> → broken', () => {
    const result = escapeMentions('<@123456>');
    expect(result).toBe(`<${ZWS}@123456>`);
  });

  it('<@!123> → broken', () => {
    const result = escapeMentions('<@!123>');
    expect(result).toBe(`<${ZWS}@!123>`);
  });

  it('<@&999> → broken', () => {
    const result = escapeMentions('<@&999>');
    expect(result).toBe(`<${ZWS}@&999>`);
  });

  it('<#789> → broken', () => {
    const result = escapeMentions('<#789>');
    expect(result).toBe(`<${ZWS}#789>`);
  });

  it('normal text unchanged', () => {
    const text = 'Hello world, nothing special here.';
    expect(escapeMentions(text)).toBe(text);
  });

  it('mixed mentions all escaped', () => {
    const input = 'Hey @everyone and @here, see <@123> and <#456> and <@&789>';
    const result = escapeMentions(input);
    expect(result).not.toBe(input);
    expect(result).toContain(`@${ZWS}everyone`);
    expect(result).toContain(`@${ZWS}here`);
    expect(result).toContain(`<${ZWS}@123>`);
    expect(result).toContain(`<${ZWS}#456>`);
    expect(result).toContain(`<${ZWS}@&789>`);
  });
});
