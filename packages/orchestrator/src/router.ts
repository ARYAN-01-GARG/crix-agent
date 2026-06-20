import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import type { AgentRole, CrixConfig } from "@crix/shared";
import { classifyHeuristic } from "./classifier.js";
import type { ClassificationResult } from "./classifier.js";

const RoutingSchema = z.object({
  roles: z.array(z.enum(["backend", "frontend", "designer", "tester", "reviewer", "devops"])),
  tier: z.enum(["tiny", "small", "medium", "large"]),
  reasoning: z.string().optional(),
});

const ROUTING_SYSTEM = `You are a task routing assistant for a coding agent system.
Given a user's task description, decide:
1. Which specialist agent(s) should handle it: backend, frontend, designer, tester, reviewer, devops
2. Task complexity tier: tiny (single file, trivial), small (1-3 files), medium (multi-file, one domain), large (cross-cutting)

Respond ONLY with valid JSON matching this schema (no markdown):
{ "roles": ["backend"], "tier": "small", "reasoning": "..." }`;

async function routeWithLLM(
  prompt: string,
  config: CrixConfig,
  contextHint: string
): Promise<ClassificationResult> {
  const anthropic = createAnthropic({ apiKey: config.apiKey });
  const model = anthropic(config.models.router);

  const userMsg = contextHint
    ? `Task: ${prompt}\n\nContext hint: ${contextHint}`
    : `Task: ${prompt}`;

  try {
    const { text } = await generateText({
      model,
      system: ROUTING_SYSTEM,
      prompt: userMsg,
      maxTokens: 256,
    });

    const cleaned = text.replace(/```(?:json)?|```/g, "").trim();
    const parsed = RoutingSchema.parse(JSON.parse(cleaned));

    return {
      tier: parsed.tier,
      roles: parsed.roles as AgentRole[],
      fromHeuristics: false,
    };
  } catch {
    // Fallback: treat as medium backend task
    return { tier: "medium", roles: ["backend"], fromHeuristics: false };
  }
}

/**
 * Classifies a task and returns which agents to use and at what tier.
 * Uses heuristics first (no LLM cost); falls back to Haiku for ambiguous prompts.
 */
export async function classifyTask(
  prompt: string,
  config: CrixConfig,
  contextHint = ""
): Promise<ClassificationResult> {
  const heuristic = classifyHeuristic(prompt);
  if (heuristic) return heuristic;
  return routeWithLLM(prompt, config, contextHint);
}

export type { ClassificationResult };
