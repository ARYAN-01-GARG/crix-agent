import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { HarnessPermissionError } from "@crix/shared";
import { resolveSafe } from "../safe-path.js";
import type { ToolContext, ToolDefinition, ToolResult } from "../types.js";

const parameters = z.object({
  path: z.string().describe("File path relative to project root"),
  content: z.string().describe("Full content to write to the file"),
});

const execute = async (
  args: z.infer<typeof parameters>,
  ctx: ToolContext
): Promise<ToolResult> => {
  if (!ctx.mode.canWrite()) {
    throw new HarnessPermissionError("write_file", `mode:${ctx.mode.get()}`);
  }

  const abs = resolveSafe(ctx.projectPath, args.path);
  mkdirSync(dirname(abs), { recursive: true });

  let previousLines = 0;
  try {
    previousLines = readFileSync(abs, "utf8").split("\n").length;
  } catch {
    // file does not exist yet — that's fine
  }

  writeFileSync(abs, args.content, "utf8");
  const newLines = args.content.split("\n").length;
  const delta = newLines - previousLines;
  const sign = delta >= 0 ? "+" : "";

  return {
    content: `Wrote ${args.path} (${newLines} lines, ${sign}${delta} from previous)`,
  };
};

export const writeFileTool: ToolDefinition<typeof parameters> = {
  name: "write_file",
  description: "Write or overwrite a file with the given content. Requires work mode.",
  parameters,
  execute,
};
