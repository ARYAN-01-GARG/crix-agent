import type Redis from "ioredis";
import type { IEventEmitter } from "./emitter.js";
import type { CrixEvent, CrixEventHandler, CrixEventType } from "./types.js";

export class RedisEventEmitter implements IEventEmitter {
  private readonly handlers = new Map<string, Set<CrixEventHandler<CrixEventType>>>();

  constructor(
    private readonly sessionId: string,
    private readonly pub: Redis,
    private readonly sub: Redis
  ) {
    sub.subscribe(`crix:session:${sessionId}`, (err) => {
      if (err) console.error("[RedisEventEmitter] subscribe error:", err);
    });

    sub.on("message", (_channel: string, raw: string) => {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const event = {
          ...parsed,
          timestamp: new Date(parsed.timestamp as string),
        } as CrixEvent;
        const handlers = this.handlers.get(event.type);
        if (handlers) {
          for (const handler of handlers) {
            void (handler as CrixEventHandler<typeof event.type>)(event);
          }
        }
      } catch {
        // malformed message — ignore
      }
    });
  }

  emit<T extends CrixEventType>(event: CrixEvent<T>): void {
    void this.pub.publish(`crix:session:${event.sessionId}`, JSON.stringify(event));
  }

  on<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)?.add(handler as CrixEventHandler<CrixEventType>);
  }

  off<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void {
    this.handlers.get(type)?.delete(handler as CrixEventHandler<CrixEventType>);
  }

  once<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void {
    const wrapper: CrixEventHandler<T> = (event) => {
      this.off(type, wrapper);
      return handler(event);
    };
    this.on(type, wrapper);
  }

  async close(): Promise<void> {
    await this.sub.unsubscribe(`crix:session:${this.sessionId}`);
  }
}
