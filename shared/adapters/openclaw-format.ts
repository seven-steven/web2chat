/**
 * OpenClaw message formatting (D-39, D-40, D-41).
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

/**
 * Build prompt-first Markdown per D-39/D-40/D-41.
 * Empty fields are omitted entirely (no empty placeholder lines).
 * No truncation applied (D-41) — OpenClaw has no char limit.
 */
export function composeMarkdown(payload: { prompt: string; snapshot: Snapshot }): string {
  const lines: string[] = [];
  if (payload.prompt) lines.push(payload.prompt, '');
  if (payload.snapshot.title) lines.push(`## ${payload.snapshot.title}`, '');
  if (payload.snapshot.url) lines.push(payload.snapshot.url, '');
  if (payload.snapshot.description) lines.push(`> ${payload.snapshot.description}`, '');
  if (payload.snapshot.create_at) lines.push(`> 采集时间: ${payload.snapshot.create_at}`, '');
  if (payload.snapshot.content) lines.push(payload.snapshot.content);
  return lines.join('\n').trim();
}
