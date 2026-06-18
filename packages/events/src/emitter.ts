import type { CrixEvent, CrixEventHandler, CrixEventType } from "./types.js";

export interface IEventEmitter {
  emit<T extends CrixEventType>(event: CrixEvent<T>): void | Promise<void>;
  on<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void;
  off<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void;
  once<T extends CrixEventType>(type: T, handler: CrixEventHandler<T>): void;
}
