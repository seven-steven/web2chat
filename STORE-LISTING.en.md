English | [简体中文](./STORE-LISTING.md)

# Web2Chat -- Chrome Web Store Listing

## Short Description

This field is the `manifest.json` `description`, already set via i18n locale. Current en value:

> One-click clip-and-send to your favorite IM or AI agent chat.

(Within the 132-character limit. Source: `locales/en.yml` -> `extension_description`.)

## Detailed Description

Web2Chat is a Chrome extension built for AI Agent collaboration and automated IM delivery.

With a single click, Web2Chat captures structured page information (title, URL, description, body content), converts it to clean Markdown, pairs it with your custom prompt, and delivers it to a target IM or AI Agent chat session.

### How It Works

1. **Capture** -- Click the toolbar icon to extract page content (Readability + DOMPurify + Turndown)
2. **Edit** -- Preview and edit the title, description, and body in the popup; attach a custom prompt
3. **Deliver** -- Choose a target session (OpenClaw / Discord) and send the formatted message

### Supported Platforms

- **OpenClaw Web UI** -- Self-hosted AI Agent platform. Configure your instance URL and start using it
- **Discord** -- Deliver messages to channels. Paste a channel URL to get started

### Key Features

- Smart page content extraction (Readability + DOMPurify + Turndown -- outputs clean Markdown)
- Custom prompts bound to target sessions; switching targets auto-switches the prompt
- Delivery history with most-recently-used sorting for quick re-delivery
- Draft recovery -- closing the popup does not lose your edits
- Bilingual interface (English / Chinese)
- All data stays local -- no cloud services, no telemetry, no third-party analytics

### Privacy

Web2Chat does not upload any data to remote servers. Captured page information and user settings are stored only in the browser's local storage (chrome.storage.local / .session). Delivery happens through direct browser tab navigation to the target session.

## Dashboard Fields Reference (Manual)

### Category

Recommended: **Productivity**

### Permissions Justification

Text for each permission to enter in the CWS developer dashboard:

- **`activeTab`** -- Reads the current active tab's content to extract the page title, URL, description, and body text
- **`scripting`** -- Injects content scripts into target pages to automate message delivery to IM or AI Agent chat sessions
- **`storage`** -- Stores the user's delivery target history, prompt bindings, and extension settings
- **`webNavigation`** -- Monitors target page SPA route changes to inject the delivery script at the correct moment
- **`alarms`** -- Manages timeout timers for the delivery state machine, ensuring dispatches do not hang indefinitely
- **`host_permissions (discord.com)`** -- Injects the message delivery script into Discord channel pages

### Single Purpose Description

> Captures structured web page information and delivers it with a user-defined prompt to a target IM or AI Agent chat session in one click.

### Privacy Policy URL

```
https://github.com/<owner>/web2chat/blob/main/PRIVACY.md
```

(Replace `<owner>` with the actual GitHub username or organization.)

### Privacy Practices Labels

In the CWS dashboard "Privacy Practices" tab, declare the following:

- **Data collected**: Web browsing activity (current tab URL), User-generated content (title / description / body / prompt)
- **Data usage**: Functionality (compose and deliver messages to target IM or AI Agent sessions)
- **Data storage**: Local only (chrome.storage.local / .session)
- **Data sharing**: None
- **Remote code**: No
