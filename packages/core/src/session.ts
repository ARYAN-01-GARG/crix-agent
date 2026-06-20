import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AgentMode, ContextFileHashes, Message, Session } from "@crix/shared";
import { SessionError, generateId, hashContent } from "@crix/shared";
import { SCHEMA_STATEMENTS } from "./schema.js";

interface SessionRow {
  id: string;
  project_path: string;
  mode: string;
  created_at: number;
  last_active_at: number;
  context_hashes: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: number;
}

const toSession = (row: SessionRow): Session => ({
  id: row.id,
  projectPath: row.project_path,
  mode: row.mode as AgentMode,
  createdAt: new Date(row.created_at),
  lastActiveAt: new Date(row.last_active_at),
  contextFileHashes: JSON.parse(row.context_hashes) as ContextFileHashes,
});

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  sessionId: row.session_id,
  role: row.role as Message["role"],
  content: row.content,
  createdAt: new Date(row.created_at),
});

export class SessionStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    for (const stmt of SCHEMA_STATEMENTS) {
      this.db.exec(stmt);
    }
  }

  create(projectPath: string, mode: AgentMode = "work"): Session {
    const id = generateId("sess");
    const now = Date.now();
    const emptyHashes: ContextFileHashes = {
      projectMd: null,
      treeStructure: null,
      contextMd: null,
      codePractices: null,
    };

    this.db
      .prepare(
        `INSERT INTO sessions (id, project_path, mode, created_at, last_active_at, context_hashes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, projectPath, mode, now, now, JSON.stringify(emptyHashes));

    return this.get(id) as Session;
  }

  get(id: string): Session | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
      | SessionRow
      | undefined;
    return row ? toSession(row) : null;
  }

  list(projectPath: string): Session[] {
    const rows = this.db
      .prepare("SELECT * FROM sessions WHERE project_path = ? ORDER BY last_active_at DESC")
      .all(projectPath) as unknown as SessionRow[];
    return rows.map(toSession);
  }

  touch(id: string): void {
    this.db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(Date.now(), id);
  }

  updateMode(id: string, mode: AgentMode): void {
    const result = this.db
      .prepare("UPDATE sessions SET mode = ?, last_active_at = ? WHERE id = ?")
      .run(mode, Date.now(), id) as { changes: number };
    if (result.changes === 0) throw new SessionError(`Session not found: ${id}`);
  }

  updateContextHashes(id: string, hashes: Partial<ContextFileHashes>): void {
    const session = this.get(id);
    if (!session) throw new SessionError(`Session not found: ${id}`);
    const merged = { ...session.contextFileHashes, ...hashes };
    this.db
      .prepare("UPDATE sessions SET context_hashes = ? WHERE id = ?")
      .run(JSON.stringify(merged), id);
  }

  delete(id: string): void {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  }

  addMessage(sessionId: string, role: Message["role"], content: string): Message {
    const id = generateId("msg");
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO messages (id, session_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, sessionId, role, content, now);
    this.touch(sessionId);
    return { id, sessionId, role, content, createdAt: new Date(now) };
  }

  getMessages(sessionId: string, limit = 100): Message[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM messages WHERE session_id = ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(sessionId, limit) as unknown as MessageRow[];
    return rows.reverse().map(toMessage);
  }

  /** Short hash of recent messages — used to detect session drift. */
  getMessagesHash(sessionId: string): string {
    const msgs = this.getMessages(sessionId, 20);
    return hashContent(msgs.map((m) => m.content).join(""));
  }

  close(): void {
    this.db.close();
  }
}
