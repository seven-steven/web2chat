# Web2Chat Privacy Policy

**Last updated:** 2026-05-07

## Data We Collect

When you use Web2Chat to clip a web page, we process the following data fields from the active browser tab:

- `url` -- the URL of the page you clip
- `title` -- the page title
- `description` -- the page description (extracted from meta tags or a Readability-generated excerpt)
- `content` -- the page content (extracted by Readability, sanitized by DOMPurify, and converted to Markdown by Turndown)
- `prompt` -- your user-defined prompt text
- `create_at` -- the timestamp of when you initiated the clip

We collect this data **only when you click the extension icon**. We do not collect any data passively or in the background.

## How Data Is Stored

All data is stored exclusively on your local device using browser storage APIs:

- `chrome.storage.local` -- persistent storage that retains data across browser sessions
- `chrome.storage.session` -- temporary storage that is cleared when the browser is closed

No data is stored on any remote server. No data is synced to the cloud.

## How Data Is Transmitted

Data is transmitted **only when you explicitly confirm a dispatch** to a target IM or AI chat session. The transmission process works as follows:

1. You select a target chat session URL and confirm the dispatch
2. The extension opens or activates the target page in a browser tab
3. The extension injects your composed message into the target page via DOM interaction

No data is sent to any server, API endpoint, or third-party service at any time. All transmission occurs through direct browser tab navigation.

## Data We Do NOT Collect

We want to be explicit about what Web2Chat does **not** do:

- We do not operate or communicate with any remote server
- We do not use any third-party analytics, tracking, or telemetry SDK
- We do not store or request any API keys
- We do not use cookies or web beacons
- We do not serve advertisements or use ad tracking
- We do not sync data to the cloud or any external storage
- We do not collect browsing history beyond the current active tab when you click the extension icon

## Third-Party Services

Web2Chat does not integrate with any third-party services for data collection, analytics, or advertising. The extension operates entirely within your browser.

## Your Control Over Data

You have full control over all data stored by Web2Chat:

- You can clear all stored data via the extension's Settings page ("Reset all history")
- You can revoke granted permissions for specific origins via the Settings page
- Uninstalling the extension removes all stored data immediately

## Changes to This Policy

If this privacy policy changes, updates will be reflected in this file. The full revision history is available in the public GitHub repository.

## Contact

If you have questions or concerns about this privacy policy, please open an issue on the [Web2Chat GitHub repository](https://github.com/nicholaschenai/web2chat).
