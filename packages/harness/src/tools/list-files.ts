import { z } from "zod";
import fg from "fast-glob";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  pattern: z
    .string()
    .default("**/*")
    .describe("Glob pattern relative to project root (e.g. 'src/**/*.ts')"),
  ignore: z
    .array(z.string())
    .default(["**/node_modules/**", "**/dist/**", "**/.git/**"])
    .describe("Patterns to exclude"),
});

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  const files = await fg(args.pattern, {
    cwd: ctx.projectPath,
    ignore: args.ignore,
    onlyFiles: true,
    dot: false,
  });

  files.sort();

  if (files.length === 0) {
    return { content: `No files matched pattern: ${args.pattern}` };
  }

  return { content: files.join("\n") };
};

export const listFilesTool: ToolDefinition<typeof parameters> = {
  name: "list_files",
  description: "List files matching a glob pattern relative to the project root.",
  parameters,
  execute,
};
