import { generateId } from "@crix/shared";
import { enforcePermission } from "./permissions.js";
import { HookRegistry } from "./hooks.js";
import {
  createFileTool,
  deleteFileTool,
  gitOpsTool,
  listFilesTool,
  readFileTool,
  runShellTool,
  searchCodeTool,
  writeFileTool,
} from "./tools/index.js";
import type { HarnessContext, ToolDefinition, ToolResult } from "./types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ALL_TOOLS: ToolDefinition<any>[] = [
  readFileTool,
  writeFileTool,
  createFileTool,
  deleteFileTool,
  listFilesTool,
  runShellTool,
  gitOpsTool,
  searchCodeTool,
];

export class Harness {
  private readonly toolMap: Map<string, ToolDefinition>;
  readonly hooks = new HookRegistry();

  constructor(private readonly ctx: HarnessContext) {
    this.toolMap = new Map(ALL_TOOLS.map((t) => [t.name, t]));
  }

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    taskId?: string
  ): Promise<ToolResult> {
    const tool = this.toolMap.get(toolName);
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);

    const resolvedTaskId = taskId ?? generateId("task");

    enforcePermission(toolName, args, this.ctx.permissions);

    const start = Date.now();

    this.ctx.emitter.emit({
      type: "tool:call",
      payload: { taskId: resolvedTaskId, tool: toolName, args },
      sessionId: this.ctx.sessionId,
      timestamp: new Date(),
    });

    await this.hooks.runPre(toolName, args);

    const toolCtx = {
      projectPath: this.ctx.projectPath,
      sessionId: this.ctx.sessionId,
      taskId: resolvedTaskId,
      mode: this.ctx.mode,
      emitter: this.ctx.emitter,
    };

    const result = await tool.execute(args, toolCtx);

    await this.hooks.runPost(toolName, args, result);

    this.ctx.emitter.emit({
      type: "tool:result",
      payload: {
        taskId: resolvedTaskId,
        tool: toolName,
        durationMs: Date.now() - start,
        truncated: result.truncated ?? false,
      },
      sessionId: this.ctx.sessionId,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Returns tool definitions in the shape Vercel AI SDK expects.
   * Each entry is { description, parameters (zod schema), execute }.
   */
  getAiTools(): Record<string, { description: string; parameters: unknown; execute: (args: Record<string, unknown>) => Promise<{ content: string }> }> {
    const result: Record<string, { description: string; parameters: unknown; execute: (args: Record<string, unknown>) => Promise<{ content: string }> }> = {};

    for (const tool of ALL_TOOLS) {
      result[tool.name] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: (args) => this.execute(tool.name, args),
      };
    }

    return result;
  }

  getToolNames(): string[] {
    return [...this.toolMap.keys()];
  }
}
