import type { AgentMode } from "@crix/shared";
import type { IEventEmitter } from "@crix/events";

export class ModeStateMachine {
  private current: AgentMode;

  constructor(
    initial: AgentMode,
    private readonly emitter: IEventEmitter,
    private readonly sessionId: string
  ) {
    this.current = initial;
  }

  get(): AgentMode {
    return this.current;
  }

  set(next: AgentMode): void {
    if (next === this.current) return;

    const previous = this.current;
    this.current = next;

    void this.emitter.emit({
      type: "mode:changed",
      payload: { previous, current: next },
      sessionId: this.sessionId,
      timestamp: new Date(),
    });
  }

  /** Agents check this before performing any write operation. */
  canWrite(): boolean {
    return this.current === "work";
  }

  /** Agents check this before running shell commands. */
  canRunShell(): boolean {
    return this.current === "work";
  }

  /** In review mode agents may run tests but not modify source files. */
  canRunTests(): boolean {
    return this.current === "work" || this.current === "review";
  }
}
