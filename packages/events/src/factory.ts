import { createRedisClient, createRedisSubscriber } from "@crix/cache";
import type { IEventEmitter } from "./emitter.js";
import { LocalEventEmitter } from "./local-emitter.js";
import { RedisEventEmitter } from "./redis-emitter.js";

export type EmitterMode = "local" | "redis";

export interface RedisEmitterOptions {
  redisUrl?: string;
  sessionId: string;
}

export function createEventEmitter(mode?: "local"): IEventEmitter;
export function createEventEmitter(mode: "redis", options: RedisEmitterOptions): IEventEmitter;
export function createEventEmitter(
  mode: EmitterMode = "local",
  options?: RedisEmitterOptions
): IEventEmitter {
  if (mode === "redis") {
    if (!options) throw new Error("redis mode requires options with sessionId");
    const url = options.redisUrl ?? "redis://localhost:6379";
    const pub = createRedisClient(url);
    const sub = createRedisSubscriber(url);
    return new RedisEventEmitter(options.sessionId, pub, sub);
  }
  return new LocalEventEmitter();
}
