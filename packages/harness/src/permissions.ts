import { HarnessPermissionError } from "@crix/shared";
import type { HarnessPermission } from "@crix/shared";

const matchesPattern = (value: string, pattern: string): boolean => {
  // Convert glob-style pattern (only * wildcard) to a regex
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
};

export type PermissionLevel = "allow" | "ask" | "deny";

export interface PermissionCheckResult {
  level: PermissionLevel;
  rule?: HarnessPermission;
}

export const checkPermission = (
  tool: string,
  args: Record<string, unknown>,
  permissions: HarnessPermission[]
): PermissionCheckResult => {
  const argString = JSON.stringify(args);

  for (const rule of permissions) {
    const toolMatches = matchesPattern(tool, rule.tool);
    const patternMatches = !rule.pattern || matchesPattern(argString, rule.pattern);

    if (toolMatches && patternMatches) {
      return { level: rule.level, rule };
    }
  }

  return { level: "allow" };
};

export const enforcePermission = (
  tool: string,
  args: Record<string, unknown>,
  permissions: HarnessPermission[]
): void => {
  const { level, rule } = checkPermission(tool, args, permissions);

  if (level === "deny") {
    throw new HarnessPermissionError(tool, rule?.pattern ?? "*");
  }
  // "ask" is handled by the CLI layer — harness treats it as allow at the execution level
};
