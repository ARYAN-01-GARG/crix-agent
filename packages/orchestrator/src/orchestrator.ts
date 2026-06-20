import { AgentRegistry } from "@crix/agents";
import { ContextManager } from "@crix/context";
import { DEFAULT_BUDGET } from "@crix/context";
import type { SessionStore } from "@crix/core";
import type { IEventEmitter } from "@crix/events";
import type { Harness } from "@crix/harness";
import type { AgentResult, AgentTask, CrixConfig, HistoryMessage } from "@crix/shared";
import { createLogger, generateId } from "@crix/shared";
import { mergeResults } from "./result-merger.js";
import type { MergedResult } from "./result-merger.js";
import { classifyTask } from "./router.js";

const logger = createLogger("orchestrator");

export interface OrchestratorOptions {
  config: CrixConfig;
  harness: Harness;
  emitter: IEventEmitter;
  sessionStore: SessionStore;
  projectPath: string;
}

export class Orchestrator {
  private readonly registry: AgentRegistry;
  private readonly context: ContextManager;

  constructor(private readonly opts: OrchestratorOptions) {
    this.registry = new AgentRegistry(opts.config, opts.harness, opts.emitter);
    this.context = new ContextManager(opts.projectPath, opts.config.contextLimits);
  }

  /**
   * Processes a user message end-to-end:
   * 1. Classify task tier and target roles
   * 2. Build a scoped context slice
   * 3. Dispatch to specialist agent(s)
   * 4. Merge results
   * 5. Append task summary to context.md
   */
  async process(
    userMessage: string,
    sessionId: string,
    mode: import("@crix/core").ModeStateMachine
  ): Promise<MergedResult> {
    const taskId = generateId("task");
    const log = logger.child(taskId);

    log.info("classifying task");

    const { tier, roles } = await classifyTask(
      userMessage,
      this.opts.config,
      this.context.readAll().projectMd
    );

    log.info("task classified", { tier, roles: roles.join(",") });

    // Load conversation history for context
    const rawMessages = this.opts.sessionStore.getMessages(sessionId, 40);
    const history: HistoryMessage[] = rawMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Persist the incoming user message before dispatching
    this.opts.sessionStore.addMessage(sessionId, "user", userMessage);

    const contextSlice = this.context.buildSlice(userMessage, DEFAULT_BUDGET);

    const tasks: AgentTask[] = roles.map((role) => ({
      id: generateId("subtask"),
      role,
      mode: mode.get() as "plan" | "work" | "review",
      tier,
      prompt: userMessage,
      contextSlice,
      sessionId,
      history,
      createdAt: new Date(),
    }));

    this.opts.emitter.emit({
      type: "task:start",
      payload: { taskId, tier, prompt: userMessage },
      sessionId,
      timestamp: new Date(),
    });

    const agents = roles.map((role) => this.registry.get(role));
    const resultPromises = agents.map((agent, i) => agent.run(tasks[i] as AgentTask));

    // Run sequentially for "tiny" tasks to avoid unnecessary concurrency overhead
    // Run in parallel for all other tiers
    const results =
      tier === "tiny"
        ? [(await resultPromises[0]) as AgentResult]
        : await Promise.all(resultPromises);

    const merged = mergeResults(results);

    this.opts.emitter.emit({
      type: "task:done",
      payload: {
        taskId,
        durationMs: merged.durationMs,
        filesChanged: merged.filesChanged,
        summary: merged.summary,
      },
      sessionId,
      timestamp: new Date(),
    });

    // Persist assistant response into session history
    this.opts.sessionStore.addMessage(sessionId, "assistant", merged.response);

    // Persist summary into context.md
    if (merged.allSucceeded && merged.summary) {
      this.context.appendTaskSummary(merged.summary);
    }

    log.info("task complete", { durationMs: merged.durationMs, files: merged.filesChanged.length });

    return merged;
  }
}
