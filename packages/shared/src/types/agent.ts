export type AgentRole =
  | "backend"
  | "frontend"
  | "designer"
  | "tester"
  | "reviewer"
  | "devops";

export type TaskTier = "tiny" | "small" | "medium" | "large";

export type AgentMode = "plan" | "work" | "review";

export interface AgentTask {
  id: string;
  role: AgentRole;
  mode: AgentMode;
  tier: TaskTier;
  prompt: string;
  contextSlice: string;
  sessionId: string;
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
  summary: string;
  filesChanged: string[];
  error?: string;
  durationMs: number;
}
