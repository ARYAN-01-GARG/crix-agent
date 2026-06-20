import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Redis } from "ioredis";
import { healthRoutes } from "./routes/health.js";
import { taskRoutes } from "./routes/tasks.js";

export async function createServer(redis: Redis, redisUrl: string) {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await app.register(healthRoutes);
  await app.register(taskRoutes, { redis, redisUrl });
  return app;
}
