# Kho Truyện Full

Kho Truyện Full is a Vietnamese story-reading web/API application.

## Current release
- Baseline: v1.6.6
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
v1.6.2 is the current Stage 2 account + search + discovery + resilient sync + reader optimization baseline.
