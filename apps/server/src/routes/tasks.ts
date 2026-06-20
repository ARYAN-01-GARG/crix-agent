import type { FastifyInstance } from "fastify";
import Redis from "ioredis";
import { generateId } from "@crix/shared";
import { createAgentQueue } from "@crix/queue";
import type { AgentJobPayload } from "@crix/queue";

interface TaskBody {
  projectPath: string;
  message: string;
  sessionId?: string;
  apiKey?: string;
  model?: string;
}

export async function taskRoutes(
  app: FastifyInstance,
  opts: { redis: Redis; redisUrl: string }
): Promise<void> {
  const queue = createAgentQueue(opts.redis);

  app.post<{ Body: TaskBody }>("/api/tasks", async (request, reply) => {
    const { projectPath, message, sessionId, apiKey, model } = request.body;

    if (!projectPath || !message) {
      return reply.status(400).send({ error: "projectPath and message are required" });
    }

    const taskId = generateId("task");
    const resolvedSessionId = sessionId ?? generateId("session");

    const payload: AgentJobPayload = {
      taskId,
      sessionId: resolvedSessionId,
      projectPath,
      message,
      redisUrl: opts.redisUrl,
      ...(apiKey ? { apiKey } : {}),
      ...(model ? { model } : {}),
    };

    await queue.add(taskId, payload, {
      jobId: taskId,
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return reply.status(202).send({ taskId, sessionId: resolvedSessionId });
  });

  app.get<{ Params: { sessionId: string } }>(
    "/api/tasks/:sessionId/stream",
    async (request, reply) => {
      const { sessionId } = request.params;
      const channel = `crix:session:${sessionId}`;

      const sub = new Redis(opts.redisUrl, { lazyConnect: true });
      await sub.connect();

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      const send = (data: unknown): void => {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      await sub.subscribe(channel);

      sub.on("message", (_ch: string, raw: string) => {
        try {
          const event = JSON.parse(raw) as Record<string, unknown>;
          send(event);
          const type = event.type;
          if (type === "task:done" || type === "task:error") {
            void sub.unsubscribe(channel).then(() => sub.quit());
            reply.raw.end();
          }
        } catch {
          // ignore malformed messages
        }
      });

      request.raw.on("close", () => {
        void sub.unsubscribe(channel).then(() => sub.quit());
      });
    }
  );
}
