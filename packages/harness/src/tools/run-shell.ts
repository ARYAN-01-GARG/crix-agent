import { z } from "zod";
import { execa } from "execa";
import { HarnessPermissionError } from "@crix/shared";
import { trimOutput } from "../safe-path.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

// Commands that are unconditionally denied regardless of permission rules
const BLOCKED_PATTERNS = [/rm\s+-rf?\s+\//, /:\s*\(\)\s*\{.*\}\s*;/, /mkfs/, /dd\s+if=/];

const parameters = z.object({
  command: z.string().describe("Shell command to execute"),
  cwd: z
    .string()
    .optional()
    .describe("Working directory relative to project root (defaults to project root)"),
  timeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(120_000)
    .default(30_000)
    .describe("Timeout in milliseconds (max 120s)"),
});

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  if (!ctx.mode.canRunShell()) {
    throw new HarnessPermissionError("run_shell", `mode:${ctx.mode.get()}`);
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(args.command)) {
      throw new HarnessPermissionError("run_shell", args.command);
    }
  }

  const cwd = args.cwd ? `${ctx.projectPath}/${args.cwd}` : ctx.projectPath;

  try {
    const result = await execa(args.command, {
      shell: true,
      cwd,
      timeout: args.timeoutMs,
      all: true,
    });

    const raw = result.all ?? result.stdout;
    return trimOutput(`$ ${args.command}\n\n${raw}`);
  } catch (err: unknown) {
    const execErr = err as { all?: string; stdout?: string; stderr?: string; message?: string };
    const output = execErr.all ?? execErr.stderr ?? execErr.message ?? String(err);
    return trimOutput(`$ ${args.command}\n\nExit non-zero:\n${output}`);
  }
};

export const runShellTool: ToolDefinition<typeof parameters> = {
  name: "run_shell",
  description:
    "Execute a shell command in the project directory. Requires work mode. Timeout max 120s.",
  parameters,
  execute,
};
