import { resolve } from "node:path";
import { SessionStore, getDbPath } from "@crix/core";
import { start } from "../index.js";

export interface SessionListOptions {
  projectPath: string;
}

export interface SessionResumeOptions {
  sessionId: string;
  projectPath: string;
}

export async function cmdSessionList({ projectPath }: SessionListOptions): Promise<void> {
  const store = new SessionStore(getDbPath(projectPath));
  const sessions = store.list(projectPath);
  store.close();

  if (sessions.length === 0) {
    process.stdout.write(`No sessions found for ${projectPath}\n`);
    return;
  }

  process.stdout.write(`Sessions for ${projectPath}:\n\n`);
  for (const s of sessions) {
    const age = formatAge(s.lastActiveAt);
    process.stdout.write(`  ${s.id}  [${s.mode}]  last active ${age}\n`);
  }
  process.stdout.write("\n");
}

export async function cmdSessionResume({
  sessionId,
  projectPath,
}: SessionResumeOptions): Promise<void> {
  const store = new SessionStore(getDbPath(projectPath));
  const session = store.get(sessionId);
  store.close();

  if (!session) {
    process.stderr.write(`Session not found: ${sessionId}\n`);
    process.exit(1);
  }

  // Resolve project path from the stored session if no override given
  const resolvedPath = resolve(projectPath || session.projectPath);

  await start({ projectPath: resolvedPath, resumeSessionId: sessionId });
}

function formatAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
