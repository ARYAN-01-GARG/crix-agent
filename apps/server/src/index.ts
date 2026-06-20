import { createRedisClient } from "@crix/cache";
import { createAgentWorker } from "@crix/queue";
import { createServer } from "./server.js";
import { processAgentJob } from "./processor.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const PORT = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  const redis = createRedisClient(REDIS_URL);
  await redis.connect();
  const worker = createAgentWorker(redis, processAgentJob);
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
  const server = await createServer(redis, REDIS_URL);
  await server.listen({ port: PORT, host: "0.0.0.0" });
  const shutdown = async (): Promise<void> => {
    await worker.close();
    await server.close();
    await redis.quit();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
