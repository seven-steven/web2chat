English | [简体中文](./README.md)

# web2chat

> One-click clip and send structured web page info + custom prompt to IM / AI Agent chat sessions. Chrome MV3 extension.

## Introduction

web2chat is a Chrome extension that helps users quickly deliver structured web page information to IM or AI Agent chat sessions.

**Core features:**

- Click the toolbar icon to automatically capture current page metadata (title / url / description / content)
- Content is sanitized by DOMPurify and converted to Markdown
- Combine with a custom prompt and deliver to the target chat session in one click

**Supported platforms:** OpenClaw Web UI, Discord

**Privacy:** All data is stored locally in `chrome.storage.local` only. Nothing is uploaded to any server. See [Privacy](#privacy) section.

## Design Intent

web2chat was originally designed for the [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) pattern — conveniently sending web page information through common IM tools (Discord, Feishu, Lark, Google Chat, LINE, Microsoft Teams, Nextcloud Talk, Signal, Slack, Telegram, WhatsApp, Zalo, QQ, WeCom) to AI Agent platforms like openclaw and hermes-agent that host llm-wiki knowledge bases. During implementation, the project evolved into a general-purpose web-to-chat delivery tool.

## Installation

### Load Unpacked (from source)

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd web2chat
   pnpm install
   ```

2. Build the production version:

   ```bash
   pnpm build
   ```

3. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode** in the top right
   - Click **Load unpacked** and select the `.output/chrome-mv3/` directory
4. The web2chat icon appears in the toolbar

### Chrome Web Store

[web2chat - Chrome Web Store](https://chromewebstore.google.com/detail/web2chat/kglpjocckfgpephljffgkamnfpnmkdnc)

## Usage

1. Click the web2chat toolbar icon (or press `Ctrl+Shift+S` / `Cmd+Shift+S`)
2. The popup automatically captures current page information and shows a preview
3. Edit title, description, or content as needed
4. Enter the `send_to` target URL (supports history dropdown with prompt binding)
5. Enter a prompt (optional)
6. Click confirm to dispatch

## Platform Notes

### OpenClaw

- URL format: `http(s)://<host>:<port>/chat?session=agent:<name>:<session>`
- Requires OpenClaw service running locally or on an accessible network
- The extension will request access permission for the origin on first use
- Manage authorized origins in the extension options page

### Discord

- URL format: `https://discord.com/channels/<server>/<channel>`
- Requires being logged into Discord in the same browser profile

**ToS Risk Notice:** web2chat uses DOM injection to send messages to Discord. This constitutes automation and may violate the [Discord Terms of Service](https://discord.com/terms). By using this feature, you acknowledge and accept any associated account risks (including but not limited to temporary restrictions or bans). The developer assumes no responsibility for Discord account issues caused by use of this extension.

## Limitations

- Chrome / Chromium browsers only (Firefox / Safari planned)
- OpenClaw and Discord platforms only (Telegram / Slack etc. planned)
- Long content truncated to 2000 characters per message (multi-message splitting planned)
- No failure retry queue (planned)
- Discord dispatch uses DOM injection with ToS risk (see Platform Notes above)

## Development

**Prerequisites:** Node.js >= 20.19, pnpm 10.x, Chrome / Chromium

```bash
pnpm install          # Install dependencies
pnpm dev              # Development mode (HMR)
pnpm build            # Production build
pnpm test             # Unit tests
pnpm test:e2e         # E2E tests (requires headed Chromium)
pnpm typecheck        # Type checking
pnpm lint             # ESLint
pnpm verify:manifest  # Manifest shape verification
pnpm verify:zip       # Zip structure verification
```

Tech stack: WXT 0.20 + Preact + TypeScript + Tailwind v4 + Vitest + Playwright

## Privacy

web2chat does not collect or upload any user data. All captured content is stored locally in the browser and delivered to target sessions directly through browser tabs.

See [Privacy Policy](./PRIVACY.md)
