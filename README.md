# KKAFIO Link Collector

A browser extension that adds a **collect** button to posts on several art and card sites. Click it to store the post's link, then copy everything at once and paste them into the "Download Contents Links" text box in KKAFIO.

Everything is stored locally in your browser. The extension makes no network requests and sends nothing anywhere.

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Features

- **+ button on every post thumbnail** (turns into a green **✓** once collected; click again to remove).
- **Floating "Collect link" button** on individual post pages.
- **Popup list** of collected links with *Copy all*, *Copy & clear*, *Clear* and per-link remove.
- **Right-click extraction**: highlight text or right-click a hyperlink and choose *Extract links with KKAFIO Link Collector*. It reads real `<a href>` links and plain-text URLs.
  - **Pixiv redirect links are unwrapped**: `pixiv.net/jump.php?<encoded url>` links are converted back to the real URL, so a link in a description or hyperlink is saved once, not as both the wrapper and the real link.
  - **Base64-encoded links are decoded**: highlight text such as `aHR0cHM6Ly9nb2ZpbGUuaW8vZC9qcFB3QkRoWA==` (also double-encoded) and it is saved as the decoded URL, if the domain is allowed.
  - **Links inside buttons and other elements**: URLs in attributes such as `onclick="window.open('…')"` or `data-href` are found when the element is part of your selection.
  - **Right-click a button directly** (no highlighting needed) on `kknow.cc`.
- **Duplicates are skipped** automatically.
- **Translations**: English, 简体中文, 繁體中文, 日本語, 한국어, Русский (follows the browser language).

## Supported sites

| Site | Collect buttons | Right-click extraction |
|---|---|---|
| pixiv.net | ✅ `/artworks/ID` | ✅ |
| pawchive.pw | ✅ `/SERVICE/user/ID` and `/SERVICE/user/ID/post/ID` | ✅ |
| koikatsucards.com | ✅ (any image link; see notes) | ✅ |
| db.bepis.moe | ✅ `/GAME/view/ID` | ✅ |
| mega.nz | ✅ floating button on `/file/…#key`, `/folder/…#key` | ✅ |
| gofile.io | ✅ **+** on every file row, plus floating button on `/d/ID` | ✅ |
| drive.google.com | ✅ **+** on every file/folder row (list and grid view), plus floating button on files and folders | ✅ |
| pixeldrain.com | ✅ **+** on every album tile and every file inside an archive listing, plus floating button on `/u/ID`, `/l/ID` and the selected album file | ✅ |
| catbox.moe | ✅ floating button on `files.catbox.moe/…` and `/c/ID` | ✅ |
| kknow.cc | – | ✅ including right-clicking a button directly |
| any other site | – | ✅ for allowed domains only |

Right-click extraction keeps only links on these domains (and their subdomains): `pixiv.net`, `pawchive.pw`, `koikatsucards.com`, `bepis.moe`, `gofile.io`, `mega.nz`, `mega.io`, `mega.co.nz`, `drive.google.com`, `drive.usercontent.google.com`, `catbox.moe`, `pixeldrain.com`.

## Installation

### Chrome / Edge / Brave
1. Unzip the project.
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).

### Firefox
- **Temporary (until restart):** open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select `manifest.json`.
- **Permanent:** submit the zip as an *unlisted* add-on at <https://addons.mozilla.org/developers/> to get a signed `.xpi`, then open it in Firefox. The add-on ID is already set in `manifest.json` (`kkafio-link-collector@RedDeadDepresso`).

After updating the files, reload the extension from the same page.

> **Tip:** pin the extension to the toolbar (puzzle-piece icon → pin). The popup is then one click away, and the icon, with the badge showing your total number of collected links, is always visible.

## Usage

1. Browse a supported site and click **+** on a post thumbnail, or use the floating **Collect link** button on a post page.
2. Click the extension icon to see the collected links.
3. Press **Copy all** (one link per line) and paste into your downloader. **Copy & clear** also empties the list.

For other pages: highlight text containing links (or right-click a hyperlink) → **Extract links with KKAFIO Link Collector**. The same works for a highlighted button, Base64-encoded text, or Pixiv description links. On `kknow.cc` you can also right-click a button without highlighting anything. The toolbar badge normally shows the total number of collected links; after an extraction it briefly shows `+N` for links added, `dup` if all were already collected, or `0` if none matched the allowed domains.

## Configuration

| What | Where |
|---|---|
| Sites that get collect buttons and their URL patterns | `SITES` list at the top of `content.js` |
| Sites the extension runs on | `content_scripts.matches` in `manifest.json` |
| Sites where right-clicking a button works without highlighting | the `target.js` entry in `content_scripts.matches` and `documentUrlPatterns` in `createMenu()` in `background.js` (both currently `kknow.cc`) |
| Domains allowed for right-click extraction | `ALLOWED_DOMAINS` at the top of `background.js` |
| UI text | `_locales/<code>/messages.json` |

To support a new site, add an entry to `SITES` (a `host` regex and a `match` function that returns the canonical post URL, or `null`) and add its domain to `manifest.json`.

To add a language, copy `_locales/en` to a new folder named with the locale code (for example `de` or `pt_BR`) and translate the `message` values. Keep the keys and the `$COUNT$` placeholder as they are.

## Project structure

```
manifest.json        Extension manifest (Manifest V3)
background.js        Right-click menu and link extraction (Pixiv unwrapping, Base64 decoding, attribute scan)
target.js            Remembers the right-clicked element on kknow.cc so buttons can be extracted directly
content.js           Collect buttons injected into supported sites
content.css          Button styles
popup.html/js/css    Toolbar popup with the link list
i18n.js              Translation helper with built-in English fallback
icons/               Extension icons (16, 32, 48, 128 px)
_locales/            Translations
```

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save the collected links locally |
| `contextMenus` | Add the right-click option |
| `activeTab`, `scripting` | Read your text selection when you use the right-click option |
| Site access (`matches`) | Show the collect buttons on the supported sites only, and track the right-clicked element on `kknow.cc` |

## Notes and limitations

- Buttons are drawn in a separate overlay on top of the page, rather than inside the site's own elements. This avoids breaking sites built with frameworks like React (such as Pixiv).
- URLs that a page builds with JavaScript at click time (for example `window.open(atob(...))`) are not in the HTML and cannot be extracted.
- Base64 decoding only applies to highlighted text; encoded values hidden inside element attributes are not decoded.
- If a site splits one encoded string across several lines, copy it onto one line before extracting.
- Translations were written without a native-speaker review; corrections are welcome.
