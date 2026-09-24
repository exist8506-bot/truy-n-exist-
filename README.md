# Kho Truyện Full

### 1.14.0
- Reader 2.0 adds chapter seek and position-aware reading progress.

### 1.13.0
- Remote library pagination preserves search, category, status, and sort controls.

### 1.12.0
- Bookmark management adds filtering and one-tap removal.

### 1.11.0
- Chapter bookmarks are stored locally and synchronized with the signed-in account.
- Bookcase includes a dedicated bookmarked-chapter list.

Kho Truyện Full is a Vietnamese story-reading web/API application.

## Current release
- Baseline: v1.10.0
- 3 original demo stories / 26 chapters
- No stress-test stories or runtime SQLite database committed

## Run
Requires Node.js 22+.

```bash
cd server
node server.js
```

Open http://localhost:8787

## Repository policy
Runtime SQLite files, WAL/SHM files, uploads and secrets are excluded from Git.
The SQLite database is created from schema/seed data.

## Release
v1.10.0 adds resumable full-book offline downloads with IndexedDB job state, progress, cancel/resume, deletion and storage estimates.
