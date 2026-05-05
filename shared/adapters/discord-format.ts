/**
 * Discord message formatting (D-54, D-55, D-57, D-58).
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

export const DISCORD_CHAR_LIMIT = 2000;
export const TRUNCATION_SUFFIX = '\n...[truncated]';

/**
 * Break Discord mention patterns via zero-width space (U+200B) insertion (D-57).
 * - @everyone / @here → @​everyone / @​here (ZWS after @)
 * - <@id>, <@!id>, <@&id>, <#id> → <​@id> etc. (ZWS after <)
 */
export function escapeMentions(text: string): string {
  // Break @everyone and @here
  let result = text.replace(/@(everyone|here)/g, '@​$1');
  // Break <@id>, <@!id>, <@&id>, <#id>
  result = result.replace(/<(@[!&]?\d+|#\d+)>/g, '<​$1>');
  return result;
}

/**
 * Build prompt-first Discord markdown per D-54/D-55/D-58.
 * - Title uses **bold** (not ## heading) per D-54.
 * - Empty fields are omitted entirely.
 * - escapeMentions applied to prompt, title, description, content (NOT url or create_at).
 * - Truncation: prompt-first priority (D-55). If > 2000 chars, content truncated first,
 *   then description if still over.
 */
export function composeDiscordMarkdown(payload: { prompt: string; snapshot: Snapshot }): string {
  const { prompt, snapshot } = payload;

  // Escape user-controlled text fields
  const safePrompt = prompt ? escapeMentions(prompt) : '';
  const safeTitle = snapshot.title ? escapeMentions(snapshot.title) : '';
  const safeDescription = snapshot.description ? escapeMentions(snapshot.description) : '';
  const safeContent = snapshot.content ? escapeMentions(snapshot.content) : '';

  // Build lines array — empty fields omitted entirely
  const lines: string[] = [];
  if (safePrompt) lines.push(safePrompt, '');
  if (safeTitle) lines.push(`**${safeTitle}**`, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (safeDescription) lines.push(`> ${safeDescription}`, '');
  if (snapshot.create_at) lines.push(`> 采集时间: ${snapshot.create_at}`, '');
  if (safeContent) lines.push(safeContent);

  const result = lines.join('\n').trim();

  if (result.length <= DISCORD_CHAR_LIMIT) {
    return result;
  }

  // Truncation: prompt-first priority
  // Rebuild without content, measure overhead
  const headerLines: string[] = [];
  if (safePrompt) headerLines.push(safePrompt, '');
  if (safeTitle) headerLines.push(`**${safeTitle}**`, '');
  if (snapshot.url) headerLines.push(snapshot.url, '');
  if (safeDescription) headerLines.push(`> ${safeDescription}`, '');
  if (snapshot.create_at) headerLines.push(`> 采集时间: ${snapshot.create_at}`, '');

  const headerText = headerLines.join('\n');
  const headerLen = headerText.length;

  // Try truncating content first
  if (safeContent) {
    // Available space for content (account for newline separator + suffix)
    const separator = headerLen > 0 ? '\n' : '';
    const available = DISCORD_CHAR_LIMIT - headerLen - separator.length - TRUNCATION_SUFFIX.length;

    if (available > 0) {
      const truncatedContent = safeContent.slice(0, available);
      const assembled = headerLen > 0
        ? `${headerText}\n${truncatedContent}${TRUNCATION_SUFFIX}`
        : `${truncatedContent}${TRUNCATION_SUFFIX}`;
      return assembled.trim();
    }
  }

  // Content removed entirely, still over — truncate description
  const noContentLines: string[] = [];
  if (safePrompt) noContentLines.push(safePrompt, '');
  if (safeTitle) noContentLines.push(`**${safeTitle}**`, '');
  if (snapshot.url) noContentLines.push(snapshot.url, '');
  if (snapshot.create_at) noContentLines.push(`> 采集时间: ${snapshot.create_at}`, '');

  const noContentText = noContentLines.join('\n');

  if (safeDescription) {
    const separator = noContentText.length > 0 ? '\n' : '';
    const available =
      DISCORD_CHAR_LIMIT - noContentText.length - separator.length - TRUNCATION_SUFFIX.length - '> '.length;

    if (available > 0) {
      const truncatedDesc = safeDescription.slice(0, available);
      const assembled = noContentText.length > 0
        ? `${noContentText}\n> ${truncatedDesc}${TRUNCATION_SUFFIX}`
        : `> ${truncatedDesc}${TRUNCATION_SUFFIX}`;
      return assembled.trim();
    }
  }

  // Last resort: just truncate the whole thing
  return noContentText.slice(0, DISCORD_CHAR_LIMIT - TRUNCATION_SUFFIX.length).trim() + TRUNCATION_SUFFIX;
}
