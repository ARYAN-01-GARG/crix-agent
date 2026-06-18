import type { AgentRole } from "./agent.js";

export type LLMProvider = "anthropic" | "openai" | "google" | "ollama";

export interface ContextLimits {
  projectMd: number;
  treeStructure: number;
  contextMd: number;
  codePractices: number;
}

export interface HarnessPermission {
  tool: string;
  pattern: string;
  level: "allow" | "ask" | "deny";
}

export interface ModelConfig {
  router: string;
  worker: string;
}

export interface CrixConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  contextLimits: ContextLimits;
  agents: {
    enabled: AgentRole[];
  };
  harness: {
    permissions: HarnessPermission[];
  };
  models: ModelConfig;
}

export const DEFAULT_CONFIG: CrixConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  contextLimits: {
    projectMd: 2500,
    treeStructure: 8000,
    contextMd: 2500,
    codePractices: 2500,
  },
  agents: {
    enabled: ["backend", "frontend", "tester", "reviewer", "devops", "designer"],
  },
  harness: {
    permissions: [
      { tool: "run-shell", pattern: "rm -rf*", level: "deny" },
      { tool: "write-file", pattern: ".env*", level: "ask" },
    ],
  },
  models: {
    router: "claude-haiku-4-5",
    worker: "claude-sonnet-4-6",
  },
};
