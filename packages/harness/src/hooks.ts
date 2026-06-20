import type { HookFn } from "./types.js";

export class HookRegistry {
  private pre = new Map<string, HookFn[]>();
  private post = new Map<string, HookFn[]>();

  addPre(tool: string, fn: HookFn): void {
    if (!this.pre.has(tool)) this.pre.set(tool, []);
    this.pre.get(tool)?.push(fn);
  }

  addPost(tool: string, fn: HookFn): void {
    if (!this.post.has(tool)) this.post.set(tool, []);
    this.post.get(tool)?.push(fn);
  }

  async runPre(tool: string, args: Record<string, unknown>): Promise<void> {
    const hooks = this.pre.get(tool) ?? [];
    for (const hook of hooks) await hook(tool, args);
  }

  async runPost(
    tool: string,
    args: Record<string, unknown>,
    result: { content: string; truncated?: boolean }
  ): Promise<void> {
    const hooks = this.post.get(tool) ?? [];
    for (const hook of hooks) await hook(tool, args, result);
  }
}
