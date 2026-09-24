PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,display_name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'user',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY,avatar TEXT DEFAULT '',updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stories(id TEXT PRIMARY KEY,title TEXT NOT NULL,author TEXT NOT NULL,category TEXT NOT NULL,description TEXT DEFAULT '',search_key TEXT DEFAULT '',tone TEXT DEFAULT '',status TEXT NOT NULL,cover_path TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chapters(id TEXT PRIMARY KEY,story_id TEXT NOT NULL,chapter_index INTEGER NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,search_key TEXT DEFAULT '',UNIQUE(story_id,chapter_index));
CREATE TABLE IF NOT EXISTS reading_progress(user_id TEXT NOT NULL,story_id TEXT NOT NULL,chapter_index INTEGER NOT NULL,position REAL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,story_id));
CREATE TABLE IF NOT EXISTS reading_history(user_id TEXT NOT NULL,story_id TEXT NOT NULL,chapter_index INTEGER NOT NULL,position REAL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,story_id));
CREATE TABLE IF NOT EXISTS favorites(user_id TEXT NOT NULL,story_id TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,story_id));
CREATE TABLE IF NOT EXISTS bookmarks(user_id TEXT NOT NULL,story_id TEXT NOT NULL,chapter_index INTEGER NOT NULL,title TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,story_id,chapter_index));
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_updated ON bookmarks(user_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_chapters_story ON chapters(story_id,chapter_index);
CREATE INDEX IF NOT EXISTS idx_stories_updated ON stories(updated_at);
CREATE INDEX IF NOT EXISTS idx_stories_search ON stories(search_key);

CREATE TABLE IF NOT EXISTS import_jobs(id TEXT PRIMARY KEY,story_id TEXT DEFAULT '',filename TEXT NOT NULL,status TEXT NOT NULL,processed INTEGER NOT NULL DEFAULT 0,total INTEGER NOT NULL DEFAULT 0,batch_size INTEGER NOT NULL DEFAULT 100,error TEXT DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_import_jobs_updated ON import_jobs(updated_at);
