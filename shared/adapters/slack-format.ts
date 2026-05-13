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
 * Build prompt-first Slack mrkdwn per D-128/D-131.
 * - Title uses *bold* (mrkdwn syntax, NOT **bold**).
 * - Empty fields are omitted entirely.
 * - escapeSlackMentions applied to prompt, title, description, content (NOT url or create_at).
 * - No truncation (D-129): Slack 40K char limit far exceeds actual web content.
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
  const safeContent = snapshot.content ? escapeSlackMentions(snapshot.content) : '';

  // Build lines array — empty fields omitted entirely
  const lines: string[] = [];
  if (safePrompt) lines.push(safePrompt, '');
  if (safeTitle) lines.push(`*${safeTitle}*`, ''); // mrkdwn bold: *text*
  if (snapshot.url) lines.push(snapshot.url, '');
  if (safeDescription) lines.push(`> ${safeDescription}`, '');
  if (snapshot.create_at) lines.push(`> ${timestampLabel} ${snapshot.create_at}`, '');
  if (safeContent) lines.push(safeContent);

  return lines.join('\n').trim();
}
