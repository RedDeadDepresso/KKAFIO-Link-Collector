# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0]

### Added
- Gofile folders: a **+** collect button on every file row (links are saved as `gofile.io/d/CODE#FILEID`).

## [1.2.0]

### Added
- TeraBox share pages: a collect button on every file/folder row, and a floating **Collect link** button on the single-file view.

## [1.1.0]

### Added
- Base64 (and nested Base64) encoded links are decoded on right-click extraction.
- URLs in element attributes (`onclick`, `data-*`, ...) are extracted from highlighted buttons and other elements.
- Right-click a button directly on `kknow.cc` to extract its link, without highlighting anything.

### Fixed
- Pixiv `jump.php` redirect links no longer produce a duplicate entry; they are unwrapped to the real URL.

## [1.0.0]

Earlier release. See the project's GitHub history for details.
