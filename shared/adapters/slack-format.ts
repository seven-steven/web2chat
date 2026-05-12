/**
 * Slack mrkdwn formatting — STUB (RED phase).
 * Will be replaced with real implementation in GREEN phase.
 */

export interface Snapshot {
  title: string;
  url: string;
  description: string;
  create_at: string;
  content: string;
}

// Stub: returns empty string (all assertions will fail)
export function composeSlackMrkdwn(_payload: {
  prompt: string;
  snapshot: Snapshot;
  timestampLabel?: string;
}): string {
  return '';
}

// Stub: returns input unchanged (no escaping)
export function escapeSlackMentions(text: string): string {
  return text;
}
