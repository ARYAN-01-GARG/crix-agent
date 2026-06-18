import type { AgentMode } from "./agent.js";

export interface Session {
  id: string;
  projectPath: string;
  mode: AgentMode;
  createdAt: Date;
  lastActiveAt: Date;
  contextFileHashes: ContextFileHashes;
}

export interface ContextFileHashes {
  projectMd: string | null;
  treeStructure: string | null;
  contextMd: string | null;
  codePractices: string | null;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}
