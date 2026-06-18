import { resolve } from "node:path";
import { HarnessPermissionError } from "@crix/shared";

const MAX_OUTPUT = 20_000;

/** Resolves a relative path within the project and rejects path traversal. */
export const resolveSafe = (projectPath: string, filePath: string): string => {
  const abs = resolve(projectPath, filePath);
  if (!abs.startsWith(resolve(projectPath))) {
    throw new HarnessPermissionError("path-traversal", filePath);
  }
  return abs;
};

/** Trims output to MAX_OUTPUT chars and flags truncation. */
export const trimOutput = (
  content: string,
  max = MAX_OUTPUT
): { content: string; truncated: boolean } => {
  if (content.length <= max) return { content, truncated: false };
  return {
    content: content.slice(0, max) + `\n\n... [output truncated at ${max} chars]`,
    truncated: true,
  };
};
