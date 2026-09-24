# Kho Truyện Full

### 1.17.0
- GitHub Pages can now connect to a deployed API using the 🌐 API button or `?api=` query parameter.
- API endpoint can be persisted locally in the browser without changing the source.

### 1.16.0
- Account 2.0 adds password change and invalidates other sessions after a successful change.
- Added a GitHub Pages static preview workflow.

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
- Current: v1.17.0
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


## Docker / Docker Compose (1.16.0)

Backend + frontend có thể chạy bằng Node 22 hoặc container. SQLite nằm trong thư mục `server/` để dữ liệu không bị trộn vào source.

```bash
docker compose up --build
```

Sau đó mở `http://localhost:8787`. API health: `/api/v1/health`.
