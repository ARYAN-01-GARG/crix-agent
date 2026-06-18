import type { IEventEmitter } from "./emitter.js";
import { LocalEventEmitter } from "./local-emitter.js";

export type EmitterMode = "local" | "redis";

/**
 * Returns the appropriate emitter for the current environment.
 * - "local"  → Node.js EventEmitter (default, no external deps)
 * - "redis"  → Redis Streams (Phase 5, server mode — not yet implemented)
 */
export const createEventEmitter = (mode: EmitterMode = "local"): IEventEmitter => {
  if (mode === "redis") {
    // TODO(phase-5): import and return RedisStreamEmitter
    throw new Error(
      'Redis Streams emitter is not yet implemented. Use mode "local" for now.'
    );
  }

  return new LocalEventEmitter();
};
