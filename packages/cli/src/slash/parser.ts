export interface ParsedSlash {
  command: string;
  args: string;
}

/**
 * Detects if an input string is a slash command.
 * Returns null for regular messages.
 */
export function parseSlash(input: string): ParsedSlash | null {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith("/")) return null;

  // Must be "/word" not "/ " or "//"
  const match = /^\/(\w+)(?:\s+(.*))?$/.exec(trimmed.trimEnd());
  if (!match) return null;

  return {
    command: (match[1] ?? "").toLowerCase(),
    args: (match[2] ?? "").trim(),
  };
}
