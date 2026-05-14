/**
 * Slack mrkdwn formatting (D-128, D-129, D-130, D-131).
 * Pure utility — no WXT or chrome.* imports.
 * Imported by both the adapter content script and unit tests.
 */

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

const ZWS = '​';
const TRUNCATE_LIMIT = 35000;

/**
 * Break Slack mention patterns via zero-width space (U+200B) insertion (D-130).
 * - <!everyone>, <!here>, <!channel> -> ZWS inserted after !
 * - <@U123>, <@W123> user mentions -> ZWS inserted after <
 * - <#C123> channel mentions -> ZWS inserted after <
 * - bare @everyone / @here -> ZWS inserted after @ (word-boundary aware)
 */
export function escapeSlackMentions(text: string): string {
  let result = text;
  // Break <!everyone>, <!here>, <!channel> with ZWS after !
  result = result.replace(/<!(everyone|here|channel)>/g, `<!${ZWS}$1>`);
  // Break <@U123>, <@W123> user mentions with ZWS after <
  // Only U (user) and W (workspace guest) IDs are mentionable; B (bot) IDs are not
  // valid mention targets in Slack, so they are intentionally excluded.
  result = result.replace(/<@([UW][A-Z0-9]+)>/g, `<${ZWS}@$1>`);
  // Break <#C123> channel mentions with ZWS after <
  result = result.replace(/<#([A-Z0-9]+)>/g, `<${ZWS}#$1>`);
  // Break <!subteam^S12345> and <!subteam^S12345|@name> usergroup mentions
  result = result.replace(/<!subteam\^[A-Z0-9]+(?:\|[^>]*)?>/g, (m) => {
    return '<!' + ZWS + m.slice(2);
  });
  // Break bare @everyone / @here with ZWS after @ (lookbehind + word boundary)
  result = result.replace(/(?<!\w)@(everyone|here)\b/g, `@${ZWS}$1`);
  return result;
}

/**
 * Convert CommonMark Markdown to Slack mrkdwn (T-10-05-01 — uses lazy quantifiers).
 * Order matters: extract code blocks first, then protect bold/heading/list markers
 * from the italic regex before italic conversion.
 *
 * Step order: fenced code -> inline code -> bold -> headings -> images -> links
 * -> list markers -> italic -> horizontal rules -> restore all placeholders.
 */
export function convertMarkdownToMrkdwn(text: string): string {
  // Unique placeholder prefix — unlikely to collide with web content
  const PH = (tag: string, idx: number) => `@@W2C_${tag}_${idx}@@`;

  // 1. Extract fenced code blocks — protect from all conversion
  const fencedBlocks: string[] = [];
  let result = text.replace(/```[\s\S]*?```/g, (m) => {
    fencedBlocks.push(m);
    return PH('FENCED', fencedBlocks.length - 1);
  });

  // 2. Extract inline code — protect from all conversion
  const inlineCodes: string[] = [];
  result = result.replace(/`[^`]+`/g, (m) => {
    inlineCodes.push(m);
    return PH('INLINE', inlineCodes.length - 1);
  });

  // 3. Strip bold: **text** -> plain text (Quill paste doesn't support *text* bold)
  result = result.replace(/\*\*(.+?)\*\*/g, '$1');

  // 4. Strip headings: ## text -> plain text (no bold — content headings don't need emphasis)
  const headingTokens: string[] = [];
  result = result.replace(/^#{1,6}\s+(.+)$/gm, (_, content: string) => {
    headingTokens.push(content);
    return PH('HEADING', headingTokens.length - 1);
  });

  // 5. Strip images: ![alt](url) -> empty (Slack mrkdwn does not support inline images)
  result = result.replace(/!\[(.+?)\]\((.+?)\)/g, '');

  // 6. Convert links: [text](url) -> url (Slack auto-links bare URLs; <url|text> doesn't work in paste)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '$2');

  // 7. Strip list markers via placeholders (protect from italic regex)
  //    Turndown default bulletListMarker is '*', so asterisk list markers
  //    would be matched by the italic regex if not protected.
  //    Only the marker ("- "/"* ") is replaced; content remains for italic conversion.
  let listIdx = 0;
  result = result.replace(/^[-*]\s/gm, () => PH('LIST', listIdx++));

  // 8. Strip italic: *text* -> plain text (Quill paste doesn't support _text_ italic)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');

  // 9. Convert horizontal rules: --- (or more) on own line -> empty line
  result = result.replace(/^-{3,}$/gm, '');

  // 10. Restore placeholders (LIST markers restored as Slack bullet •)
  result = result.replace(/@@W2C_LIST_(\d+)@@/g, () => '• ');
  result = result.replace(/@@W2C_HEADING_(\d+)@@/g, (_, i) => headingTokens[Number(i)] ?? '');
  result = result.replace(/@@W2C_INLINE_(\d+)@@/g, (_, i) => inlineCodes[Number(i)] ?? '');
  result = result.replace(/@@W2C_FENCED_(\d+)@@/g, (_, i) => fencedBlocks[Number(i)] ?? '');

  return result;
}

/**
 * Build prompt-first Slack mrkdwn per D-128/D-131.
 * - Title uses *bold* (mrkdwn syntax, NOT **bold**).
 * - Empty fields are omitted entirely.
 * - escapeSlackMentions applied to prompt, title, description, content (NOT url or create_at).
 * - Content converted from Markdown to mrkdwn, then truncated at 35000 chars.
 */
export function composeSlackMrkdwn(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;

  // Escape user-controlled text fields
  const safePrompt = prompt ? escapeSlackMentions(prompt) : '';
  const safeTitle = snapshot.title ? escapeSlackMentions(snapshot.title) : '';
  const safeDescription = snapshot.description ? escapeSlackMentions(snapshot.description) : '';

  // Convert content Markdown -> mrkdwn, then truncate if needed
  const rawContent = snapshot.content ? convertMarkdownToMrkdwn(snapshot.content) : '';
  const truncatedContent =
    rawContent.length > TRUNCATE_LIMIT
      ? rawContent.slice(0, TRUNCATE_LIMIT) + '\n...[truncated]'
      : rawContent;
  const safeContent = truncatedContent ? escapeSlackMentions(truncatedContent) : '';

  // Build lines array — empty fields omitted entirely
  const lines: string[] = [];
  if (safePrompt) lines.push(safePrompt, '');
  if (safeTitle) lines.push(safeTitle, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (safeDescription) lines.push(safeDescription, '');
  if (snapshot.create_at) lines.push(`${timestampLabel} ${snapshot.create_at}`, '');
  if (safeContent) lines.push(safeContent);

  return lines.join('\n').trim();
}
