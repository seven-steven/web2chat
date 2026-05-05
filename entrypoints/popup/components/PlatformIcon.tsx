import { t } from '@/shared/i18n';

type PlatformVariant = 'mock' | 'openclaw' | 'discord' | 'unsupported';

interface PlatformIconProps {
  variant: PlatformVariant;
  size?: 16 | 24;
}

/**
 * Inline-SVG platform icon — 4 variants per UI-SPEC S-Iconography lines 488-499.
 * 'openclaw' uses the official pixel-lobster mascot (16x16 -> scaled 0.2x to 24x24).
 * 'discord' uses a simplified Clyde brand SVG (24x24 viewBox).
 * The 'mock' + 'unsupported' icons are final.
 *
 * Color discipline (UI-SPEC S-Color reserved-list):
 *   - DO NOT use `text-sky-*` here — sky-600 is reserved for Confirm + focus
 *     ring + inline accent span (NOT for platform icons).
 *   - OpenClaw uses hardcoded brand colors; other variants use currentColor.
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
        // Vector lobster favicon from OpenClaw server (120×120 → scaled 0.2× to 24×24)
        <g transform="scale(0.2)" stroke="none">
          <defs>
            <linearGradient id="openclaw-lg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ff4d4d" />
              <stop offset="100%" stop-color="#991b1b" />
            </linearGradient>
          </defs>
          <path
            d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z"
            fill="url(#openclaw-lg)"
          />
          <path
            d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z"
            fill="url(#openclaw-lg)"
          />
          <path
            d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z"
            fill="url(#openclaw-lg)"
          />
          <path
            d="M45 15 Q35 5 30 8"
            stroke="#ff4d4d"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M75 15 Q85 5 90 8"
            stroke="#ff4d4d"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
          <circle cx="45" cy="35" r="6" fill="#050810" />
          <circle cx="75" cy="35" r="6" fill="#050810" />
          <circle cx="46" cy="34" r="2.5" fill="#00e5cc" />
          <circle cx="76" cy="34" r="2.5" fill="#00e5cc" />
        </g>
      )}
      {variant === 'discord' && (
        <g stroke="none">
          <path
            fill="currentColor"
            d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.36-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"
          />
        </g>
      )}
    </svg>
  );
}
