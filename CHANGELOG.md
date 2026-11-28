# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0]

### Added
- Pixiv thumbnails: **KK** badge for posts on koikatsucards.com, and **TG** badge for posts seen in a Telegram chat.
- Pixiv artwork and artist pages: chips linking to the artist's koikatsucards.com, Bepis and Pawchive pages, and to the Telegram message where the post or artist was seen (when known).
- Pixiv artwork and artist pages: **Telegram** and **KKnow** search chips (post link on artwork pages, artist name on artist pages).
- Telegram links and searches (**TG** badge, Telegram chips, kk-authors buttons) open directly in Telegram Web K and reuse an already open Telegram Web tab.
- Telegram Web: a **+** button on channel and supergroup messages collects the message link.
- [kk-authors](https://reddeaddepresso.github.io/kk-authors/): the **Telegram** buttons on author cards search Telegram Web for the author.
- TeraBox share pages: collect button on every file/folder row, and a floating **Collect link** button on single files.
- Gofile folders: collect button on every file row.
- koikatsucards.com: hides ads, blocks pop-under tabs, and no longer adds a **+** to ad links.
- Pixiv images shown on kk-authors are no longer blocked (the `Referer` header is set for those requests only).
- `lookup.json` ([kk-author-scraper](https://github.com/RedDeadDepresso/kk-author-scraper)) is downloaded at most twice a day and stored locally.
- Pawchive: a 🔑 button next to the **+** on post cards and post pages shows the archive password on hover and copies it on click. The data is `posts.json` from [kk-password-scraper](https://github.com/RedDeadDepresso/kk-password-scraper), downloaded at most every 6 hours and stored locally.

### Changed
- `kk.now.cc` (and subdomains) now redirect to `kknow.cc` before the page loads, using declarativeNetRequest instead of a content script.
- New permissions: `declarativeNetRequest`, and host access to `*.pximg.net`, `reddeaddepresso.github.io`, `kk.now.cc` and `web.telegram.org`.
- New content scripts on `web.telegram.org` and kk-authors only read the search text saved when you click a Telegram button (stored locally, valid for 5 minutes, removed after use).

## [1.1.0]

### Added
- Base64 (and nested Base64) encoded links are decoded on right-click extraction.
- URLs in element attributes (`onclick`, `data-*`, ...) are extracted from highlighted buttons and other elements.
- Right-click a button directly on `kknow.cc` to extract its link, without highlighting anything.

### Fixed
- Pixiv `jump.php` redirect links no longer produce a duplicate entry; they are unwrapped to the real URL.

## [1.0.0]

Earlier release. See the project's GitHub history for details.
