export const CREATE_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS sessions (
    id               TEXT PRIMARY KEY,
    project_path     TEXT NOT NULL,
    mode             TEXT NOT NULL DEFAULT 'work',
    created_at       INTEGER NOT NULL,
    last_active_at   INTEGER NOT NULL,
    context_hashes   TEXT NOT NULL DEFAULT '{}'
  )
`;

export const CREATE_MESSAGES_TABLE = `
  CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  )
`;

export const CREATE_MESSAGES_IDX = `
  CREATE INDEX IF NOT EXISTS idx_messages_session
  ON messages(session_id, created_at)
`;

export const SCHEMA_STATEMENTS = [
  "PRAGMA journal_mode=WAL",
  "PRAGMA foreign_keys=ON",
  CREATE_SESSIONS_TABLE,
  CREATE_MESSAGES_TABLE,
  CREATE_MESSAGES_IDX,
];
