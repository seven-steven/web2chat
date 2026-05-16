/**
 * Telegram message formatting (D-140..D-145).
 * Pure utility — no WXT or chrome.* imports.
 * Imported by both the adapter content script and unit tests.
 *
 * Telegram Web K has a 4096 character hard limit per message.
 * We use metadata-first truncation: preserve prompt/title/url/
 * description/timestamp, truncate content first, then description,
 * then hard-truncate with suffix as last resort.
 */

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

export const TELEGRAM_CHAR_LIMIT = 4096;
export const TRUNCATION_SUFFIX = '\n...[truncated]';

/**
 * Build prompt-first plain text message per D-140..D-145.
 * - Plain text output — no markdown syntax (D-141).
 * - Empty fields are omitted entirely.
 * - Metadata-first truncation: content first, then description, then hard truncate.
 * - Exactly 4096 chars → no truncation.
 */
export function composeTelegramMessage(payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel: string;
}): string {
  const { prompt, snapshot, timestampLabel } = payload;

  // Build full message
  const lines: string[] = [];
  if (prompt) lines.push(prompt, '');
  if (snapshot.title) lines.push(snapshot.title, '');
  if (snapshot.url) lines.push(snapshot.url, '');
  if (snapshot.description) lines.push(snapshot.description, '');
  if (snapshot.create_at) lines.push(`${timestampLabel} ${snapshot.create_at}`, '');
  if (snapshot.content) lines.push(snapshot.content);

  const result = lines.join('\n').trim();
  if (result.length <= TELEGRAM_CHAR_LIMIT) return result;

  // Step 1: Truncate content first
  const headerLines: string[] = [];
  if (prompt) headerLines.push(prompt, '');
  if (snapshot.title) headerLines.push(snapshot.title, '');
  if (snapshot.url) headerLines.push(snapshot.url, '');
  if (snapshot.description) headerLines.push(snapshot.description, '');
  if (snapshot.create_at) headerLines.push(`${timestampLabel} ${snapshot.create_at}`, '');

  const headerText = headerLines.join('\n');
  const headerLen = headerText.length;

  if (snapshot.content) {
    const separator = headerLen > 0 ? '\n' : '';
    const available = TELEGRAM_CHAR_LIMIT - headerLen - separator.length - TRUNCATION_SUFFIX.length;
    if (available > 0) {
      const truncatedContent = snapshot.content.slice(0, available);
      return headerLen > 0
        ? `${headerText}${separator}${truncatedContent}${TRUNCATION_SUFFIX}`
        : `${truncatedContent}${TRUNCATION_SUFFIX}`;
    }
  }

  // Step 2: Content removed entirely, still over — truncate description
  const noContentLines: string[] = [];
  if (prompt) noContentLines.push(prompt, '');
  if (snapshot.title) noContentLines.push(snapshot.title, '');
  if (snapshot.url) noContentLines.push(snapshot.url, '');
  if (snapshot.create_at) noContentLines.push(`${timestampLabel} ${snapshot.create_at}`, '');

  const noContentText = noContentLines.join('\n');
  if (snapshot.description) {
    const separator = noContentText.length > 0 ? '\n' : '';
    const available =
      TELEGRAM_CHAR_LIMIT - noContentText.length - separator.length - TRUNCATION_SUFFIX.length;
    if (available > 0) {
      const truncatedDesc = snapshot.description.slice(0, available);
      return noContentText.length > 0
        ? `${noContentText}${separator}${truncatedDesc}${TRUNCATION_SUFFIX}`
        : `${truncatedDesc}${TRUNCATION_SUFFIX}`;
    }
  }

  // Step 3: Last resort — hard truncate
  return (
    noContentText.slice(0, TELEGRAM_CHAR_LIMIT - TRUNCATION_SUFFIX.length).trim() +
    TRUNCATION_SUFFIX
  );
}
