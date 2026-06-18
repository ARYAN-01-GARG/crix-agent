import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { AgentResult, AgentRole, AgentTask, CrixConfig } from "@crix/shared";
import { AgentError, createLogger } from "@crix/shared";
import type { IEventEmitter } from "@crix/events";
import type { Harness } from "@crix/harness";

const logger = createLogger("agent");

export abstract class BaseAgent {
  abstract readonly role: AgentRole;
  abstract readonly systemPrompt: string;

  constructor(
    protected readonly config: CrixConfig,
    protected readonly harness: Harness,
    protected readonly emitter: IEventEmitter
  ) {}

  protected getModel(): LanguageModel {
    const modelId = this.config.models.worker;
    switch (this.config.provider) {
      case "openai": {
        const oai = createOpenAI({ apiKey: this.config.apiKey });
        return oai(modelId);
      }
      case "anthropic":
      default: {
        const anthropic = createAnthropic({ apiKey: this.config.apiKey });
        return anthropic(modelId);
      }
    }
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const start = Date.now();
    const log = logger.child(`${this.role}:${task.id}`);

    this.emitter.emit({
      type: "agent:start",
      payload: { taskId: task.id, role: this.role },
      sessionId: task.sessionId,
      timestamp: new Date(),
    });

    log.debug("agent starting");

    try {
      const aiTools = this.harness.getAiTools();

      const { text, toolCalls } = await generateText({
        model: this.getModel(),
        system: this.buildSystemPrompt(task),
        prompt: this.buildUserPrompt(task),
        tools: aiTools as Parameters<typeof generateText>[0]["tools"],
        maxSteps: 20,
      });

      const filesChanged = this.extractFilesChanged(toolCalls ?? []);
      const durationMs = Date.now() - start;

      this.emitter.emit({
        type: "agent:done",
        payload: { taskId: task.id, role: this.role, durationMs },
        sessionId: task.sessionId,
        timestamp: new Date(),
      });

      log.info("agent done", { durationMs, filesChanged: filesChanged.length });

      return {
        taskId: task.id,
        role: this.role,
        success: true,
        summary: text,
        filesChanged,
        durationMs,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - start;

      this.emitter.emit({
        type: "agent:error",
        payload: { taskId: task.id, role: this.role, error },
        sessionId: task.sessionId,
        timestamp: new Date(),
      });

      log.error("agent error", { error });

      throw new AgentError(this.role, error);
    }
  }

  protected buildSystemPrompt(task: AgentTask): string {
    const parts = [this.systemPrompt];

    if (task.contextSlice) {
      parts.push("\n\n# Project Context\n");
      parts.push(task.contextSlice);
    }

    parts.push(`\n\n# Mode\nYou are operating in ${task.mode} mode.`);

    if (task.mode === "plan") {
      parts.push("Do NOT write or modify any files. Only read and propose changes.");
    } else if (task.mode === "review") {
      parts.push("Do NOT write or modify any files. You may run tests. Provide review feedback only.");
    }

    return parts.join("");
  }

  protected buildUserPrompt(task: AgentTask): string {
    return task.prompt;
  }

  private extractFilesChanged(toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>): string[] {
    const paths = new Set<string>();
    const writeTools = new Set(["write_file", "create_file", "delete_file"]);

    for (const call of toolCalls) {
      if (writeTools.has(call.toolName)) {
        const path = call.args["path"] ?? call.args["filePath"];
        if (typeof path === "string") paths.add(path);
      }
    }

    return [...paths];
  }
}
