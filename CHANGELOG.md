# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0]

### Added
- **TeraBox: collect individual files and folders.** On a TeraBox share page (`terabox.com`, `1024tera.com`, ... mirrors), highlight one or more file or folder names in the file list (or in the folder tree on the left), right-click and choose *Extract links with KKAFIO Link Collector*. One link per item is saved, in the form `…/sharing/link?surl=<id>&path=<path of the item>`; KKAFIO's Download Contents downloads just that file (or that folder). The path is read from the page (the folder tree, or the breadcrumbs, whose root label may be in any language), because TeraBox's address bar does not change while browsing folders.
- TeraBox domains are allowed for right-click extraction, so highlighted TeraBox share links are collected too.

## [1.1.0]

### Added
- Base64 (and nested Base64) encoded links are decoded on right-click extraction.
- URLs in element attributes (`onclick`, `data-*`, ...) are extracted from highlighted buttons and other elements.
- Right-click a button directly on `kknow.cc` to extract its link, without highlighting anything.

### Fixed
- Pixiv `jump.php` redirect links no longer produce a duplicate entry; they are unwrapped to the real URL.

## [1.0.0]

Earlier release. See the project's GitHub history for details.
