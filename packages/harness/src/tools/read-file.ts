import { readFileSync } from "node:fs";
import { z } from "zod";
import { resolveSafe, trimOutput } from "../safe-path.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  path: z.string().describe("File path relative to project root"),
  startLine: z.number().int().min(1).optional().describe("First line to read (1-indexed)"),
  endLine: z.number().int().min(1).optional().describe("Last line to read (1-indexed, inclusive)"),
});

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  const abs = resolveSafe(ctx.projectPath, args.path);
  const raw = readFileSync(abs, "utf8");

  let content = raw;
  if (args.startLine !== undefined || args.endLine !== undefined) {
    const lines = raw.split("\n");
    const start = (args.startLine ?? 1) - 1;
    const end = args.endLine ?? lines.length;
    content = lines
      .slice(start, end)
      .map((line, i) => `${start + i + 1} | ${line}`)
      .join("\n");
  }

  return trimOutput(content);
};

export const readFileTool: ToolDefinition<typeof parameters> = {
  name: "read_file",
  description: "Read the contents of a file. Optionally specify a line range.",
  parameters,
  execute,
};
