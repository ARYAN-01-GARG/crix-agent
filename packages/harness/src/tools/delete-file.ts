import { rmSync } from "node:fs";
import { z } from "zod";
import { HarnessPermissionError } from "@crix/shared";
import { resolveSafe } from "../safe-path.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  path: z.string().describe("File path relative to project root"),
  confirm: z
    .literal(true)
    .describe("Must be true — explicit confirmation required to delete a file"),
});

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  if (!ctx.mode.canWrite()) {
    throw new HarnessPermissionError("delete_file", `mode:${ctx.mode.get()}`);
  }

  const abs = resolveSafe(ctx.projectPath, args.path);
  rmSync(abs, { force: false });

  return { content: `Deleted ${args.path}` };
};

export const deleteFileTool: ToolDefinition<typeof parameters> = {
  name: "delete_file",
  description:
    "Delete a file. Requires confirm: true and work mode. Use with care — this is irreversible.",
  parameters,
  execute,
};
