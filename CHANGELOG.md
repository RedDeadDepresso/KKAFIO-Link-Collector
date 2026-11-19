# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0]

### Added
- TeraBox share pages: a collect button on every file/folder row, and a floating **Collect link** button on the single-file view.
- Gofile folders: a **+** collect button on every file row (links are saved as `gofile.io/d/CODE#FILEID`).
- koikatsucards.com: hides ads, blocks pop-under tabs, and no longer adds a **+** to ad links.
- Pixiv: thumbnails of posts that exist on koikatsucards.com get a small **KK** badge linking to the post.
- Pixiv artwork and artist pages: links to the artist's koikatsucards.com author page, Bepis author page(s) and Pawchive creator, when they are known.
- The lookup data (`lookup.json`, from [kk-author-scraper](https://github.com/RedDeadDepresso/kk-author-scraper)) is downloaded in the background at most twice a day and stored locally.
- Pixiv images (`pximg.net`) shown on [kk-authors](https://reddeaddepresso.github.io/kk-authors/) are no longer blocked: the extension sets the `Referer` header to `https://www.pixiv.net/` for those image requests only.

### Changed
- New host permission: `reddeaddepresso.github.io/kk-author-scraper/indices/lookup.json` (only used to download `lookup.json`).
- New permission `declarativeNetRequest`, with host access to `*.pximg.net` and `reddeaddepresso.github.io`, used to set the `Referer` header on Pixiv images requested by kk-authors, and to redirect `kk.now.cc` (and subdomains) to `kknow.cc`.
- The `kk.now.cc` → `kknow.cc` redirect now uses declarativeNetRequest instead of a content script, so it happens before the page loads. Host access to `kk.now.cc` was added for this.

## [1.1.0]

### Added
- Base64 (and nested Base64) encoded links are decoded on right-click extraction.
- URLs in element attributes (`onclick`, `data-*`, ...) are extracted from highlighted buttons and other elements.
- Right-click a button directly on `kknow.cc` to extract its link, without highlighting anything.

### Fixed
- Pixiv `jump.php` redirect links no longer produce a duplicate entry; they are unwrapped to the real URL.

## [1.0.0]

Earlier release. See the project's GitHub history for details.
