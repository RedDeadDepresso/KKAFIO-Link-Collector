# KKAFIO Link Collector

A browser extension that adds a **collect** button to posts on several art and card sites. Click it to store the post's link, then copy everything at once and paste them into the "Download Contents Links" text box in KKAFIO.

Everything is stored locally in your browser. The extension makes no network requests and sends nothing anywhere.

## Features

- **+ button on every post thumbnail** (turns into a green **✓** once collected; click again to remove).
- **Floating "Collect link" button** on individual post pages.
- **Popup list** of collected links with *Copy all*, *Copy & clear*, *Clear* and per-link remove.
- **Right-click extraction**: highlight text or right-click a hyperlink and choose *Extract links with KKAFIO Link Collector*. It reads real `<a href>` links and plain-text URLs.
- **Duplicates are skipped** automatically.
- **Translations**: English, 简体中文, 繁體中文, 日本語, 한국어, Русский (follows the browser language).

## Supported sites

| Site | Collect buttons | Right-click extraction |
|---|---|---|
| pixiv.net | ✅ `/artworks/ID` | ✅ |
| pawchive.pw | ✅ `/SERVICE/user/ID` and `/SERVICE/user/ID/post/ID` | ✅ |
| koikatsucards.com | ✅ (any image link; see notes) | ✅ |
| db.bepis.moe | ✅ `/GAME/view/ID` | ✅ |
| any other site | – | ✅ for allowed domains only |

Right-click extraction keeps only links on these domains (and their subdomains): `pixiv.net`, `pawchive.pw`, `koikatsucards.com`, `bepis.moe`, `gofile.io`, `mega.nz`, `mega.io`, `mega.co.nz`, `drive.google.com`, `drive.usercontent.google.com`, `files.catbox.moe`.

## Installation

### Chrome / Edge / Brave
1. Unzip the project.
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder (the one containing `manifest.json`).

### Firefox
- **Temporary (until restart):** open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…** → select `manifest.json`.
- **Permanent:** submit the zip as an *unlisted* add-on at <https://addons.mozilla.org/developers/> to get a signed `.xpi`, then open it in Firefox. The add-on ID is already set in `manifest.json` (`kkafio-link-collector@RedDeadDepresso`).

After updating the files, reload the extension from the same page.

## Usage

1. Browse a supported site and click **+** on a post thumbnail, or use the floating **Collect link** button on a post page.
2. Click the extension icon to see the collected links.
3. Press **Copy all** (one link per line) and paste into your downloader. **Copy & clear** also empties the list.

For other pages: highlight text containing links (or right-click a hyperlink) → **Extract links with KKAFIO Link Collector**. The toolbar badge shows `+N` for links added, `dup` if all were already collected, or `0` if none matched the allowed domains.

## Configuration

| What | Where |
|---|---|
| Sites that get collect buttons and their URL patterns | `SITES` list at the top of `content.js` |
| Sites the extension runs on | `content_scripts.matches` in `manifest.json` |
| Domains allowed for right-click extraction | `ALLOWED_DOMAINS` at the top of `background.js` |
| UI text | `_locales/<code>/messages.json` |

To support a new site, add an entry to `SITES` (a `host` regex and a `match` function that returns the canonical post URL, or `null`) and add its domain to `manifest.json`.

To add a language, copy `_locales/en` to a new folder named with the locale code (for example `de` or `pt_BR`) and translate the `message` values. Keep the keys and the `$COUNT$` placeholder as they are.

## Project structure

```
manifest.json        Extension manifest (Manifest V3)
background.js        Right-click menu and link extraction
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
| Site access (`matches`) | Show the collect buttons on the supported sites only |

## Notes and limitations

- Buttons are drawn in a separate overlay on top of the page, rather than inside the site's own elements. This avoids breaking sites built with frameworks like React (such as Pixiv).
- Translations were written without a native-speaker review; corrections are welcome.
