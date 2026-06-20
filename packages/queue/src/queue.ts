import { Queue, Worker } from "bullmq";
import type Redis from "ioredis";
import { QUEUE_NAMES } from "./names.js";
import type { AgentJobPayload, AgentJobResult } from "./jobs.js";
import type { Job } from "bullmq";

export function createAgentQueue(connection: Redis): Queue<AgentJobPayload, AgentJobResult> {
  return new Queue(QUEUE_NAMES.AGENT, { connection });
}

export function createAgentWorker(
  connection: Redis,
  processor: (job: Job<AgentJobPayload, AgentJobResult>) => Promise<AgentJobResult>
): Worker<AgentJobPayload, AgentJobResult> {
  return new Worker(QUEUE_NAMES.AGENT, processor, {
    connection,
    concurrency: 5,
  });
}
