English | [简体中文](./STORE-LISTING.md)

# web2chat -- Chrome Web Store Listing

## Short Description

This field is the `manifest.json` `description`, already set via i18n locale. Current en value:

```text
One-click clip-and-send to your favorite IM or AI agent chat.
```

(Within the 132-character limit. Source: `locales/en.yml` -> `extension_description`.)

## Detailed Description (plain text, ready to paste into Developer Dashboard)

```text
web2chat is a local-first Chrome MV3 web clipper that helps you send structured information from the current web page, together with your own prompt, to supported IM or AI agent web chat sessions.

After you click the toolbar icon, web2chat captures the current page title, URL, description, captured time, and readable content. It sanitizes the content and converts it to Markdown. You can preview and edit the captured content in the popup, add a custom prompt, and send the composed message to a configured target session.

1. How it works

1) Capture
- Click the toolbar icon to extract the current page content.
- Extraction uses Readability.
- Sanitization uses DOMPurify.
- Markdown conversion uses Turndown.

2) Edit
- Preview the title, description, and body in the popup.
- Edit the captured result before sending.
- Add a custom prompt as an instruction for the downstream chat or AI agent.

3) Deliver
- Choose a target session.
- web2chat opens or focuses the target chat page.
- It inserts the formatted message into the target input box and sends it.

2. Supported platforms

- OpenClaw Web UI
  Supports user-hosted OpenClaw instances. After you configure an instance URL, the extension requests access only to that specific origin at runtime.

- Discord Web
  Sends messages to Discord channel URLs. You must be signed in to Discord in the same browser profile.

- Slack Web
  Sends messages to Slack channel URLs. You must be signed in to Slack in the same browser profile.

- Telegram Web
  Sends messages to Telegram Web chat URLs. You must be signed in to Telegram Web in the same browser profile.

3. Key features

- Smart page extraction
  Captures title, URL, description, captured time, and readable body content, then outputs clean Markdown.

- Custom prompts
  Combines captured page content with your own instruction before sending.

- Target history
  Saves frequently used send_to targets with most-recently-used sorting.

- Prompt bindings
  Saves a prompt for each target session and automatically restores it when switching targets.

- Draft recovery
  Recovers unsent edits after closing the popup.

- Low-confidence confirmation
  Asks for confirmation before sending when the target input selector is less stable.

- Login and timeout feedback
  Shows retryable errors when the target platform is not signed in or takes too long to respond.

- Bilingual UI
  Supports English and Chinese.

- Local-first privacy model
  Settings and history stay in local Chrome extension storage. web2chat does not operate a backend service, does not upload clipped content, does not sell data, and does not use telemetry, third-party analytics, or advertising SDKs.

4. Privacy

- web2chat processes the current active tab only after you explicitly click the extension.
- It inserts the composed message into the selected target chat page only after you confirm the dispatch.
- Captured content, prompts, target history, and settings are stored only in local Chrome extension storage.
- web2chat does not operate a backend service, does not upload clipped content, does not sell data, and does not use advertising or analytics SDKs.

5. Notes

- Discord, Slack, and Telegram delivery is performed through DOM injection in your local browser session.
- This is a form of browser automation and may be subject to each platform's terms of service.
- Use it only with accounts, workspaces, channels, or chats that you are authorized to use.
```

## Dashboard Fields Reference (Manual)

### Category

Recommended: Productivity

### Permissions Justification

Text for each permission to enter in the Chrome Web Store Developer Dashboard:

```text
activeTab: Used only after the user clicks the extension to access the current active tab and extract the page title, URL, description, and readable content.

scripting: Used to run the page extractor in the active tab and inject platform-specific sending adapters into the user-selected target chat page.

storage: Used to store user settings, target history, prompt history, prompt bindings, and dispatch state locally.

webNavigation: Used to observe SPA route changes and page loading state on target chat pages, so the extension can inject the sending adapter at the correct time and handle login or redirect flows.

alarms: Used to manage timeout timers for the dispatch state machine, preventing dispatches from hanging indefinitely.

host permissions: Limited to supported public platform domains (Discord, Slack, and Telegram). Used to detect target page readiness and insert the composed message into user-selected chat pages.

optional host permissions: Used for user-configured self-hosted OpenClaw or custom destinations. The extension requests access only to the specific origin at runtime; it does not get access to all websites by default.
```

### Single Purpose Description

```text
web2chat lets users capture structured information from the current web page and send it, together with a user-defined prompt, to a supported chat or AI agent web session selected by the user.
```

### Privacy Policy URL

```text
https://github.com/seven-steven/web2chat/blob/main/PRIVACY.md
```

### Homepage / Support URLs

```text
Homepage / Official URL: https://seven-steven.github.io/web2chat/
Support URL: https://github.com/seven-steven/web2chat/issues
```

### Privacy Practices Labels

In the Chrome Web Store Developer Dashboard "Privacy practices" section, declare the following:

```text
Data categories: Website content; Web browsing activity (current active tab URL only; not full browsing history); User-provided content (prompt, target session URL, and user edits).

Data usage: Functionality. The data is used to compose and deliver the current page information and the user's prompt to the user-selected chat or AI agent session.

Data storage: Local only (chrome.storage.local / chrome.storage.session).

Data sharing: No selling, no transfer to data brokers, no advertising use, no creditworthiness use, and no upload to developer servers. Data sent by the user to a third-party chat platform is then handled under that platform's own policies.

Remote code: No. All executable JavaScript is packaged with the extension.
```
