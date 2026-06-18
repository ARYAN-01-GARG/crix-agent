import { EventEmitter } from "node:events";
import type { IEventEmitter } from "./emitter.js";
import type { CrixEvent, CrixEventHandler, CrixEventType } from "./types.js";

export class LocalEventEmitter implements IEventEmitter {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Raise the default limit — crix can have many concurrent listeners
    this.emitter.setMaxListeners(50);
  }

  emit<T extends CrixEventType>(event: CrixEvent<T>): void {
    this.emitter.emit(event.type, event);
  }

  on<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void {
    this.emitter.on(type, handler as (...args: unknown[]) => void);
  }

  off<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void {
    this.emitter.off(type, handler as (...args: unknown[]) => void);
  }

  once<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void {
    this.emitter.once(type, handler as (...args: unknown[]) => void);
  }
}
