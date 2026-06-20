export interface AgentJobPayload {
  taskId: string;
  sessionId: string;
  projectPath: string;
  message: string;
  redisUrl: string;
  apiKey?: string;
  model?: string;
}

export interface AgentJobResult {
  success: boolean;
  response: string;
  summary: string;
  filesChanged: string[];
  durationMs: number;
  error?: string;
}
