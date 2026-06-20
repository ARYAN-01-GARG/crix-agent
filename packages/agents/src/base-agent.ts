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
        response: this.stripDoneBlock(text),
        summary: this.extractSummary(text),
        filesChanged,
        durationMs,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const _durationMs = Date.now() - start;

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

    // Static/cached sections first so Anthropic prompt caching applies
    if (task.contextSlice) {
      parts.push("\n\n# Project Context\n");
      parts.push(task.contextSlice);
    }

    parts.push(`
# Operating Mode
You are in **${task.mode}** mode.`);

    if (task.mode === "plan") {
      parts.push(
        " Do NOT write or modify any files. Only read, analyse, and propose changes in plain text."
      );
    } else if (task.mode === "review") {
      parts.push(
        " Do NOT write or modify any files. You may run shell commands to execute tests. Produce review feedback only."
      );
    } else {
      parts.push(" You have full read + write + shell access via your tools.");
    }

    parts.push(`

# Tool Workflow
Always follow this order:
1. **Read before writing** — use read_file or search_code to understand existing code before modifying it.
2. **Search before proposing** — use search_code to confirm a symbol exists before referencing it.
3. **Plan, then act** — if the task touches more than one file, briefly outline the changes you will make before calling any write tool.
4. **Write, then verify** — after writing, read the file back to confirm the change is correct.
5. **Summarise on completion** — your final response must follow the DONE FORMAT below.

If a tool call fails:
- Read the error message carefully.
- Do not retry the exact same call — adjust arguments or try an alternative tool.
- If you cannot recover, explain the blocker clearly in your final response.

# Git Discipline
Do NOT run git commit or git push unless the user's message explicitly asks you to commit or push.
Creating and modifying files is fine; committing is the user's decision.

# Done Format
End every response with this exact block (even for plan/review modes):

\`\`\`done
summary: <one or two sentences describing what was done or proposed>
files_changed: <comma-separated list of relative paths, or "none">
next_steps: <what the user should do next, or "none">
\`\`\``);

    return parts.join("");
  }

  protected buildUserPrompt(task: AgentTask): string {
    return task.prompt;
  }

  private extractSummary(text: string): string {
    const match = /```done\s+summary:\s*(.+?)(?:\n|```)/s.exec(text);
    return (match?.[1] ?? text).trim();
  }

  private stripDoneBlock(text: string): string {
    return text.replace(/```done[\s\S]*?```/g, "").trim();
  }

  private extractFilesChanged(
    toolCalls: Array<{ toolName: string; args: Record<string, unknown> }>
  ): string[] {
    const paths = new Set<string>();
    const writeTools = new Set(["write_file", "create_file", "delete_file"]);

    for (const call of toolCalls) {
      if (writeTools.has(call.toolName)) {
        const path = call.args.path ?? call.args.filePath;
        if (typeof path === "string") paths.add(path);
      }
    }

    return [...paths];
  }
}
