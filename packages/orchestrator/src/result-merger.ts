import type { AgentResult } from "@crix/shared";

export interface MergedResult {
  summary: string;
  filesChanged: string[];
  allSucceeded: boolean;
  errors: Array<{ role: string; error: string }>;
  durationMs: number;
}

/**
 * Merges results from one or more specialist agents into a single response.
 * For a single agent, returns its summary directly.
 * For multiple agents, builds a structured multi-section summary.
 */
export function mergeResults(results: AgentResult[]): MergedResult {
  const allSucceeded = results.every((r) => r.success);
  const filesChanged = [...new Set(results.flatMap((r) => r.filesChanged))];
  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => ({ role: r.role, error: r.error ?? "unknown error" }));
  const durationMs = Math.max(...results.map((r) => r.durationMs));

  let summary: string;

  if (results.length === 1) {
    summary = results[0]?.summary ?? "";
  } else {
    const sections = results
      .filter((r) => r.success && r.summary)
      .map((r) => `**${r.role}**: ${r.summary.trim()}`);

    if (errors.length > 0) {
      sections.push(`**Errors**: ${errors.map((e) => `${e.role}: ${e.error}`).join("; ")}`);
    }

    summary = sections.join("\n\n");
  }

  return { summary, filesChanged, allSucceeded, errors, durationMs };
}
