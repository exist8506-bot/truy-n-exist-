# Changelog

## 1.6.6
- Stage 2 Part 5: reader navigation and performance improvements.
- Added in-flight chapter request deduplication and next-chapter prefetch into IndexedDB.
- Preserved exact reading position when reopening the same chapter.
- Reader progress is persisted on page hide and marks a chapter complete near the end.
- Existing keyboard, swipe, TTS, theme, font and offline reader behavior remains intact.


## 1.6.5
- Stage 2 Part 4: resilient bookcase/account synchronization.
- Local favorites are preserved and merged with server favorites after sign-in.
- Reading progress uses server timestamps when merging local and remote state.
- Pending local changes are pushed after restore and automatically retried when the browser returns online.
- Favorite changes remain local when the API is temporarily unavailable and are retried later.


## 1.6.4
- Stage 2 Part 3: expanded discovery sections for Explore, Reading, Ranking and Recently Updated.
- Reading mode uses local/server-synced progress to surface unfinished stories.
- Recently Updated sorts by server update timestamps.
- Ranking and discovery cards keep the existing reader/bookcase flow.


## 1.6.3
- Stage 2 Part 2: server-side advanced library search.
- Filter by title/author query, category and status through SQLite API.
- Added category/status controls and debounced remote search in the library.
- Search results stay paginated at the API boundary (up to 100 results per request).


## 1.6.2
- Stage 2 Part 1: account UI replaces prompt-based login/register/profile flow.
- Register, login, profile update and logout are handled in one modal UI.
- Vietnamese account validation/error messages are shown inline.
- Library pagination now uses the API item count and continues through all pages.


## 1.6.0
- Phase 1 reader/product polish.
- Bookmarks and chapter sharing.
- Reader keyboard shortcuts.
- Deep-link chapter reading.
- Account sync for favorites/progress/history.
- Online/offline status and PWA install support.
- Admin dashboard, import, backup/restore, diagnostics and renumbering.
