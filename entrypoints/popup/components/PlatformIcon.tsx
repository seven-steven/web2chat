import { t } from '@/shared/i18n';

// Placeholder letterforms for Phase 4/5 brand glyphs — not user-visible copy,
// rendered inside SVG <text> as visual icon content.
const OPENCLAW_GLYPH = 'Oc';
const DISCORD_GLYPH = 'D';

type PlatformVariant = 'mock' | 'openclaw' | 'discord' | 'unsupported';

interface PlatformIconProps {
  variant: PlatformVariant;
  size?: 16 | 24;
}

/**
 * Inline-SVG platform icon — 4 variants per UI-SPEC S-Iconography lines 488-499.
 * Phase 4 will replace 'openclaw' letterform with a real brand glyph; Phase 5
 * does the same for 'discord'. The 'mock' + 'unsupported' icons are final.
 *
 * Color discipline (UI-SPEC S-Color reserved-list):
 *   - DO NOT use `text-sky-*` here — sky-600 is reserved for Confirm + focus
 *     ring + inline accent span (NOT for platform icons).
 *   - All variants use slate-500/slate-700 + currentColor for dark mode.
 */
export function PlatformIcon({ variant, size = 24 }: PlatformIconProps) {
  const tooltip =
    variant === 'mock'
      ? t('platform_icon_mock')
      : variant === 'openclaw'
        ? t('platform_icon_openclaw')
        : variant === 'discord'
          ? t('platform_icon_discord')
          : t('platform_icon_unsupported');

  const colorClass =
    variant === 'unsupported'
      ? 'text-slate-500 dark:text-slate-400'
      : variant === 'mock'
        ? 'text-slate-500 dark:text-slate-400'
        : 'text-slate-700 dark:text-slate-300'; // placeholders for Phase 4/5

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={colorClass}
      role="img"
      aria-label={tooltip}
    >
      {variant === 'unsupported' && (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15 15 0 0 1 0 20" />
          <path d="M12 2a15 15 0 0 0 0 20" />
        </>
      )}
      {variant === 'mock' && (
        <>
          <path d="M9 2v6L4.5 18.5A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-2.5L15 8V2" />
          <line x1="9" y1="2" x2="15" y2="2" />
        </>
      )}
      {variant === 'openclaw' && (
        <text x="4" y="17" font-size="14" font-weight="600" fill="currentColor" stroke="none">
          {OPENCLAW_GLYPH}
        </text>
      )}
      {variant === 'discord' && (
        <text x="8" y="17" font-size="16" font-weight="600" fill="currentColor" stroke="none">
          {DISCORD_GLYPH}
        </text>
      )}
    </svg>
  );
}
