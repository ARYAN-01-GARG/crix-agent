/**
 * Rough token estimation: 1 token ≈ 4 chars for English/code.
 * Avoids pulling in a tokenizer dependency for Phase 1.
 * The indexer package (Phase 2) may use a proper tokenizer.
 */
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export interface ContextBudget {
  /** Maximum tokens allowed for the full context payload */
  totalTokens: number;
  /** Tokens reserved for system prompt + static cached layers */
  reservedForSystem: number;
  /** Tokens reserved for conversation history */
  reservedForHistory: number;
  /** Tokens reserved for the task prompt itself */
  reservedForTask: number;
}

export const DEFAULT_BUDGET: ContextBudget = {
  totalTokens: 160_000,   // Claude Sonnet context window
  reservedForSystem: 4_000,
  reservedForHistory: 20_000,
  reservedForTask: 2_000,
};

/**
 * Returns the number of tokens available for dynamic context files
 * (tree slice + context.md + project.md + code-practices.md).
 */
export function availableContextTokens(budget: ContextBudget): number {
  return (
    budget.totalTokens -
    budget.reservedForSystem -
    budget.reservedForHistory -
    budget.reservedForTask
  );
}

export interface ContextSlice {
  projectMd: string;
  codePractices: string;
  contextMd: string;
  treeSlice: string;
}

/**
 * Trims context slices to fit within the available token budget.
 * Priority order (highest to lowest): treeSlice > contextMd > projectMd > codePractices.
 * Each section gives up chars proportionally if over budget.
 */
export function trimToBudget(
  slice: ContextSlice,
  budget: ContextBudget = DEFAULT_BUDGET
): ContextSlice {
  const available = availableContextTokens(budget) * CHARS_PER_TOKEN;

  const total =
    slice.projectMd.length +
    slice.codePractices.length +
    slice.contextMd.length +
    slice.treeSlice.length;

  if (total <= available) return slice;

  // Proportional trim
  const ratio = available / total;
  return {
    treeSlice: slice.treeSlice.slice(0, Math.floor(slice.treeSlice.length * ratio * 1.3)),
    contextMd: slice.contextMd.slice(0, Math.floor(slice.contextMd.length * ratio)),
    projectMd: slice.projectMd.slice(0, Math.floor(slice.projectMd.length * ratio * 0.8)),
    codePractices: slice.codePractices.slice(0, Math.floor(slice.codePractices.length * ratio * 0.8)),
  };
}

/**
 * Assembles a context block string for injection into an LLM prompt.
 * Static/cached sections first (above the cache breakpoint), dynamic last.
 */
export function buildContextBlock(slice: ContextSlice): string {
  const parts: string[] = [];

  if (slice.projectMd.trim()) {
    parts.push(`<project>\n${slice.projectMd.trim()}\n</project>`);
  }
  if (slice.codePractices.trim()) {
    parts.push(`<code_practices>\n${slice.codePractices.trim()}\n</code_practices>`);
  }
  // Dynamic sections below the cache breakpoint
  if (slice.contextMd.trim()) {
    parts.push(`<working_context>\n${slice.contextMd.trim()}\n</working_context>`);
  }
  if (slice.treeSlice.trim()) {
    parts.push(`<tree_structure>\n${slice.treeSlice.trim()}\n</tree_structure>`);
  }

  return parts.join("\n\n");
}
