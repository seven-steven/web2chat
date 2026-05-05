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
            d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"
          />
        </g>
      )}
    </svg>
  );
}
