import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function latestGitTag(): string {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error('Unable to determine release tag. Set GITHUB_REF_NAME or create a git tag.');
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function changelogContainsTag(changelog: string, tag: string): boolean {
  const escapedTag = escapeRegex(tag);
  const headingPattern = new RegExp(`^#{2,6}\\s+\\[?${escapedTag}\\]?\\b`, 'm');
  const compareLinkPattern = new RegExp(`\\bcompare/[^\\s)]*${escapedTag}\\b`);

  return headingPattern.test(changelog) || compareLinkPattern.test(changelog);
}

const tag = process.env.GITHUB_REF_NAME?.trim() || latestGitTag();
const changelog = readFileSync('CHANGELOG.md', 'utf8');

if (!changelogContainsTag(changelog, tag)) {
  console.error(
    `CHANGELOG.md does not contain an entry for ${tag}. ` +
      'Release order is: run pnpm changelog, commit CHANGELOG.md, then create/push the tag.',
  );
  process.exit(1);
}

console.log(`CHANGELOG.md contains an entry for ${tag}.`);
