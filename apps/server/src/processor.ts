import type { Job } from "bullmq";
import { loadConfig } from "@crix/core";
import { ModeStateMachine, SessionStore, getDbPath } from "@crix/core";
import { createEventEmitter } from "@crix/events";
import { Harness } from "@crix/harness";
import { Orchestrator } from "@crix/orchestrator";
import type { AgentJobPayload, AgentJobResult } from "@crix/queue";

export async function processAgentJob(
  job: Job<AgentJobPayload, AgentJobResult>
): Promise<AgentJobResult> {
  const { projectPath, message, sessionId, apiKey, model, redisUrl } = job.data;

  const baseConfig = await loadConfig(projectPath);
  const config = {
    ...baseConfig,
    ...(apiKey ? { apiKey } : {}),
    ...(model ? { model } : {}),
  };

  const emitter = createEventEmitter("redis", { redisUrl, sessionId });
  const mode = new ModeStateMachine("work", emitter, sessionId);
  const harness = new Harness({
    projectPath,
    sessionId,
    mode,
    emitter,
    permissions: config.harness.permissions,
  });
  const sessionStore = new SessionStore(getDbPath(projectPath));
  const orchestrator = new Orchestrator({ config, harness, emitter, sessionStore, projectPath });

  try {
    const result = await orchestrator.process(message, sessionId, mode);
    return {
      success: true,
      response: result.response,
      summary: result.summary,
      filesChanged: result.filesChanged,
      durationMs: result.durationMs,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, response: "", summary: "", filesChanged: [], durationMs: 0, error };
  } finally {
    sessionStore.close();
    const maybeCloseable = emitter as unknown as { close?: () => Promise<void> };
    await maybeCloseable.close?.();
  }
}
