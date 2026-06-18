import type { AgentRole, TaskTier } from "@crix/shared";

export interface ClassificationResult {
  tier: TaskTier;
  roles: AgentRole[];
  /** true if heuristics resolved it (no LLM call needed) */
  fromHeuristics: boolean;
}

// Keywords that strongly signal a specific role
const ROLE_SIGNALS: Array<{ patterns: RegExp[]; role: AgentRole }> = [
  {
    patterns: [/\btest(s|ing)?\b/i, /\bspec\b/i, /\bvitest\b/i, /\bjest\b/i, /\bunit test\b/i, /\bintegration test\b/i],
    role: "tester",
  },
  {
    patterns: [/\breview\b/i, /\baudIt\b/i, /\bcheck (the )?(code|changes|pr|pull request)\b/i],
    role: "reviewer",
  },
  {
    patterns: [/\bci\b/i, /\bcd\b/i, /\bdocker\b/i, /\bkubernetes\b/i, /\bk8s\b/i, /\bterraform\b/i, /\bpipeline\b/i, /\bworkflow\b/i, /\bdeploy(ment)?\b/i],
    role: "devops",
  },
  {
    patterns: [/\bui\b/i, /\bcomponent\b/i, /\bfrontend\b/i, /\bfront-end\b/i, /\breact\b/i, /\bvue\b/i, /\bsvelte\b/i, /\bpage\b/i, /\bform\b/i, /\bmodal\b/i],
    role: "frontend",
  },
  {
    patterns: [/\bdesign(er)?\b/i, /\btheme\b/i, /\bcolor\b/i, /\btoken\b/i, /\btypo(graphy)?\b/i, /\bui\/ux\b/i, /\blayout\b/i, /\bspacing\b/i],
    role: "designer",
  },
  {
    patterns: [/\bapi\b/i, /\bendpoint\b/i, /\bbackend\b/i, /\bback-end\b/i, /\bdatabase\b/i, /\bsql\b/i, /\bmigration\b/i, /\bschema\b/i, /\bserver\b/i, /\bservice\b/i],
    role: "backend",
  },
];

// File extension → likely role
const EXT_ROLE: Record<string, AgentRole> = {
  ".tsx": "frontend",
  ".jsx": "frontend",
  ".css": "frontend",
  ".scss": "frontend",
  ".vue": "frontend",
  ".svelte": "frontend",
  ".test.ts": "tester",
  ".spec.ts": "tester",
  ".test.js": "tester",
  ".spec.js": "tester",
  ".dockerfile": "devops",
  "docker-compose": "devops",
  ".yml": "devops",
  ".yaml": "devops",
  ".tf": "devops",
};

function detectRolesByKeyword(prompt: string): AgentRole[] {
  const matched = new Set<AgentRole>();
  for (const { patterns, role } of ROLE_SIGNALS) {
    if (patterns.some((p) => p.test(prompt))) matched.add(role);
  }
  return [...matched];
}

function detectRolesByFilePath(prompt: string): AgentRole[] {
  const matched = new Set<AgentRole>();
  // Extract path-like tokens
  const tokens = prompt.match(/[\w./\\-]+\.\w+/g) ?? [];
  for (const token of tokens) {
    for (const [ext, role] of Object.entries(EXT_ROLE)) {
      if (token.includes(ext)) matched.add(role);
    }
  }
  return [...matched];
}

function classifyTier(roles: AgentRole[], prompt: string): TaskTier {
  const wordCount = prompt.split(/\s+/).length;
  const hasFilePath = /[\w./\\-]+\.\w+/.test(prompt);

  if (roles.length === 1 && wordCount < 20 && hasFilePath) return "tiny";
  if (roles.length === 1 && wordCount < 50) return "small";
  if (roles.length <= 2) return "medium";
  return "large";
}

/**
 * Classifies a task using heuristics alone (no LLM call).
 * Returns null if classification is too ambiguous to resolve without LLM help.
 */
export function classifyHeuristic(prompt: string): ClassificationResult | null {
  const keywordRoles = detectRolesByKeyword(prompt);
  const pathRoles = detectRolesByFilePath(prompt);

  const merged = [...new Set([...keywordRoles, ...pathRoles])];

  if (merged.length === 0) return null;

  // If only file path roles matched and no keyword roles, trust it
  const roles = merged.length > 0 ? merged : ["backend" as AgentRole];
  const tier = classifyTier(roles, prompt);

  return { tier, roles, fromHeuristics: true };
}
