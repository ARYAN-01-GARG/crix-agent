export type AgentRole = "backend" | "frontend" | "designer" | "tester" | "reviewer" | "devops";

export type TaskTier = "tiny" | "small" | "medium" | "large";

export type AgentMode = "plan" | "work" | "review";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentTask {
  id: string;
  role: AgentRole;
  mode: AgentMode;
  tier: TaskTier;
  prompt: string;
  contextSlice: string;
  sessionId: string;
  history: HistoryMessage[];
  createdAt: Date;
}

export interface AgentEvent {
  type: "text" | "tool_call" | "tool_result" | "error" | "done";
  taskId: string;
  payload: unknown;
  timestamp: Date;
}

export interface AgentResult {
  taskId: string;
  role: AgentRole;
  success: boolean;
  /** Full LLM response text (done block stripped) — shown to user in TUI */
  response: string;
  /** One-line summary extracted from done block — used for context.md */
  summary: string;
  /** next_steps field from done block — shown as input placeholder */
  nextSteps: string;
  filesChanged: string[];
  error?: string;
  durationMs: number;
}
