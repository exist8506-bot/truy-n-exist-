## 1.15.0
- Account password management.
- Other sessions are revoked after password change.
- GitHub Pages static preview workflow.

## 1.14.0
- Reader chapter seek control.
- Reading progress now preserves chapter-local position while showing overall chapter progress.

## 1.13.0
- Paginated remote library results.
- Search/filter/sort state is preserved between pages.

## 1.12.0
- Bookmark filtering.
- Quick bookmark removal with account synchronization.

## 1.11.0
- Account-synced chapter bookmarks.
- Bookcase bookmark list.

# Changelog

## 1.10.0
- Reader UX: server-side chapter ordering for paginated lists.
- Reader navigation now uses total chapter count, so large books remain navigable across pages.
- Added chapter bookmarks and a sticky reader toolbar.


## 1.10.0
- Stage 2 Part 9: resumable full-book offline downloads.
- Added IndexedDB download jobs with per-book progress and resume after interruption.
- Added cancel/resume/delete controls and browser storage usage/quota display.
- Reader keeps cache-first chapter reading while full-book downloads run incrementally.
- Offline download state is isolated from the clean SQLite seed and does not add runtime files to Git.


## 1.8.0
- Stage 2 Part 8: large-catalog performance hardening.
- Chapter search now uses SQL COUNT/LIMIT/OFFSET instead of loading all matching rows into Node memory.
- Legacy chapter search indexes are normalized with Vietnamese diacritics removed during migration.
- Large imports are capped at 50,000 chapters per request to prevent accidental memory exhaustion.

## 1.7.0
- Stage 2 Part 7: Admin Studio import hardening.
- Added persistent import job records with validation/importing/completed/rejected/failed states and progress counts.
- Import job history can be queried by administrators.
- Batch import remains transactional: failed imports roll back without leaving partial stories.
- Chapter search index is populated consistently for seed, import and admin-created/edited chapters.
- SQLite schema now declares the chapter search key and import job table for clean installations.


## 1.6.7
- Stage 2 Part 6: large chapter catalog optimization.
- Chapter lists now load 100 items per page instead of downloading the entire story chapter index.
- Chapter search and pagination are handled by the API.
- Added an indexed normalized chapter search key with startup migration for existing SQLite databases.
- Reader navigation continues to fetch individual chapter content on demand.


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
