import { t } from '@/shared/i18n';

type PlatformVariant = 'mock' | 'openclaw' | 'discord' | 'slack' | 'telegram' | 'feishu' | 'unsupported';

interface PlatformIconProps {
  variant: PlatformVariant;
  size?: 16 | 24;
}

/**
 * Inline-SVG platform icon — 4 variants per UI-SPEC S-Iconography lines 488-499.
 * 'openclaw' uses the official pixel-lobster mascot — hardcoded brand gradient
 * (NOT tokenized; brand colors should not adapt to UI theme).
 * 'discord' uses simplified Clyde brand SVG with currentColor.
 * 'mock' + 'unsupported' use the muted-ink token (theme-aware).
 */
export function PlatformIcon({ variant, size = 24 }: PlatformIconProps) {
  const tooltip =
    variant === 'mock'
      ? t('platform_icon_mock')
      : variant === 'openclaw'
        ? t('platform_icon_openclaw')
        : variant === 'discord'
          ? t('platform_icon_discord')
          : variant === 'slack'
            ? t('platform_icon_slack')
            : variant === 'telegram'
              ? t('platform_icon_telegram')
              : variant === 'feishu'
                ? t('platform_icon_feishu')
                : t('platform_icon_unsupported');

  // mock + unsupported: muted ink token (adapts to theme)
  // openclaw: brand gradient (hardcoded, not tokenized)
  // discord: ink-base (adapts; respects host text color via currentColor inheritance)
  const colorClass =
    variant === 'unsupported' || variant === 'mock'
      ? 'text-[var(--color-ink-muted)]'
      : 'text-[var(--color-ink-base)]';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
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
      {variant === 'slack' && (
        <g stroke="none">
          <path
            fill="currentColor"
            d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.53 2.53 0 0 1 2.523 2.522A2.53 2.53 0 0 1 15.163 24a2.528 2.528 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.528 2.528 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.53 2.53 0 0 1-2.522 2.523h-6.315z"
          />
        </g>
      )}
      {variant === 'telegram' && (
        <g stroke="none">
          <path
            fill="currentColor"
            d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
          />
        </g>
      )}
      {variant === 'feishu' && (
        <g stroke="none">
          <path
            fill="currentColor"
            d="M12 2C8.5 2 5 4.5 5 8.5c0 2.5 1.5 4.5 3 5.5.5.5 1 1.5 1 2.5v1c0 1 1 2 2 2h2c1 0 2-1 2-2v-1c0-1 .5-2 1-2.5 1.5-1 3-3 3-5.5C19 4.5 15.5 2 12 2zm-1 3a1 1 0 110 2 1 1 0 010-2zm2 0a1 1 0 110 2 1 1 0 010-2zm-1 4c-1.5 0-3 .5-3 1.5s1.5 1.5 3 1.5 3-.5 3-1.5-1.5-1.5-3-1.5z"
          />
        </g>
      )}
    </svg>
  );
}
