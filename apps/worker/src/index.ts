import type { Job } from "bullmq";
import { createRedisClient } from "@crix/cache";
import { ModeStateMachine, SessionStore, getDbPath, loadConfig } from "@crix/core";
import { createEventEmitter } from "@crix/events";
import { Harness } from "@crix/harness";
import { Orchestrator } from "@crix/orchestrator";
import { createAgentWorker } from "@crix/queue";
import type { AgentJobPayload, AgentJobResult } from "@crix/queue";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

async function processJob(job: Job<AgentJobPayload, AgentJobResult>): Promise<AgentJobResult> {
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

async function main(): Promise<void> {
  const redis = createRedisClient(REDIS_URL);
  await redis.connect();

  const worker = createAgentWorker(redis, processJob);

  worker.on("completed", (job) => {
    console.log(`[worker] completed job ${job.id}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] failed job ${job?.id}:`, err);
  });

  console.log(`[worker] ready — redis: ${REDIS_URL}`);

  const shutdown = async (): Promise<void> => {
    await worker.close();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
