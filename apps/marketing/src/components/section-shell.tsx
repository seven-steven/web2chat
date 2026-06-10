/**
 * SectionShell — banded single-column section wrapper (D-01 / D-04).
 *
 * TDD RED stub: props typed, rendering not implemented yet.
 */
import type { ComponentChildren } from 'preact';

export interface SectionShellProps {
  /** Background band tone — canvas (page) or subtle (alternating surface). */
  tone: 'canvas' | 'subtle';
  /** Inner content max width; hero uses 4xl, all other sections 3xl. */
  width: '3xl' | '4xl';
  /** Section heading rendered as h2. Omit for the hero (which owns the h1). */
  title?: string;
  /** Optional one-line intro copy under the title. */
  intro?: string;
  children: ComponentChildren;
}

export function SectionShell(_props: SectionShellProps) {
  return null;
}
