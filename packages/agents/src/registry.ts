import type { AgentRole, CrixConfig } from "@crix/shared";
import type { IEventEmitter } from "@crix/events";
import type { Harness } from "@crix/harness";
import { BackendAgent } from "./backend.js";
import { DesignerAgent } from "./designer.js";
import { DevopsAgent } from "./devops.js";
import { FrontendAgent } from "./frontend.js";
import { ReviewerAgent } from "./reviewer.js";
import { TesterAgent } from "./tester.js";
import type { BaseAgent } from "./base-agent.js";

type AgentConstructor = new (config: CrixConfig, harness: Harness, emitter: IEventEmitter) => BaseAgent;

const AGENT_CTORS: Record<AgentRole, AgentConstructor> = {
  backend: BackendAgent,
  frontend: FrontendAgent,
  designer: DesignerAgent,
  tester: TesterAgent,
  reviewer: ReviewerAgent,
  devops: DevopsAgent,
};

export class AgentRegistry {
  private readonly cache = new Map<AgentRole, BaseAgent>();

  constructor(
    private readonly config: CrixConfig,
    private readonly harness: Harness,
    private readonly emitter: IEventEmitter
  ) {}

  get(role: AgentRole): BaseAgent {
    if (!this.cache.has(role)) {
      const Ctor = AGENT_CTORS[role];
      this.cache.set(role, new Ctor(this.config, this.harness, this.emitter));
    }
    return this.cache.get(role)!;
  }

  getAll(roles: AgentRole[]): BaseAgent[] {
    return roles.map((r) => this.get(r));
  }
}
