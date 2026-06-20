import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import ignore from "ignore";
import { mergeSectionsIntoTree, writeTreeStructure } from "@crix/context";
import type { ContextLimits } from "@crix/shared";
import { parseFile } from "./parser.js";
import { summarizeBatch } from "./summarizer.js";
import { renderFileSection, renderFullTree } from "./renderers/markdown.js";

const SOURCE_GLOBS = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py", "**/*.go"];

// Hard-coded safety net — always excluded regardless of .gitignore
const ALWAYS_IGNORE = ["**/node_modules/**", "**/.git/**", "**/.crix/**", "**/*.d.ts"];

export interface IndexerOptions {
  projectPath: string;
  limits: ContextLimits;
  apiKey?: string;
  /** Max concurrent LLM summarization calls per batch. Default: 5. */
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Reads .gitignore (and .crixignore if present) from the project root and
 * returns a filter function that returns true for paths that should be skipped.
 */
function buildIgnoreFilter(projectPath: string): (relativePath: string) => boolean {
  const ig = ignore();

  for (const name of [".gitignore", ".crixignore"]) {
    const p = join(projectPath, name);
    if (existsSync(p)) {
      ig.add(readFileSync(p, "utf8"));
    }
  }

  return (relativePath: string) => ig.ignores(relativePath);
}

/**
 * Full project scan — parses every source file, summarizes with LLM (batched),
 * and writes a fresh tree-structure.md.
 */
export async function fullIndex(options: IndexerOptions): Promise<void> {
  const { projectPath, apiKey, concurrency = 5, onProgress } = options;

  const shouldIgnore = buildIgnoreFilter(projectPath);

  const allFiles = await fg(SOURCE_GLOBS, {
    cwd: projectPath,
    ignore: ALWAYS_IGNORE,
    absolute: true,
  });

  // Filter out anything .gitignore says to skip
  const files = allFiles.filter((abs) => {
    const rel = relative(projectPath, abs);
    return !shouldIgnore(rel);
  });

  const total = files.length;

  const parsed = files.map((fp) => parseFile(fp));

  const inputs = parsed.map((p) => ({
    parsed: p,
    sourceSnippet: getSourceSnippet(p.filePath),
  }));

  const summaries = await summarizeBatch(inputs, apiKey, concurrency);
  const summaryMap = new Map(summaries.map((s) => [s.filePath, s]));

  const renderInputs = parsed
    .filter((p) => p.symbols.length > 0)
    .map((p) => {
      const summary = summaryMap.get(p.filePath) ?? { filePath: p.filePath, symbols: [] };
      const relativeParsed = { ...p, filePath: relative(projectPath, p.filePath) };
      const relativeSummary = { ...summary, filePath: relative(projectPath, summary.filePath) };
      return { parsed: relativeParsed, summary: relativeSummary };
    });

  onProgress?.(total, total);

  const content = renderFullTree(renderInputs);
  writeTreeStructure(projectPath, content);
}

/**
 * Incremental update — re-parses only the given files and updates their sections
 * in tree-structure.md without touching other sections.
 */
export async function incrementalIndex(
  filePaths: string[],
  options: IndexerOptions
): Promise<void> {
  const { projectPath, apiKey, concurrency = 5 } = options;

  const shouldIgnore = buildIgnoreFilter(projectPath);

  const files = filePaths.filter((abs) => !shouldIgnore(relative(projectPath, abs)));

  const parsed = files.map((fp) => parseFile(fp));
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

  const merged = mergeSectionsIntoTree(projectPath, updatedSections);
  writeTreeStructure(projectPath, merged);
}

function getSourceSnippet(filePath: string, lines = 60): string {
  try {
    return readFileSync(filePath, "utf8").split("\n").slice(0, lines).join("\n");
  } catch {
    return "";
  }
}

function relative(base: string, full: string): string {
  return full.startsWith(`${base}/`) ? full.slice(base.length + 1) : full;
}
