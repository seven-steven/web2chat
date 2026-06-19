English | [简体中文](./PRIVACY.zh_CN.md)

# web2chat Privacy Policy

**Last updated:** 2026-06-18

web2chat is a local-first Chrome MV3 web clipper. It helps you capture structured information from the current web page and send it, together with your own prompt, to a supported chat or AI agent web session that you choose.

web2chat does not operate a backend service and does not receive, store, sell, or analyze your clipped page content.

## Data We Process

When you use web2chat to clip a web page, we process the following data fields from the current active browser tab:

- `url` -- the URL of the page you clip
- `title` -- the page title
- `description` -- the page description, extracted from meta tags or a Readability-generated excerpt
- `content` -- the readable page content, extracted by Readability, sanitized by DOMPurify, and converted to Markdown by Turndown
- `prompt` -- your user-defined prompt text
- `create_at` -- the timestamp of when you initiated the clip
- `send_to` / target URL -- the chat or AI agent session URL that you choose as the destination
- local history and bindings -- target history, prompt history, and prompt-to-target bindings that make repeated dispatches easier
- dispatch state -- temporary state used to complete or retry a dispatch flow

We process page content only after you explicitly click the extension. We do not collect data passively in the background.

## How Data Is Stored

Data is stored on your local device using Chrome extension storage APIs:

- `chrome.storage.local` -- persistent local storage for settings, target history, prompt history, prompt bindings, and granted-origin records
- `chrome.storage.session` -- temporary session storage for dispatch state and in-progress workflow data

No clipped page content, prompt, target history, or settings are stored on a web2chat remote server. web2chat does not sync this data to the cloud.

## How Data Is Transmitted

Data is transmitted only when you explicitly confirm a dispatch to a target IM or AI chat session. The dispatch process works as follows:

1. You choose or enter a target chat session URL and confirm the dispatch.
2. The extension opens or activates the target page in a browser tab.
3. The extension inserts the composed message into the target page through DOM interaction.
4. The target service receives the message because you chose to send it there.

web2chat does not send clipped content to a developer-operated server or API endpoint. Delivery happens through your local browser tab and the target service you selected.

## Third-Party Services

web2chat can deliver content to supported third-party or self-hosted targets, currently including OpenClaw Web UI, Discord Web, Slack Web, and Telegram Web.

When you choose to send content to a third-party chat platform, that platform may process the message under its own terms and privacy policy. web2chat does not control those third-party services.

web2chat does not integrate with any third-party analytics, tracking, telemetry, or advertising service.

## Data We Do NOT Collect or Use

web2chat does not:

- operate or communicate with a developer-controlled backend service for clipped content
- collect data before you interact with the extension
- read your full browsing history
- read your chat history from target platforms
- store or request API keys
- use cookies, web beacons, analytics SDKs, telemetry SDKs, or advertising SDKs
- sell user data
- transfer user data to data brokers
- use user data for advertising or personalized ads
- use user data for creditworthiness or lending purposes
- sync clipped data to cloud storage

## Permissions

web2chat requests only the permissions needed for its single purpose:

- `activeTab` -- access the current active tab after user interaction to extract page title, URL, description, and readable content
- `scripting` -- run the page extractor and inject platform-specific sending adapters into user-selected target chat pages
- `storage` -- store settings, target history, prompt history, prompt bindings, granted origins, and dispatch state locally
- `webNavigation` -- observe loading and SPA navigation state on supported target pages so dispatch can resume at the correct time
- `alarms` -- manage timeout timers for dispatch workflows
- `host_permissions` -- access supported public target platform domains when the user chooses to dispatch to those platforms
- `optional_host_permissions` -- request access at runtime only for a specific self-hosted OpenClaw or custom destination origin configured by the user

The extension does not get access to all websites by default. Optional host permissions are requested only for specific origins when needed.

## Your Control Over Data

You have control over locally stored web2chat data:

- You can clear stored history and bindings via the extension settings page.
- You can revoke granted origin permissions via the extension settings page or Chrome extension settings.
- You can remove the extension to delete its local extension storage.

## Limited Use Commitment

web2chat uses processed data only to provide or improve its single purpose: helping you send current page information and your prompt to a supported chat or AI agent session that you select.

web2chat follows the Chrome Web Store User Data Policy, including the Limited Use requirements. We do not sell, transfer, or use user data for unrelated purposes.

## Changes to This Policy

If this privacy policy changes, updates will be reflected in this file. The full revision history is available in the public GitHub repository.

## Contact

If you have questions or concerns about this privacy policy, please open an issue on the [web2chat GitHub repository](https://github.com/seven-steven/web2chat).
