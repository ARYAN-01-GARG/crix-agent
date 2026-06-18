import { readFileSync } from "node:fs";
import fg from "fast-glob";
import { mergeSectionsIntoTree, writeTreeStructure } from "@crix/context";
import type { ContextLimits } from "@crix/shared";
import { parseFile } from "./parser.js";
import { summarizeBatch } from "./summarizer.js";
import { renderFileSection, renderFullTree } from "./renderers/markdown.js";

const SOURCE_GLOBS = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.js",
  "**/*.jsx",
  "**/*.py",
  "**/*.go",
];

const IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.crix/**",
  "**/coverage/**",
  "**/*.d.ts",
  "**/*.test.ts",
  "**/*.spec.ts",
  "**/*.test.js",
  "**/*.spec.js",
];

export interface IndexerOptions {
  projectPath: string;
  limits: ContextLimits;
  apiKey?: string;
  /** Max concurrent LLM summarization calls per batch. Default: 5. */
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Full project scan — parses every source file, summarizes with LLM (batched),
 * and writes a fresh tree-structure.md.
 */
export async function fullIndex(options: IndexerOptions): Promise<void> {
  const { projectPath, limits, apiKey, concurrency = 5, onProgress } = options;

  const files = await fg(SOURCE_GLOBS, {
    cwd: projectPath,
    ignore: IGNORE,
    absolute: true,
  });

  const total = files.length;
  let done = 0;

  // Parse all files (sync, CPU bound — keep in main thread for now)
  const parsed = files.map((fp) => parseFile(fp));

  // Prepare source snippets for the LLM (first 60 lines each)
  const inputs = parsed.map((p) => ({
    parsed: p,
    sourceSnippet: getSourceSnippet(p.filePath),
  }));

  // Summarize in batches
  const summaries = await summarizeBatch(inputs, apiKey, concurrency);

  const summaryMap = new Map(summaries.map((s) => [s.filePath, s]));

  const renderInputs = parsed
    .filter((p) => p.symbols.length > 0)
    .map((p) => {
      const summary = summaryMap.get(p.filePath) ?? { filePath: p.filePath, symbols: [] };
      // Make file paths relative
      const relativeParsed = { ...p, filePath: relative(projectPath, p.filePath) };
      const relativeSummary = { ...summary, filePath: relative(projectPath, summary.filePath) };
      return { parsed: relativeParsed, summary: relativeSummary };
    });

  done = total;
  onProgress?.(done, total);

  const content = renderFullTree(renderInputs, limits.treeStructure);
  writeTreeStructure(projectPath, content, limits);
}

/**
 * Incremental update — re-parses only the given files and updates their sections
 * in tree-structure.md without touching other sections.
 */
export async function incrementalIndex(
  filePaths: string[],
  options: IndexerOptions
): Promise<void> {
  const { projectPath, limits, apiKey, concurrency = 5 } = options;

  const parsed = filePaths.map((fp) => parseFile(fp));
  const inputs = parsed.map((p) => ({
    parsed: p,
    sourceSnippet: getSourceSnippet(p.filePath),
  }));

  const summaries = await summarizeBatch(inputs, apiKey, concurrency);
  const summaryMap = new Map(summaries.map((s) => [s.filePath, s]));

  const updatedSections = new Map<string, string>();

  for (const p of parsed) {
    const summary = summaryMap.get(p.filePath) ?? { filePath: p.filePath, symbols: [] };
    const relPath = relative(projectPath, p.filePath);
    const relativeParsed = { ...p, filePath: relPath };
    const relativeSummary = { ...summary, filePath: relPath };
    const section = renderFileSection(relativeParsed, relativeSummary);
    if (section) updatedSections.set(relPath, section);
  }

  const merged = mergeSectionsIntoTree(projectPath, updatedSections, limits);
  writeTreeStructure(projectPath, merged, limits);
}

function getSourceSnippet(filePath: string, lines = 60): string {
  try {
    return readFileSync(filePath, "utf8")
      .split("\n")
      .slice(0, lines)
      .join("\n");
  } catch {
    return "";
  }
}

function relative(base: string, full: string): string {
  return full.startsWith(base + "/") ? full.slice(base.length + 1) : full;
}
