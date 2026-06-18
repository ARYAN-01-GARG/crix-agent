import type { AgentMode, AgentRole, TaskTier } from "@crix/shared";

// ── Event type literals ──────────────────────────────────────────────────────

export type CrixEventType =
  | "task:start"
  | "task:done"
  | "task:error"
  | "agent:start"
  | "agent:done"
  | "agent:error"
  | "agent:text"
  | "tool:call"
  | "tool:result"
  | "tool:error"
  | "session:created"
  | "session:resumed"
  | "mode:changed"
  | "theme:changed"
  | "index:start"
  | "index:done"
  | "index:error";

// ── Per-event payload shapes ─────────────────────────────────────────────────

export interface TaskStartPayload {
  taskId: string;
  tier: TaskTier;
  prompt: string;
}

export interface TaskDonePayload {
  taskId: string;
  durationMs: number;
  filesChanged: string[];
  summary: string;
}

export interface TaskErrorPayload {
  taskId: string;
  error: string;
}

export interface AgentStartPayload {
  taskId: string;
  role: AgentRole;
}

export interface AgentDonePayload {
  taskId: string;
  role: AgentRole;
  durationMs: number;
}

export interface AgentErrorPayload {
  taskId: string;
  role: AgentRole;
  error: string;
}

export interface AgentTextPayload {
  taskId: string;
  role: AgentRole;
  chunk: string;
}

export interface ToolCallPayload {
  taskId: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResultPayload {
  taskId: string;
  tool: string;
  durationMs: number;
  truncated: boolean;
}

export interface ToolErrorPayload {
  taskId: string;
  tool: string;
  error: string;
}

export interface SessionCreatedPayload {
  sessionId: string;
  projectPath: string;
}

export interface SessionResumedPayload {
  sessionId: string;
  projectPath: string;
}

export interface ModeChangedPayload {
  previous: AgentMode;
  current: AgentMode;
}

export interface ThemeChangedPayload {
  previous: string;
  current: string;
}

export interface IndexStartPayload {
  projectPath: string;
  fileCount: number;
}

export interface IndexDonePayload {
  projectPath: string;
  fileCount: number;
  durationMs: number;
}

export interface IndexErrorPayload {
  projectPath: string;
  error: string;
}

// ── Event payload map (type → payload) ──────────────────────────────────────

export interface CrixEventPayloadMap {
  "task:start": TaskStartPayload;
  "task:done": TaskDonePayload;
  "task:error": TaskErrorPayload;
  "agent:start": AgentStartPayload;
  "agent:done": AgentDonePayload;
  "agent:error": AgentErrorPayload;
  "agent:text": AgentTextPayload;
  "tool:call": ToolCallPayload;
  "tool:result": ToolResultPayload;
  "tool:error": ToolErrorPayload;
  "session:created": SessionCreatedPayload;
  "session:resumed": SessionResumedPayload;
  "mode:changed": ModeChangedPayload;
  "theme:changed": ThemeChangedPayload;
  "index:start": IndexStartPayload;
  "index:done": IndexDonePayload;
  "index:error": IndexErrorPayload;
}

// ── Envelope ─────────────────────────────────────────────────────────────────

export interface CrixEvent<T extends CrixEventType = CrixEventType> {
  type: T;
  payload: CrixEventPayloadMap[T];
  sessionId: string;
  timestamp: Date;
}

// ── Handler type ─────────────────────────────────────────────────────────────

export type CrixEventHandler<T extends CrixEventType> = (
  event: CrixEvent<T>
) => void | Promise<void>;
