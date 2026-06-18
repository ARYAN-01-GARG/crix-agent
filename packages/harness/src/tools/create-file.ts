import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { CrixError, HarnessPermissionError } from "@crix/shared";
import { resolveSafe } from "../safe-path.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  path: z.string().describe("File path relative to project root"),
  content: z.string().default("").describe("Initial content (defaults to empty)"),
});

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  if (!ctx.mode.canWrite()) {
    throw new HarnessPermissionError("create_file", `mode:${ctx.mode.get()}`);
  }

  const abs = resolveSafe(ctx.projectPath, args.path);

  if (existsSync(abs)) {
    throw new CrixError(`File already exists: ${args.path}`, "FILE_EXISTS");
  }

  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, args.content, "utf8");
  const lines = args.content.split("\n").length;

  return { content: `Created ${args.path} (${lines} lines)` };
};

export const createFileTool: ToolDefinition<typeof parameters> = {
  name: "create_file",
  description: "Create a new file. Fails if the file already exists. Requires work mode.",
  parameters,
  execute,
};
