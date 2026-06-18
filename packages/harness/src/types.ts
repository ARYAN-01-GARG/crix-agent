import type { z } from "zod";
import type { ModeStateMachine } from "@crix/core";
import type { IEventEmitter } from "@crix/events";
import type { HarnessPermission } from "@crix/shared";

export interface ToolContext {
  projectPath: string;
  sessionId: string;
  taskId: string;
  mode: ModeStateMachine;
  emitter: IEventEmitter;
}

export interface ToolResult {
  content: string;
  truncated?: boolean;
}

export interface ToolDefinition<TParams extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: TParams;
  execute: (args: z.infer<TParams>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface HarnessContext {
  projectPath: string;
  sessionId: string;
  mode: ModeStateMachine;
  emitter: IEventEmitter;
  permissions: HarnessPermission[];
}

export type HookFn = (
  tool: string,
  args: Record<string, unknown>,
  result?: ToolResult
) => void | Promise<void>;
