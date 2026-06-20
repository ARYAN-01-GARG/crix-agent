import { readTreeStructure } from "./files.js";

/**
 * Parses tree-structure.md into a map of { filePath → section content }.
 * Sections are delimited by `## <path>` headings.
 */
function parseTreeSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split("\n");
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = /^##\s+(.+)$/.exec(line);
    if (match) {
      if (currentKey !== null) sections.set(currentKey, currentLines.join("\n"));
      currentKey = match[1]?.trim() ?? null;
      currentLines = [line];
    } else if (currentKey !== null) {
      currentLines.push(line);
    }
  }
  if (currentKey !== null) sections.set(currentKey, currentLines.join("\n"));

  return sections;
}

/**
 * Extracts file paths mentioned in a natural-language task prompt.
 * Looks for paths containing `/` or ending in a known extension.
 */
function extractMentionedPaths(prompt: string): string[] {
  const pathPattern =
    /\b[\w./-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|c|cpp|md|json|yaml|yml|css|scss|html)\b/g;
  return [...new Set(prompt.match(pathPattern) ?? [])];
}

/**
 * Returns sections of tree-structure.md relevant to the given task prompt.
 * Falls back to returning the first `maxChars` of the full tree if no matches found.
 */
export function sliceTreeForTask(projectPath: string, taskPrompt: string, maxChars = 3000): string {
  const fullTree = readTreeStructure(projectPath);
  const sections = parseTreeSections(fullTree);

  if (sections.size === 0) return fullTree.slice(0, maxChars);

  const mentioned = extractMentionedPaths(taskPrompt);

  // Collect matching sections
  const matched: string[] = [];
  for (const [key, body] of sections) {
    const matches = mentioned.some((p) => key.includes(p) || p.includes(key));
    if (matches) matched.push(body);
  }

  // If nothing matched by explicit path, return top sections up to maxChars
  if (matched.length === 0) {
    let result = "";
    for (const body of sections.values()) {
      if (result.length + body.length > maxChars) break;
      result += `${body}\n`;
    }
    return result.trimEnd() || fullTree.slice(0, maxChars);
  }

  // Trim to maxChars
  let result = "";
  for (const section of matched) {
    if (result.length + section.length > maxChars) break;
    result += `${section}\n`;
  }
  return result.trimEnd();
}

/**
 * Returns sections matching any of the given file paths (used post-task to update only changed files).
 */
export function getTreeSectionsForFiles(
  projectPath: string,
  filePaths: string[]
): Map<string, string> {
  const fullTree = readTreeStructure(projectPath);
  const sections = parseTreeSections(fullTree);
  const result = new Map<string, string>();

  for (const [key, body] of sections) {
    if (filePaths.some((p) => key.includes(p) || p.includes(key))) {
      result.set(key, body);
    }
  }

  return result;
}

/**
 * Replaces or inserts sections in tree-structure.md for the given file paths.
 * Used by the indexer after re-parsing modified files.
 */
export function mergeSectionsIntoTree(
  projectPath: string,
  updatedSections: Map<string, string>
): string {
  const fullTree = readTreeStructure(projectPath);
  const sections = parseTreeSections(fullTree);

  for (const [key, body] of updatedSections) {
    sections.set(key, body);
  }

  const sorted = [...sections.entries()].sort(([a], [b]) => a.localeCompare(b));
  const header = fullTree.split("\n").slice(0, 3).join("\n");

  let result = `${header}\n\n`;
  for (const [, body] of sorted) {
    result += `${body}\n\n`;
  }

  return result;
}
