/**
 * Feishu/Lark message formatting (D-158, D-159).
 * Pure utility — no WXT or chrome.* imports.
 * Imported by both the adapter content script and unit tests.
 *
 * Feishu web chat paste handler does not preserve Markdown formatting,
 * so output is plain text with no markdown syntax.
 * No truncation — Feishu text message limit is 150KB (~150K chars),
 * far beyond any realistic web page content.
 */

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

/**
 * Build prompt-first plain text message.
 * Field order: prompt -> title -> url -> description -> timestamp -> content.
 * Empty fields are omitted entirely.
 * No truncation or markdown syntax.
 */
export function composeFeishuMessage(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;
  const lines: string[] = [];
  if (prompt) lines.push(prompt, '');
  if (snapshot.title) lines.push(snapshot.title, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (snapshot.description) lines.push(snapshot.description, '');
  if (snapshot.create_at) lines.push(`${timestampLabel} ${snapshot.create_at}`, '');
  if (snapshot.content) lines.push(snapshot.content);
  return lines.join('\n').trim();
}
